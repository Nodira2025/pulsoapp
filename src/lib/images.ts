export function fitImage(width: number, height: number, limit: number) {
  if (width <= 0 || height <= 0 || limit <= 0)
    throw new Error('La imagen no tiene dimensiones válidas.')
  const scale = Math.min(1, limit / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Resize without cropping; WebP keeps transparent company logos transparent. */
export async function compressImage(file: File, limit = 768): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Elegí una imagen JPG, PNG o WebP.')
  if (file.size > 20 * 1024 * 1024) throw new Error('La imagen supera los 20 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => {
      throw new Error('No pudimos leer esta imagen. Probá con otra foto.')
    })
    const size = fitImage(image.naturalWidth, image.naturalHeight, limit)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No pudimos preparar la imagen en este dispositivo.')
    context.drawImage(image, 0, 0, size.width, size.height)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error('No pudimos comprimir la imagen.')),
        'image/webp',
        0.82,
      ),
    )
    if (
      blob.size >= file.size &&
      size.width === image.naturalWidth &&
      size.height === image.naturalHeight
    )
      return file
    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, '')}.${blob.type === 'image/webp' ? 'webp' : 'png'}`,
      { type: blob.type },
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
