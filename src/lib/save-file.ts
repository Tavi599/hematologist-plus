/**
 * Hands a file the browser built straight to the download. Nothing is uploaded: the bytes are
 * made in the tab and stay there, which is what keeps patient data out of the network.
 */
export function saveFile(name: string, data: Uint8Array, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mediaType }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
