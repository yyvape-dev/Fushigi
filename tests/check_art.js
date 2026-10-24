// 絵の簡易チェック：mainとの差分にある画像（png/webp/jpg）が、壊れていない・大きすぎないことを確認する。
// 絵の良し悪しは見ない（それは人の目）。壊れたファイルや巨大ファイルが自動マージで入るのを防ぐ。
// 使い方：node tests/check_art.js        （比較先は環境変数 BASE、既定 origin/main）
const { execSync } = require('child_process');
const fs = require('fs');
const { loadImage } = require('@napi-rs/canvas');

const BASE = process.env.BASE || 'origin/main';
const MAX_BYTES = 6 * 1024 * 1024;     // 1枚6MBまで（今ある最大は約3.3MB）
const MAX_SIDE = 8192, MIN_SIDE = 16;

let files;
try {
  files = execSync(`git diff --name-only --diff-filter=AM ${BASE}...HEAD`, { encoding: 'utf8' })
    .split('\n').filter(f => /\.(png|webp|jpe?g)$/i.test(f));
} catch (e) {
  console.log(`SKIP: ${BASE} と比べられません（ローカル実行など）`);
  process.exit(0);
}
(async () => {
  let bad = 0;
  for (const f of files) {
    const size = fs.statSync(f).size;
    try {
      const img = await loadImage(fs.readFileSync(f));
      const w = img.width, h = img.height;
      const problems = [];
      if (size > MAX_BYTES) problems.push(`大きすぎる(${(size / 1048576).toFixed(1)}MB>6MB)`);
      if (Math.max(w, h) > MAX_SIDE || Math.min(w, h) < MIN_SIDE) problems.push(`寸法が範囲外(${w}x${h})`);
      if (problems.length) { bad++; console.log(`NG  ${f}: ${problems.join(', ')}`); }
      else console.log(`OK  ${f} ${w}x${h} ${(size / 1024).toFixed(0)}KB`);
    } catch (e) {
      bad++; console.log(`NG  ${f}: 画像として読めません`);
    }
  }
  console.log(files.length ? (bad ? `ART CHECK FAILED (${bad}/${files.length})` : `ART CHECK OK (${files.length}枚)`) : 'ART CHECK OK (画像の変更なし)');
  process.exit(bad ? 1 : 0);
})();
