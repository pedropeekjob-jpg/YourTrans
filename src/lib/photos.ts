// Reduz a fotografia e remove metadados (EXIF, localização) ao redesenhar em canvas.
export async function compressImage(file: File, max = 1280, quality = 0.82): Promise<Uint8Array<ArrayBuffer>> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('imagem'))), 'image/jpeg', quality))
  return new Uint8Array(await blob.arrayBuffer())
}
