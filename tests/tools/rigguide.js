#!/usr/bin/env node
// 切り絵リグの下敷き（開発用）。いまのパーツを、ゲームと同じ相対的な大きさで並べ、番号と支点を付けて出す。
//   node tests/tools/rigguide.js [出力先.png]   → 分解図（番号＋支点の黒点＋相対的な大きさ）
// 外部AIに「この番号・位置・大きさの比率どおりに、パーツを別々に描いて」と頼むときの参考画像にする。
const fs = require('fs'), path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const RIG = new Function('return ' + src.match(/const RIG = (\{[\s\S]*?\n\});/)[1])();
// 分解図：各パーツを、ゲームと同じ「相対的な大きさ」で、4列×2行のマスに並べる。支点（関節）に黒い点、番号つき。
(async () => {
  const out = process.argv[2] || path.join(ROOT, 'rig_guide.png');
  const ORDER = [[1, 'head'], [2, 'torso'], [3, 'cape'], [4, 'arm_hang'], [5, 'arm_lion'], [6, 'leg_a'], [7, 'leg_b']];
  const CELL = 400, COLS = 4, ROWS = 2, K = 2.4;                                 // 1マス400px、ゲーム上の大きさ×K
  const c = createCanvas(CELL * COLS, CELL * ROWS), g = c.getContext('2d'); g.fillStyle = '#ff00ff'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < ORDER.length; i++) {
    const [n, k] = ORDER[i], d = RIG.part[k], im = await loadImage(path.join(ROOT, 'assets/rig', k + '.png'));
    const w = im.width * d.s * K, h = im.height * d.s * K, cx = (i % COLS) * CELL, cy = Math.floor(i / COLS) * CELL;
    const sc = Math.min(1, (CELL * 0.8) / Math.max(w, h)), x0 = cx + (CELL - w * sc) / 2, y0 = cy + (CELL - h * sc) / 2;
    g.drawImage(im, x0, y0, w * sc, h * sc);
    g.fillStyle = '#000'; g.beginPath(); g.arc(x0 + d.px * d.s * K * sc, y0 + d.py * d.s * K * sc, 7, 0, 7); g.fill();
    g.font = 'bold 40px sans-serif'; g.textAlign = 'left'; g.strokeStyle = '#000'; g.lineWidth = 7; g.fillStyle = '#fff';
    g.strokeText(String(n), cx + 14, cy + 46); g.fillText(String(n), cx + 14, cy + 46);
  }
  fs.writeFileSync(out, c.toBuffer('image/png')); console.log('書き出し:', out);
})();
