import type { FolderHandle } from '../lib/save-folder'

/**
 * An in-memory folder standing in for the File System Access API, which jsdom does not have.
 * Files hold what was written; subfolders are folders of the same kind.
 */
export interface FakeFolder extends FolderHandle {
  files: Map<string, Uint8Array>
  folders: Map<string, FakeFolder>
  permission: 'granted' | 'denied' | 'prompt'
  /** What `requestPermission` answers. */
  grantOnRequest: boolean
  /** Makes every write fail, as a folder moved away would. */
  broken: boolean
}

export function fakeFolder(name: string): FakeFolder {
  const folder: FakeFolder = {
    kind: 'directory',
    name,
    files: new Map(),
    folders: new Map(),
    permission: 'granted',
    grantOnRequest: true,
    broken: false,
    queryPermission: () => Promise.resolve(folder.permission),
    requestPermission: () => {
      folder.permission = folder.grantOnRequest ? 'granted' : 'denied'
      return Promise.resolve(folder.permission)
    },
    getDirectoryHandle: (child, { create }) => {
      let sub = folder.folders.get(child)
      if (sub === undefined) {
        if (!create || folder.broken) return Promise.reject(new Error('NotFoundError'))
        sub = fakeFolder(child)
        folder.folders.set(child, sub)
      }
      return Promise.resolve(sub)
    },
    getFileHandle: (file, { create }) => {
      if (folder.broken || (!create && !folder.files.has(file))) {
        return Promise.reject(new Error('NotFoundError'))
      }
      return Promise.resolve({
        createWritable: () => {
          const chunks: Uint8Array[] = []
          return Promise.resolve({
            write: (data: BlobPart) => {
              chunks.push(data as Uint8Array)
              return Promise.resolve()
            },
            close: () => {
              folder.files.set(file, chunks[0] ?? new Uint8Array())
              return Promise.resolve()
            },
          })
        },
      })
    },
    keys: async function* () {
      yield* folder.files.keys()
      yield* folder.folders.keys()
    },
  }
  return folder
}
