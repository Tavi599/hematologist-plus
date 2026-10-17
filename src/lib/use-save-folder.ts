import { useCallback, useEffect, useSyncExternalStore } from 'react'

import type { CourseFileTarget } from './course-file-name'
import {
  allowFolder,
  folderSupported,
  folderWritable,
  forgetFolder,
  loadFolder,
  pickFolder,
  saveCourseFile,
  type FolderHandle,
  type SaveOutcome,
} from './save-folder'

/**
 * The device's save folder as the calculator sees it. One copy for the whole page: the folder
 * card, the .xlsx export and the course card all read and change the same folder.
 */
export type SaveFolderStatus =
  /** This browser cannot write into a folder: files are downloaded. */
  | 'unsupported'
  | 'loading'
  /** No folder chosen on this device yet. */
  | 'none'
  /** A folder is chosen, but writing has to be allowed again (a new browser session). */
  | 'prompt'
  | 'granted'

interface FolderState {
  status: SaveFolderStatus
  handle: FolderHandle | null
}

let state: FolderState = { status: 'loading', handle: null }
/** The read of the device's folder; a save waits for it rather than downloading past it. */
let loaded: Promise<void> | null = null
const listeners = new Set<() => void>()

function update(next: FolderState): void {
  state = next
  for (const listener of listeners) listener()
}

async function statusOf(handle: FolderHandle | null): Promise<FolderState> {
  if (handle === null) return { status: 'none', handle }
  return { status: (await folderWritable(handle)) ? 'granted' : 'prompt', handle }
}

function ensureLoaded(): Promise<void> {
  loaded ??= folderSupported()
    ? loadFolder()
        .then(statusOf)
        .then(update, () => update({ status: 'none', handle: null }))
    : Promise.resolve(update({ status: 'unsupported', handle: null }))
  return loaded
}

/** Forgets what was read; the next hook to mount reads the device again. For tests. */
export function resetSaveFolderState(): void {
  state = { status: 'loading', handle: null }
  loaded = null
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSaveFolder() {
  useEffect(() => void ensureLoaded(), [])
  const current = useSyncExternalStore(subscribe, () => state)

  const choose = useCallback(async () => {
    const handle = await pickFolder()
    // Closing the dialog keeps whatever folder there was.
    if (handle !== null) update(await statusOf(handle))
  }, [])

  const allow = useCallback(async () => {
    if (state.handle === null) return
    const handle = state.handle
    update({ status: (await allowFolder(handle)) ? 'granted' : 'prompt', handle })
  }, [])

  const forget = useCallback(async () => {
    await forgetFolder()
    update({ status: 'none', handle: null })
  }, [])

  /** Saves a course file into the folder, or downloads it; says which. */
  const save = useCallback(
    async (
      target: CourseFileTarget,
      extension: string,
      data: Uint8Array,
      mediaType: string,
    ): Promise<SaveOutcome> => {
      await ensureLoaded()
      const handle = state.handle
      const outcome = await saveCourseFile(handle, target, extension, data, mediaType)
      if (handle !== null) update(await statusOf(handle))
      return outcome
    },
    [],
  )

  return {
    status: current.status,
    folderName: current.handle?.name ?? null,
    choose,
    allow,
    forget,
    save,
  }
}
