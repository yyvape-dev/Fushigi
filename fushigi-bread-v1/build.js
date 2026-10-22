// Keep a common scale across the four cells, rather than enlarging every loaf
// to its own bounding box (which would erase the small/large distinction).
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { keyOut } = require('../tests/tools/sheets');
async function main() {
  const image = await loadImage(path.join(__dirname, 'source-art/bread-sheet.png'));
  const keys = ['bread_small', 'bread', 'bread_big', 'bread_moldy'];
  for (let i = 0; i < keys.length; i++) {
    const cell = createCanvas(image.width / 2, image.height / 2);
    cell.getContext('2d').drawImage(image, (i % 2) * cell.width,
      Math.floor(i / 2) * cell.height, cell.width, cell.height,
      0, 0, cell.width, cell.height);
    keyOut(cell);
    const out = createCanvas(256, 256);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cell, 0, 0, 256, 256);
    fs.writeFileSync(path.join(__dirname, '../assets', keys[i] + '.png'), out.toBuffer('image/png'));
    console.log(keys[i]);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
