/**
 * Generate a minimal valid .ico file with solid teal (#0d9488) squares
 * at 16x16, 32x32, 48x48, and 256x256 resolutions.
 *
 * ICO format: Header + Directory entries + BMP image data for each size.
 * Uses 32-bit BGRA BMP format (no compression).
 */
const fs = require('fs')
const path = require('path')

// Teal color: #0d9488 -> BGRA: 0x88, 0x94, 0x0d, 0xFF
const TEAL_BGRA = [0x88, 0x94, 0x0d, 0xff]

const sizes = [16, 32, 48, 256]

function createBmpData(size) {
  // BMP Info Header (BITMAPINFOHEADER) = 40 bytes
  // Image data = size * size * 4 bytes (32-bit BGRA)
  // Note: ICO BMPs have height = 2 * size (includes AND mask area)
  // but for 32-bit BGRA, the AND mask is not needed (alpha channel handles transparency)

  const headerSize = 40
  const pixelDataSize = size * size * 4
  // AND mask: rows of (ceil(size/32)*4) bytes each, for `size` rows
  const andMaskRowSize = Math.ceil(size / 32) * 4
  const andMaskSize = andMaskRowSize * size
  const totalSize = headerSize + pixelDataSize + andMaskSize

  const buf = Buffer.alloc(totalSize)
  let offset = 0

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, offset)           // biSize
  buf.writeInt32LE(size, offset + 4)      // biWidth
  buf.writeInt32LE(size * 2, offset + 8)  // biHeight (doubled for ICO: XOR + AND)
  buf.writeUInt16LE(1, offset + 12)       // biPlanes
  buf.writeUInt16LE(32, offset + 14)      // biBitCount (32-bit)
  buf.writeUInt32LE(0, offset + 16)       // biCompression (BI_RGB)
  buf.writeUInt32LE(pixelDataSize + andMaskSize, offset + 20) // biSizeImage
  buf.writeInt32LE(0, offset + 24)        // biXPelsPerMeter
  buf.writeInt32LE(0, offset + 28)        // biYPelsPerMeter
  buf.writeUInt32LE(0, offset + 32)       // biClrUsed
  buf.writeUInt32LE(0, offset + 36)       // biClrImportant
  offset += headerSize

  // Pixel data (bottom-up rows, BGRA)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      buf[offset++] = TEAL_BGRA[0] // B
      buf[offset++] = TEAL_BGRA[1] // G
      buf[offset++] = TEAL_BGRA[2] // R
      buf[offset++] = TEAL_BGRA[3] // A
    }
  }

  // AND mask (all zeros = fully opaque since we use 32-bit alpha)
  // Already zero-filled by Buffer.alloc

  return { buf, totalSize: totalSize }
}

function generateIco(outputPath) {
  // Build BMP data for each size
  const images = sizes.map(size => {
    const { buf, totalSize } = createBmpData(size)
    return { size, buf, totalSize }
  })

  // ICO Header: 6 bytes
  // Directory entries: 16 bytes each
  const headerSize = 6
  const dirEntrySize = 16
  const dirSize = dirEntrySize * images.length
  let dataOffset = headerSize + dirSize

  // Calculate total file size
  const totalFileSize = dataOffset + images.reduce((sum, img) => sum + img.totalSize, 0)
  const ico = Buffer.alloc(totalFileSize)

  // ICO Header
  ico.writeUInt16LE(0, 0)               // Reserved
  ico.writeUInt16LE(1, 2)               // Type: 1 = ICO
  ico.writeUInt16LE(images.length, 4)   // Number of images

  // Directory entries
  let dirOffset = headerSize
  for (const img of images) {
    ico.writeUInt8(img.size === 256 ? 0 : img.size, dirOffset)      // Width (0 = 256)
    ico.writeUInt8(img.size === 256 ? 0 : img.size, dirOffset + 1)  // Height (0 = 256)
    ico.writeUInt8(0, dirOffset + 2)                                  // Color palette
    ico.writeUInt8(0, dirOffset + 3)                                  // Reserved
    ico.writeUInt16LE(1, dirOffset + 4)                               // Color planes
    ico.writeUInt16LE(32, dirOffset + 6)                              // Bits per pixel
    ico.writeUInt32LE(img.totalSize, dirOffset + 8)                   // Size of image data
    ico.writeUInt32LE(dataOffset, dirOffset + 12)                     // Offset to image data

    dirOffset += dirEntrySize
    dataOffset += img.totalSize
  }

  // Image data
  let imgOffset = headerSize + dirSize
  for (const img of images) {
    img.buf.copy(ico, imgOffset)
    imgOffset += img.totalSize
  }

  fs.writeFileSync(outputPath, ico)
  console.log(`Generated ICO: ${outputPath} (${totalFileSize} bytes, ${images.length} sizes: ${sizes.join(', ')})`)
}

const outputPath = path.resolve(__dirname, '..', 'build', 'icon.ico')
generateIco(outputPath)
