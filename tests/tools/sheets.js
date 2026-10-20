#!/usr/bin/env node
// アイテム絵の「シート」ツール（開発用。ゲームには入っていない）
//   使い方:
//     node tests/tools/sheets.js list                       シート一覧
//     node tests/tools/sheets.js prompt <シートID>          外部AIに渡すプロンプトを表示
//     node tests/tools/sheets.js slice <シートID> <画像> [--size 256] [--out assets]
//         シート画像（背景=単色マゼンタ）を4列で切り分け、各アイテムを <out>/<キー>.png に書き出す（長辺を size px に縮小）
//   絵はリポジトリの assets/<キー>.png に置く。https のとき、ゲームが自動で読む（背景は透過済みで出力する）。
const fs = require('fs'), path = require('path');

const SHEET_STYLE = '3Dレンダリングのビニールフィギュア風、柔らかいスタジオ照明、なめらかで丸みのある形、ほんのり光沢、斜め上から見下ろす視点';
const HINT = {
  weed: 'しなびた灰緑色の雑草', herb: '明るい緑の葉の小さな草の束', outogiri: '黄緑の葉に黄色い小花のついた草', iyashi: '青緑の葉に白い花のついた草',
  lifeherb: '金色に輝く葉の草', kaguwashi: '淡い黄緑の葉に光る粒がついた草', antidoteherb: '水色の葉の草', reviveherb: '白金に光る羽のような葉の草',
  dragonherb: '赤橙の炎のような葉の草', warpherb: '水色の渦を巻く葉の草', strherb: 'オレンジ色の太い茎の草', poisonherb: '紫の斑点のある葉の草',
  confherb: 'ピンクの渦巻き模様の葉の草', sleepherb: '青紫の丸い葉の草', blindherb: '黒い葉の草', eyeherb: '水色の目の模様のある葉の草',
  hasteherb: '黄色い羽のような葉の草', powerherb: '赤い太い葉の草', invincherb: '白く光り輝く草', bellyup: '小さな橙色の木の実の種', bellydown: '小さな灰紫色の木の実の種',
  potion: 'ピンクの液体の入った小さなガラス瓶', onigiri: '三角形の白いおにぎり（海苔つき）', firestaff: '先に赤い炎の宝石がついた木の杖', blowstaff: '先に水色の宝石がついた木の杖', swapstaff: '先に紫の宝石がついた木の杖',
  scroll: '金色の紐で結んだ巻物', shieldscroll: '茶色の紐で結んだ巻物', confscroll: 'ピンクの紐で結んだ巻物', sleepscroll: '青紫の紐で結んだ巻物',
  vacuumscroll: '水色の紐で結んだ巻物', annihilatescroll: 'マゼンタに近い濃いピンクの紐で結んだ巻物', lightscroll: '黄色の紐で結んだ巻物', mapscroll: '青い紐で結んだ巻物',
  gatherscroll: '橙の紐で結んだ巻物', itemscroll: '紫がかったピンクの紐で結んだ巻物', housescroll: '暗い赤の紐で結んだ巻物', hastescroll: '赤橙の紐で結んだ巻物',
  helpscroll: '薄緑の紐で結んだ巻物', mutescroll: '灰色の紐で結んだ巻物', escscroll: '緑の紐で結んだ巻物', boomscroll: '赤い紐で結んだ巻物',
  ring_regen: '緑の宝石がついた金の腕輪', ring_strength: '橙の宝石がついた金の腕輪', ring_bellyup: '金色に光る大きな腕輪', ring_bellydown: '灰紫の宝石がついた腕輪',
  ring_antidote: '水色の宝石がついた金の腕輪', ring_noconf: 'ピンクの宝石がついた金の腕輪', ring_nosleep: '青紫の宝石がついた金の腕輪', ring_moroha: '赤い宝石と刃の飾りがついた腕輪',
  ring_tsukon: '暗い赤の宝石がついた黒い腕輪', ring_boom: '橙の宝石と小さな爆弾の飾りがついた腕輪', ring_warp: '水色の渦巻きの飾りがついた腕輪', ring_seeall: '白い目の飾りがついた銀の腕輪',
  ring_senseE: '赤い目の飾りがついた腕輪', ring_senseI: 'ピンクの目の飾りがついた腕輪', ring_sneak: '灰緑の宝石がついた地味な腕輪', ring_leak: '茶色の穴あきの腕輪', ring_summon: '紫の宝石と小さな角の飾りがついた腕輪',
  stick: '素朴な木の棒', sword: '鉄の剣', axe: '大きな斧', woodsword: '木の刀', bronzesword: '青銅の太刀', katana: '細身のカタナ', dotanuki: '分厚い胴田貫（刀）',
  minoaxe: '牛の角の飾りがついた斧', renkentou: '二重の刃の刀', kamaitachi: '三日月形の妖刀', healsword: '緑の宝玉がついた剣', steakknife: '巨大なステーキナイフ',
  harisen: '紙でできた大きなハリセン', skyblade: '水色の羽根がついた刃', firesword: '炎をまとった刀',
  woodshield: '木の丸い盾', ironshield: '鉄の盾', bronzeshield: '青銅の丸い盾', ironshield2: '鉄の四角い盾', onioookami: '鬼と狼の顔の盾', battlecounter: 'とげのある赤い盾',
  mikiri: '水色の細長い盾', konjo: '金色で「根」の字が刻まれた盾', zekkocho: '黄色い笑顔の盾', haramochi: 'おにぎり形の盾', steakplate: '肉の皿の形をした盾', minoshield: '牛の顔の盾',
};
const SHEETS = [
  { id: 'herb1', name: '草 その1', keys: ['weed', 'herb', 'outogiri', 'iyashi', 'lifeherb', 'kaguwashi', 'antidoteherb', 'reviveherb', 'dragonherb', 'warpherb', 'strherb', 'poisonherb', 'confherb', 'sleepherb', 'blindherb', 'eyeherb'] },
  { id: 'herb2', name: '草・薬・食・杖', keys: ['hasteherb', 'powerherb', 'invincherb', 'bellyup', 'bellydown', 'potion', 'onigiri', 'firestaff', 'blowstaff', 'swapstaff'] },
  { id: 'scroll', name: '巻物', keys: ['scroll', 'shieldscroll', 'confscroll', 'sleepscroll', 'vacuumscroll', 'annihilatescroll', 'lightscroll', 'mapscroll', 'gatherscroll', 'itemscroll', 'housescroll', 'hastescroll', 'helpscroll', 'mutescroll', 'escscroll', 'boomscroll'] },
  { id: 'ring', name: '腕輪', keys: ['ring_regen', 'ring_strength', 'ring_bellyup', 'ring_bellydown', 'ring_antidote', 'ring_noconf', 'ring_nosleep', 'ring_moroha', 'ring_tsukon', 'ring_boom', 'ring_warp', 'ring_seeall', 'ring_senseE', 'ring_senseI', 'ring_sneak', 'ring_leak'] },
  { id: 'weapon', name: '武器', keys: ['stick', 'sword', 'axe', 'woodsword', 'bronzesword', 'katana', 'dotanuki', 'minoaxe', 'renkentou', 'kamaitachi', 'healsword', 'steakknife', 'harisen', 'skyblade', 'firesword'] },
  { id: 'shield', name: '盾・腕輪の残り', keys: ['woodshield', 'ironshield', 'bronzeshield', 'ironshield2', 'onioookami', 'battlecounter', 'mikiri', 'konjo', 'zekkocho', 'haramochi', 'steakplate', 'minoshield', 'ring_summon'] },
];
const SHEET_COLS = 4;
const sheetRows = sh => Math.ceil(sh.keys.length / SHEET_COLS);
// 外部AIに渡すプロンプト（日本語）。1枚の画像に、決めた順でアイコンを並べさせる
function sheetPrompt(sh) {
  const r = sheetRows(sh), n = sh.keys.length;
  const list = sh.keys.map((k, i) => `${i + 1}.${HINT[k] || k}`).join('、');
  return `${SHEET_STYLE}。ゲームのアイテムアイコンのシート。横${SHEET_COLS}列×縦${r}行の同じ大きさのマス目に、${n}個のアイテムを1マスに1個ずつ、中央に大きく描く。左上から右へ、上の行から下の行の順に：${list}。` +
    `各アイテムは単体で、ほかのマスにはみ出さず、余白をあける。背景は全面が単色の真っ平らなマゼンタ(#FF00FF)、マス目の線・影・文字・番号は描かない。正方形の画像。`;
}
// マゼンタ背景を透明にする（ゲームと同じ判定：赤>200 かつ 青>200 かつ 緑<90）
function keyOut(canvas) {
  const g = canvas.getContext('2d'), d = g.getImageData(0, 0, canvas.width, canvas.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) if (p[i] > 200 && p[i + 2] > 200 && p[i + 1] < 90) p[i + 3] = 0;
  g.putImageData(d, 0, 0); return canvas;
}
// 画像を縦横に区切り、各マスの中身の外接矩形を、余白つきの正方形（長辺 size px）に収めて返す。空のマスは null
function sliceSheet(im, cols, rows, n, size = 256, createCanvas = require('@napi-rs/canvas').createCanvas) {
  const W = im.width, H = im.height, cw = W / cols, ch = H / rows, out = [];
  for (let i = 0; i < n; i++) {
    const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    const ix = Math.round(cw * 0.04), iy = Math.round(ch * 0.04);                     // 隣のマスからはみ出た部分を拾わないよう、周囲4%は見ない
    const sx = Math.round(cx) + ix, sy = Math.round(cy) + iy, sw = Math.round(cw) - 2 * ix, sh = Math.round(ch) - 2 * iy;
    const c = createCanvas(sw, sh); c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
    keyOut(c); const d = c.getContext('2d').getImageData(0, 0, sw, sh).data;
    let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (d[(y * sw + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0 || (x1 - x0 + 1) * (y1 - y0 + 1) < sw * sh * 0.01) { out.push(null); continue; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh), pad = Math.round(side * 0.06), full = side + 2 * pad;
    const o = createCanvas(size, size), g = o.getContext('2d'), k = size / full;       // 長辺を size に収め、余白つきで中央に置く
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(c, x0, y0, bw, bh, (size - bw * k) / 2, (size - bh * k) / 2, bw * k, bh * k);
    out.push(o);
  }
  return out;
}
module.exports = { SHEETS, HINT, SHEET_COLS, sheetRows, sheetPrompt, sliceSheet, keyOut };

if (require.main === module) {
  const [cmd, id, img, ...rest] = process.argv.slice(2);
  const opt = (name, def) => { const i = rest.indexOf('--' + name); return i >= 0 ? rest[i + 1] : def; };
  const sh = SHEETS.find(x => x.id === id);
  if (cmd === 'list') for (const x of SHEETS) console.log(`${x.id}\t${x.name}\t${x.keys.length}個（${SHEET_COLS}×${sheetRows(x)}）`);
  else if (cmd === 'prompt' && sh) console.log(sheetPrompt(sh));
  else if (cmd === 'slice' && sh && img) {
    const { loadImage } = require('@napi-rs/canvas'), size = +opt('size', 256), outDir = opt('out', 'assets');
    loadImage(img).then(im => {
      const cells = sliceSheet(im, SHEET_COLS, sheetRows(sh), sh.keys.length, size), empty = [];
      fs.mkdirSync(outDir, { recursive: true });
      cells.forEach((c, i) => { if (!c) { empty.push(sh.keys[i]); return; } fs.writeFileSync(path.join(outDir, sh.keys[i] + '.png'), c.toBuffer('image/png')); });
      console.log(`${cells.length - empty.length}個を ${outDir}/ に書き出しました（${im.width}x${im.height} → ${size}px）` + (empty.length ? `。空のマス：${empty.join(', ')}` : ''));
    });
  } else { console.log('使い方: node tests/tools/sheets.js list | prompt <ID> | slice <ID> <画像> [--size 256] [--out assets]'); process.exit(1); }
}
