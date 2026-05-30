import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

// Ikona se škáluje – vše definujeme relativně vůči velikosti
function makeSvg(size) {
  const r = Math.round(size * 0.18) // radius pozadí

  // Rozložení klapky
  const bx = Math.round(size * 0.15)  // levý okraj klapky
  const bw = Math.round(size * 0.70)  // šířka klapky
  const topY = Math.round(size * 0.27) // horní hrana clapper pásu
  const topH = Math.round(size * 0.13) // výška clapper pásu
  const bodyY = topY + topH            // horní hrana těla klapky
  const bodyH = Math.round(size * 0.45) // výška těla klapky
  const br = 6                          // radius rohů klapky

  // Diagonální proužky na clapper pásu (45°)
  // Proužek šířky sw, posun o topH (výška pásu) doprava na spodní hraně
  const sw = Math.round(size * 0.065)  // šířka jednoho proužku
  const period = sw * 2                 // perioda (černá + bílá)
  const stripes = []
  for (let x = bx - topH; x < bx + bw; x += period) {
    stripes.push(
      `<polygon points="${x},${topY} ${x + sw},${topY} ${x + sw + topH},${bodyY} ${x + topH},${bodyY}" fill="#1a1a2e"/>`
    )
  }

  // Linky textu na těle klapky
  const lx = bx + Math.round(bw * 0.1)
  const lw = bw * 0.8
  const lineY = (i) => bodyY + Math.round(bodyH * (0.22 + i * 0.18))
  const lineW = (f) => Math.round(lw * f)
  const lh = Math.round(size * 0.025)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <clipPath id="cc">
      <rect x="${bx}" y="${topY}" width="${bw}" height="${topH}" rx="${br}"/>
    </clipPath>
  </defs>

  <!-- Pozadí -->
  <rect width="${size}" height="${size}" fill="#0d1117" rx="${r}"/>

  <!-- Tělo klapky -->
  <rect x="${bx}" y="${bodyY}" width="${bw}" height="${bodyH}" rx="${br}" fill="#e8e8e8"/>

  <!-- Textové linky -->
  <rect x="${lx}" y="${lineY(0)}" width="${lineW(0.55)}" height="${lh}" rx="3" fill="#999"/>
  <rect x="${lx}" y="${lineY(1)}" width="${lineW(0.80)}" height="${lh}" rx="3" fill="#bbb"/>
  <rect x="${lx}" y="${lineY(2)}" width="${lineW(0.65)}" height="${lh}" rx="3" fill="#bbb"/>
  <rect x="${lx}" y="${lineY(3)}" width="${lineW(0.45)}" height="${lh}" rx="3" fill="#bbb"/>

  <!-- Clapper pás – bílý základ -->
  <rect x="${bx}" y="${topY}" width="${bw}" height="${topH}" rx="${br}" fill="#e8e8e8"/>

  <!-- Diagonální proužky (oříznuté na pás) -->
  <g clip-path="url(#cc)">
    ${stripes.join('\n    ')}
  </g>

  <!-- Oddělovací linka -->
  <rect x="${bx}" y="${bodyY - 2}" width="${bw}" height="${Math.max(3, Math.round(size * 0.006))}" fill="#555"/>
</svg>`
}

for (const size of [192, 512]) {
  await sharp(Buffer.from(makeSvg(size)))
    .png()
    .toFile(`public/icon-${size}.png`)
  console.log(`Generated public/icon-${size}.png`)
}
