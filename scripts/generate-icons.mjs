import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

const sizes = [192, 512]

for (const size of sizes) {
  const radius = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.52)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#0f0f0f" rx="${radius}" ry="${radius}"/>
    <text
      x="50%" y="54%"
      text-anchor="middle"
      dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${fontSize}"
      font-weight="bold"
      fill="#ffffff"
    >F</text>
  </svg>`

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icon-${size}.png`)

  console.log(`Generated public/icon-${size}.png`)
}
