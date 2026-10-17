import { fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { courseFileTarget } from '../../lib/course-file-name'
import { saveFile } from '../../lib/save-file'
import type { SaveOutcome } from '../../lib/save-folder'
import { resetSaveFolderState, useSaveFolder } from '../../lib/use-save-folder'
import { fakeFolder, type FakeFolder } from '../../test/folder-handle'
import { renderWithProviders } from '../../test/render'

import { SaveFolderCard, SaveOutcomeNote } from './SaveFolder'

// The device's IndexedDB, in memory: the handle is kept as it is, as the browser keeps it.
const stored = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  createStore: () => 'store',
  get: (key: string) => Promise.resolve(stored.get(key)),
  set: (key: string, value: unknown) => Promise.resolve(void stored.set(key, value)),
  del: (key: string) => Promise.resolve(void stored.delete(key)),
}))
vi.mock('../../lib/save-file', () => ({ saveFile: vi.fn() }))

let picked: FakeFolder

beforeEach(() => {
  stored.clear()
  resetSaveFolderState()
  vi.mocked(saveFile).mockClear()
  picked = fakeFolder('Схеми')
  vi.stubGlobal('indexedDB', {})
  vi.stubGlobal(
    'showDirectoryPicker',
    vi.fn(() => Promise.resolve(picked)),
  )
})

afterEach(() => vi.unstubAllGlobals())

/** A save button as the export and the course card have it. */
function SaveHarness({ fullName }: { fullName: string }) {
  const { save } = useSaveFolder()
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null)
  const target = courseFileTarget(fullName, new Date(2026, 9, 17), (date) => `Курс ${date}`)
  return (
    <>
      <button
        type="button"
        onClick={() => void save(target, 'xlsx', new Uint8Array([1]), 'x').then(setOutcome)}
      >
        save
      </button>
      <SaveOutcomeNote outcome={outcome} />
    </>
  )
}

describe('SaveFolderCard', () => {
  it('says the folder cannot be chosen where the browser has no folder access', async () => {
    vi.stubGlobal('showDirectoryPicker', undefined)
    renderWithProviders(<SaveFolderCard />)
    expect(await screen.findByText(/У цьому браузері обрати папку не можна/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Обрати папку' })).not.toBeInTheDocument()
  })

  it('chooses a folder, remembers it on the device and forgets it', async () => {
    renderWithProviders(<SaveFolderCard />)
    expect(await screen.findByText(/Папку не обрано/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Обрати папку' }))
    expect(await screen.findByText('Папка: Схеми')).toBeInTheDocument()
    expect(stored.get('saveFolder')).toBe(picked)
    expect(screen.getByRole('button', { name: 'Змінити папку' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Забути папку' }))
    expect(await screen.findByText(/Папку не обрано/)).toBeInTheDocument()
    expect(stored.has('saveFolder')).toBe(false)
  })

  it('keeps the folder when the dialog is closed without a choice', async () => {
    vi.stubGlobal(
      'showDirectoryPicker',
      vi.fn(() => Promise.reject(new DOMException('closed', 'AbortError'))),
    )
    renderWithProviders(<SaveFolderCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'Обрати папку' }))
    expect(await screen.findByText(/Папку не обрано/)).toBeInTheDocument()
  })

  it('asks to allow writing again after a browser restart', async () => {
    picked.permission = 'prompt'
    stored.set('saveFolder', picked)
    renderWithProviders(<SaveFolderCard />)
    expect(await screen.findByText(/запис треба дозволити знову/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Дозволити запис' }))
    expect(await screen.findByText('Папка: Схеми')).toBeInTheDocument()
  })
})

describe('saving a course', () => {
  it("writes into the patient's subfolder of the chosen folder", async () => {
    stored.set('saveFolder', picked)
    renderWithProviders(
      <>
        <SaveFolderCard />
        <SaveHarness fullName="Іваненко Іван Іванович" />
      </>,
    )
    await screen.findByText('Папка: Схеми')
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    expect(
      await screen.findByText(
        'Збережено: Схеми / Іваненко Іван Іванович / Іваненко Іван Іванович 17.10.2026.xlsx',
      ),
    ).toBeInTheDocument()
    expect(saveFile).not.toHaveBeenCalled()
  })

  it('writes on the same click that allows it, after a restart', async () => {
    picked.permission = 'prompt'
    stored.set('saveFolder', picked)
    renderWithProviders(<SaveHarness fullName="" />)
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(await screen.findByText('Збережено: Схеми / Курс 17.10.2026.xlsx')).toBeInTheDocument()
  })

  it('downloads under the same name when no folder is chosen', async () => {
    renderWithProviders(<SaveHarness fullName="Іваненко Іван Іванович" />)
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(
      await screen.findByText('Файл «Іваненко Іван Іванович 17.10.2026.xlsx» завантажено.'),
    ).toBeInTheDocument()
    expect(saveFile).toHaveBeenCalledOnce()
  })

  it('says why it downloaded when writing was refused', async () => {
    picked.permission = 'prompt'
    picked.grantOnRequest = false
    stored.set('saveFolder', picked)
    renderWithProviders(<SaveHarness fullName="" />)
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(await screen.findByText(/Запис у папку не дозволено/)).toBeInTheDocument()
  })

  it('says why it downloaded when the folder could not be written', async () => {
    picked.broken = true
    stored.set('saveFolder', picked)
    renderWithProviders(<SaveHarness fullName="" />)
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(await screen.findByText(/Не вдалося записати в папку/)).toBeInTheDocument()
  })
})
