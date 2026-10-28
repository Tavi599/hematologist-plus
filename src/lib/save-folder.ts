import { createStore, del, get, set } from 'idb-keyval'

import { uniqueFileName, type CourseFileTarget } from './course-file-name'
import { saveFile } from './save-file'
import { isIndexedDbAvailable, withStorageTimeout } from './query-persistence'

/**
 * The folder this device saves courses into («Схеми»): a setting of the device, not of the app.
 * The browser hands it over as a directory handle, which only IndexedDB can keep — it is not
 * text, so localStorage cannot hold it, and it means nothing on another device, so it never
 * goes near Supabase. Only Chrome and Edge on a computer can write into a folder (the File System
 * Access API); everywhere else a course is downloaded as before, under the same name.
 *
 * The browser keeps the permission to write for the visit only: after a restart the handle is
 * still here, but writing has to be allowed again by a click.
 */

/** The parts of the File System Access API used here; TypeScript's DOM types lack most of them. */
type Permission = 'granted' | 'denied' | 'prompt'

interface PermissionOptions {
  mode: 'readwrite'
}

export interface WritableFile {
  write(data: BlobPart): Promise<void>
  close(): Promise<void>
}

export interface FolderFileHandle {
  createWritable(): Promise<WritableFile>
}

export interface FolderHandle {
  readonly kind: 'directory'
  readonly name: string
  queryPermission(options: PermissionOptions): Promise<Permission>
  requestPermission(options: PermissionOptions): Promise<Permission>
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<FolderHandle>
  getFileHandle(name: string, options: { create: boolean }): Promise<FolderFileHandle>
  keys(): AsyncIterable<string>
}

type FilePicker = (options: { startIn?: FolderHandle; id?: string }) => Promise<unknown>

type DirectoryPicker = (options: { id?: string; mode: 'readwrite' }) => Promise<FolderHandle>

function picker(): DirectoryPicker | null {
  const candidate = (window as unknown as { showDirectoryPicker?: DirectoryPicker })
    .showDirectoryPicker
  return typeof candidate === 'function' ? candidate.bind(window) : null
}

/**
 * Shows a folder to the physician. A web page cannot launch the system's file manager, so this
 * opens the browser's own file dialog inside the folder — the files are listed there, and the
 * dialog's address bar names the path. Closing the dialog changes nothing.
 */
export async function showFolder(folder: FolderHandle): Promise<void> {
  const open = (window as unknown as { showOpenFilePicker?: FilePicker }).showOpenFilePicker
  if (typeof open !== 'function') return
  try {
    await open.call(window, { startIn: folder, id: 'hplus-save-folder' })
  } catch {
    // Closing the dialog is an AbortError; nothing to report either way.
  }
}

/** Whether this browser can write into a folder at all. */
export function folderSupported(): boolean {
  return picker() !== null && isIndexedDbAvailable()
}

const DB_NAME = 'hematologist-plus-device'
const STORE_NAME = 'settings'
const FOLDER_KEY = 'saveFolder'

const store = () => createStore(DB_NAME, STORE_NAME)

/** The folder chosen on this device, or null when none was (or the browser cannot keep one). */
export async function loadFolder(): Promise<FolderHandle | null> {
  if (!folderSupported()) return null
  const handle = await withStorageTimeout(get<FolderHandle>(FOLDER_KEY, store()), undefined)
  return handle ?? null
}

/**
 * Asks the physician for the folder. Null when they close the dialog. A handle the browser gives
 * back from the dialog can already write; it is kept for the next visit.
 */
export async function pickFolder(): Promise<FolderHandle | null> {
  const choose = picker()
  if (choose === null) return null
  let handle: FolderHandle
  try {
    handle = await choose({ id: 'hematologist-plus-courses', mode: 'readwrite' })
  } catch {
    // Closed without choosing (AbortError), or the browser refused a system folder.
    return null
  }
  await withStorageTimeout(set(FOLDER_KEY, handle, store()), undefined)
  return handle
}

/** Forgets the folder on this device; the folder and the files in it stay on the disk. */
export async function forgetFolder(): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await withStorageTimeout(del(FOLDER_KEY, store()), undefined)
}

const READ_WRITE: PermissionOptions = { mode: 'readwrite' }

/** Whether the folder can be written to now, without asking. */
export async function folderWritable(handle: FolderHandle): Promise<boolean> {
  try {
    return (await handle.queryPermission(READ_WRITE)) === 'granted'
  } catch {
    return false
  }
}

/** Asks for the permission to write; must run from a click. */
export async function allowFolder(handle: FolderHandle): Promise<boolean> {
  try {
    if ((await handle.queryPermission(READ_WRITE)) === 'granted') return true
    return (await handle.requestPermission(READ_WRITE)) === 'granted'
  } catch {
    return false
  }
}

async function namesIn(folder: FolderHandle): Promise<string[]> {
  const names: string[] = []
  for await (const name of folder.keys()) names.push(name)
  return names
}

/**
 * Writes the file into the folder — into the patient's subfolder, created if needed — under a
 * name no file there has yet. Returns the folder written into and the path written, relative to
 * the chosen folder's parent.
 */
export async function writeIntoFolder(
  root: FolderHandle,
  target: CourseFileTarget,
  extension: string,
  data: Uint8Array,
): Promise<{ directory: FolderHandle; path: string[] }> {
  const folder =
    target.folder === null ? root : await root.getDirectoryHandle(target.folder, { create: true })
  const name = uniqueFileName(target.base, extension, await namesIn(folder))
  const writable = await (await folder.getFileHandle(name, { create: true })).createWritable()
  try {
    await writable.write(data as BlobPart)
  } finally {
    await writable.close()
  }
  return {
    directory: folder,
    path: target.folder === null ? [root.name, name] : [root.name, target.folder, name],
  }
}

export type SaveOutcome =
  /** Written into the chosen folder; the path from the folder's own name down to the file. */
  | { kind: 'folder'; path: string[]; directory: FolderHandle }
  /** Handed to the browser's download, under this name. */
  | { kind: 'download'; name: string; reason: 'no-folder' | 'denied' | 'failed' }

/**
 * Saves a course file: into the chosen folder if there is one and the browser lets it write
 * (asking, if it has to, on the same click), otherwise as a plain download under the same name.
 * A file is never lost to a folder that refused it.
 */
export async function saveCourseFile(
  folder: FolderHandle | null,
  target: CourseFileTarget,
  extension: string,
  data: Uint8Array,
  mediaType: string,
): Promise<SaveOutcome> {
  const download = (reason: 'no-folder' | 'denied' | 'failed'): SaveOutcome => {
    const name = `${target.base}.${extension}`
    saveFile(name, data, mediaType)
    return { kind: 'download', name, reason }
  }
  if (folder === null) return download('no-folder')
  if (!(await allowFolder(folder))) return download('denied')
  try {
    return { kind: 'folder', ...(await writeIntoFolder(folder, target, extension, data)) }
  } catch {
    // The folder was moved or deleted, the disk is full: the course still reaches the physician.
    return download('failed')
  }
}
