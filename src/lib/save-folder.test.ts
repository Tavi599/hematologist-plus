import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeFolder } from '../test/folder-handle'
import { courseFileTarget } from './course-file-name'
import { saveFile } from './save-file'
import { allowFolder, folderSupported, folderWritable, saveCourseFile } from './save-folder'

vi.mock('./save-file', () => ({ saveFile: vi.fn() }))

const day = new Date(2026, 9, 17)
const named = courseFileTarget('Іваненко Іван Іванович', day, (date) => `Курс ${date}`)
const unnamed = courseFileTarget('', day, (date) => `Курс ${date}`)
const bytes = new Uint8Array([1, 2, 3])

beforeEach(() => vi.mocked(saveFile).mockClear())

describe('saveCourseFile', () => {
  it("writes into the patient's subfolder, creating it", async () => {
    const root = fakeFolder('Схеми')
    const outcome = await saveCourseFile(root, named, 'xlsx', bytes, 'x')
    expect(outcome).toEqual({
      kind: 'folder',
      path: ['Схеми', 'Іваненко Іван Іванович', 'Іваненко Іван Іванович 17.10.2026.xlsx'],
    })
    const sub = root.folders.get('Іваненко Іван Іванович')
    expect(sub?.files.get('Іваненко Іван Іванович 17.10.2026.xlsx')).toEqual(bytes)
    expect(saveFile).not.toHaveBeenCalled()
  })

  it('writes into the folder itself when the patient is not named', async () => {
    const root = fakeFolder('Схеми')
    const outcome = await saveCourseFile(root, unnamed, 'json', bytes, 'x')
    expect(outcome).toEqual({ kind: 'folder', path: ['Схеми', 'Курс 17.10.2026.json'] })
    expect(root.files.has('Курс 17.10.2026.json')).toBe(true)
    expect(root.folders.size).toBe(0)
  })

  it('never overwrites a file saved earlier the same day', async () => {
    const root = fakeFolder('Схеми')
    await saveCourseFile(root, named, 'xlsx', bytes, 'x')
    const second = await saveCourseFile(root, named, 'xlsx', new Uint8Array([9]), 'x')
    expect(second.kind === 'folder' && second.path.at(-1)).toBe(
      'Іваненко Іван Іванович 17.10.2026 (2).xlsx',
    )
    const sub = root.folders.get('Іваненко Іван Іванович')
    expect(sub?.files.get('Іваненко Іван Іванович 17.10.2026.xlsx')).toEqual(bytes)
  })

  it('asks for the permission again and writes once it is given', async () => {
    const root = fakeFolder('Схеми')
    root.permission = 'prompt'
    const outcome = await saveCourseFile(root, unnamed, 'xlsx', bytes, 'x')
    expect(outcome.kind).toBe('folder')
  })

  it('downloads under the same name when there is no folder', async () => {
    const outcome = await saveCourseFile(null, named, 'xlsx', bytes, 'media')
    expect(outcome).toEqual({
      kind: 'download',
      name: 'Іваненко Іван Іванович 17.10.2026.xlsx',
      reason: 'no-folder',
    })
    expect(saveFile).toHaveBeenCalledWith('Іваненко Іван Іванович 17.10.2026.xlsx', bytes, 'media')
  })

  it('downloads when writing is refused', async () => {
    const root = fakeFolder('Схеми')
    root.permission = 'prompt'
    root.grantOnRequest = false
    const outcome = await saveCourseFile(root, named, 'xlsx', bytes, 'x')
    expect(outcome).toMatchObject({ kind: 'download', reason: 'denied' })
    expect(saveFile).toHaveBeenCalledOnce()
  })

  it('downloads when the folder cannot be written', async () => {
    const root = fakeFolder('Схеми')
    root.broken = true
    const outcome = await saveCourseFile(root, named, 'xlsx', bytes, 'x')
    expect(outcome).toMatchObject({ kind: 'download', reason: 'failed' })
    expect(saveFile).toHaveBeenCalledOnce()
  })
})

describe('permissions', () => {
  it('reads a broken permission query as not writable', async () => {
    const root = fakeFolder('Схеми')
    root.queryPermission = () => Promise.reject(new Error('gone'))
    expect(await folderWritable(root)).toBe(false)
    expect(await allowFolder(root)).toBe(false)
  })
})

describe('folderSupported', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('needs both the folder picker and IndexedDB', () => {
    expect(folderSupported()).toBe(false)
    vi.stubGlobal('showDirectoryPicker', () => Promise.reject(new Error('no')))
    expect(folderSupported()).toBe(false)
    vi.stubGlobal('indexedDB', {})
    expect(folderSupported()).toBe(true)
  })
})
