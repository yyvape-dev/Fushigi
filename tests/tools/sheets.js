#!/usr/bin/env node
// アイテム絵の「シート」ツール（開発用。ゲームには入っていない）
//   使い方:
//     node tests/tools/sheets.js list                       シート一覧
//     node tests/tools/sheets.js prompt <シートID>          外部AIに渡すプロンプトを表示
//     node tests/tools/sheets.js slice <シートID> <画像> [--size 256] [--out assets]
//         シート画像（背景=単色マゼンタ）を4列で切り分け、各アイテムを <out>/<キー>.png に書き出す（長辺を size px に縮小）
//     node tests/tools/sheets.js pick <シートID> <画像> <番号>=<キー> ...   シートの一部のマス（1始まり）だけを assets/<キー>.png に出す（例: 2=icon_herb）
//   絵はリポジトリの assets/<キー>.png に置く。https のとき、ゲームが自動で読む（背景は透過済みで出力する）。
//   方針：床・持ち物の絵はカテゴリで1つに固定（icon_*）。手持ちの絵（剣・盾）だけ種類ごと。草・巻物・腕輪を個別に作らない（識別のため）。
const fs = require('fs'), path = require('path');

const SHEET_STYLE = '3Dレンダリングのビニールフィギュア風、柔らかいスタジオ照明、なめらかで丸みのある形、ほんのり光沢、斜め上から見下ろす視点';
const HINT = {
  // --- 床・持ち物の共通アイコン（カテゴリで1つ）
  icon_scroll: '紐で結んだ無地の巻物（羊皮紙色）', icon_ring: '赤い宝石のついた金の腕輪', icon_sword: '斜めに置いた鉄の剣', icon_shield: '正面向きの丸い鉄の盾',
  // --- 食べ物（パン4種。床・持ち物で個別の絵）
  bread_small: '小さな丸い白パン（手のひらサイズ）', bread: 'こんがり焼けた楕円のパン（コッペパン）', bread_big: '大きく丸いカンパーニュ風のパン（切れ目入り）', bread_moldy: '青緑のカビの斑点が生えた、しなびたパン',
  // --- 敵（右向き・斜め前から・全身。足元をそろえて切り出す）
  slime: '水色のぷるぷるしたスライム（目と口つき）', goblin: '緑の小さなゴブリン（とがった耳、棍棒を持つ）', bat: '紫のコウモリ（翼を広げている）', blob: 'ピンク紫のぶよぶよした塊（小さな顔つき）',
  skeleton: '骨だけのスケルトン（剣と丸い盾を持つ）', archer: '黄色い帽子をかぶった小柄な弓兵（小さな弓を構える）', thief: '茶色のどろぼうタヌキ（大きな風呂敷包みを背負う）', sleepy: '青紫の眠そうなキノコ（目を閉じた顔）',
  bomb: 'オレンジの丸い体のばくだん虫（頭に火のついた導火線）', ogre: '赤茶色の大柄なオーガ（金棒を持つ）', dazzle: '水色のカエル（目が渦巻き）', venom: '黄緑のどくバチ（大きな針）',
  ghost: '薄青く半透明のゴースト（足がなくふわふわ浮く）', minotaur: '牛の頭を持つ大きな戦士ミノタウロス（大きな斧を持つ）', dragon: '赤い小型のドラゴン（翼を持ち、口から炎が漏れる）',
  // --- 深層の敵（能力が特徴。絵でも一目で分かるように）
  ninja: '紺色の装束のニンジャ（目だけ出した覆面、手に手裏剣、前かがみで素早そう）', caster: '紫のとんがり帽子とローブのまじゅつ師（杖の先に光る玉、うつろな目）', mimic: '金の縁取りの木の宝箱（ふたの隙間から長い舌と鋭い歯がのぞく）',
  summoner: '黄色い法衣と数珠をつけた一つ目の妖怪坊主（灰青色の釣鐘形の頭、牙、3本指の爪、大きな金の鈴を片手で鳴らす。人間の肌色の頭や顔にはしない）', charged: 'ごつごつした灰色の大岩（表面に黄色い稲妻が走り、小さな目が二つ）', cannon: '緑がかった鎧の兵士が肩に太い大砲を担いでいる（どっしり立つ）',
  lord: '黒紫のうろこの巨大なドラゴンの主（金の王冠、大きな翼、赤く光る目、威圧感）',
  // --- 手持ち用（主人公が持つ絵）：武器は刃を真上に向けて縦に置く
  woodsword: '木の刀', bronzesword: '青銅の太刀', katana: '細身のカタナ', dotanuki: '分厚い胴田貫（刀）',
  minoaxe: '牛の角の飾りがついた斧（刃は右側）', renkentou: '二重の刃の刀', kamaitachi: '三日月形の妖刀', healsword: '緑の宝玉がついた剣', steakknife: '巨大なステーキナイフ',
  harisen: '紙でできた大きなハリセン', skyblade: '水色の羽根がついた刃', firesword: '炎をまとった刀',
  bronzeshield: '青銅の丸い盾', tekkoshield: '鉄の四角い盾', onioookami: '鬼と狼の顔の盾', battlecounter: 'とげのある赤い盾',
  mikiri: '水色の細長い盾', konjo: '金色で「根」の字が刻まれた盾', zekkocho: '黄色い笑顔の盾', haramochi: 'おにぎり形の盾', steakplate: '肉の皿の形をした盾', minoshield: '牛の顔の盾',
};
const ENEMY_NOTE = '全員、右向きで斜め前から見た全身。足元が下で、マスの高さいっぱいに描く。まるいデフォルメの怪物で、目はつぶらにして怖くしすぎない。';
const SHEETS = [
  { id: 'icons', name: '共通アイコン（巻物・腕輪・剣・盾）', cols: 2, keys: ['icon_scroll', 'icon_ring', 'icon_sword', 'icon_shield'], note: 'どれも床に落ちている姿のアイコン。形は単純で、色は控えめにする。' },
  { id: 'weapon', name: '手持ちの武器', keys: ['woodsword', 'bronzesword', 'katana', 'dotanuki', 'minoaxe', 'renkentou', 'kamaitachi', 'healsword', 'steakknife', 'harisen', 'skyblade', 'firesword'], note: '武器はすべて、刃（先端）を真上に向けて縦に置き、マスの高さいっぱいに描く。握る柄の位置はマスの下から約20%。' },
  { id: 'shield', name: '手持ちの盾', keys: ['bronzeshield', 'tekkoshield', 'onioookami', 'battlecounter', 'mikiri', 'konjo', 'zekkocho', 'haramochi', 'steakplate', 'minoshield'], note: '盾はすべて正面向きで、マスの85%の大きさ。' },
  { id: 'bread', name: 'パン4種（小さなパン・パン・大きなパン・カビの生えたパン）', cols: 2, keys: ['bread_small', 'bread', 'bread_big', 'bread_moldy'], note: 'どれも床に置いた姿。大きさの違いが分かるように、小さなパンはマスの55%、パンは75%、大きなパンは95%、カビの生えたパンは75%の大きさにする。' },
  { id: 'enemyA', name: '敵（前半8種）', foot: true, keys: ['slime', 'goblin', 'bat', 'blob', 'skeleton', 'archer', 'thief', 'sleepy'], note: ENEMY_NOTE },
  { id: 'enemyB', name: '敵（後半7種）', foot: true, keys: ['bomb', 'ogre', 'dazzle', 'venom', 'ghost', 'minotaur', 'dragon'], note: ENEMY_NOTE },
  { id: 'enemyC', name: '敵（深層6種＋主）', foot: true, keys: ['ninja', 'caster', 'mimic', 'summoner', 'charged', 'cannon', 'lord'], note: '全員、右向きで斜め前から見た全身。足元が下で、マスの高さいっぱいに描く。丸みのあるデフォルメだが、敵モンスターと一目で分かる険しく邪悪な顔つき。細く鋭い目、小さい瞳、険しい眉、狡猾な薄笑い、帽子や兜の奥の暗い顔。ニンジャは鋭いにらみ、まじゅつ師はうつろで不気味な目、すず坊主は邪悪な妖怪僧、おおづつ兵は兜の奥でにらむ目。大きく丸い味方風の瞳・長いまつ毛・頬の赤み・無邪気な笑顔は描かない。流血や生々しいホラーは不要。' },
];
const sheetCols = sh => sh.cols || 4;
const sheetRows = sh => Math.ceil(sh.keys.length / sheetCols(sh));
// 外部AIに渡すプロンプト（日本語）。1枚の画像に、決めた順でアイコンを並べさせる
function sheetPrompt(sh) {
  const r = sheetRows(sh), n = sh.keys.length;
  const list = sh.keys.map((k, i) => `${i + 1}.${HINT[k] || k}`).join('、');
  const what = sh.foot ? '敵キャラクター' : 'アイテム';
  return `${SHEET_STYLE}。ゲームの${what}${sh.foot ? '' : 'アイコン'}のシート。横${sheetCols(sh)}列×縦${r}行の同じ大きさのマス目に、${n}${sh.foot ? "体" : "個"}の${what}を1マスに1個ずつ、中央に大きく描く。左上から右へ、上の行から下の行の順に：${list}。` +
    `${sh.note ? sh.note : ''}各${what}は単体で、ほかのマスにはみ出さず、余白をあける。背景は全面が単色の真っ平らなマゼンタ(#FF00FF)、マス目の線・影・文字・番号は描かない。正方形の画像。`;
}
// マゼンタ背景を透明にする。純マゼンタは完全に透明、絵との境目のにじみ（マゼンタ寄りの色）は半透明にして、ピンクの縁が残らないよう色も戻す
function keyOut(canvas) {
  const g = canvas.getContext('2d'), d = g.getImageData(0, 0, canvas.width, canvas.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gr = p[i + 1], b = p[i + 2], m = Math.min(r, b) - gr;           // マゼンタ度：赤と青が緑より強いほど大きい
    if (r > 200 && b > 200 && gr < 90) { p[i + 3] = 0; continue; }                 // 純マゼンタ（ゲーム側と同じ判定）
    if (m > 60 && Math.abs(r - b) < 70) {                                            // 境目：マゼンタ成分を抜いて半透明にする
      const a = Math.max(0, Math.min(1, 1 - (m - 60) / 150));
      p[i + 3] = Math.round(p[i + 3] * a); p[i] = Math.min(r, gr + 40); p[i + 2] = Math.min(b, gr + 40);
    }
  }
  g.putImageData(d, 0, 0); return canvas;
}
// 画像を縦横に区切り、各マスの中身の外接矩形を、余白つきの正方形（長辺 size px）に収めて返す。空のマスは null
function sliceSheet(im, cols, rows, n, size = 256, createCanvas = require('@napi-rs/canvas').createCanvas, foot = false) {
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
    g.drawImage(c, x0, y0, bw, bh, (size - bw * k) / 2, foot ? size - pad * k - bh * k : (size - bh * k) / 2, bw * k, bh * k);   // foot=足元をそろえる（敵）
    out.push(o);
  }
  return out;
}
module.exports = { SHEETS, HINT, sheetCols, sheetRows, sheetPrompt, sliceSheet, keyOut };

if (require.main === module) {
  const [cmd, id, img, ...rest] = process.argv.slice(2);
  const opt = (name, def) => { const i = rest.indexOf('--' + name); return i >= 0 ? rest[i + 1] : def; };
  const sh = SHEETS.find(x => x.id === id);
  const run = (picks) => {
    const { loadImage } = require('@napi-rs/canvas'), size = +opt('size', 256), outDir = opt('out', 'assets');
    return loadImage(img).then(im => {
      const cells = sliceSheet(im, sheetCols(sh), sheetRows(sh), sh.keys.length, size, undefined, !!sh.foot), empty = [], wrote = [];
      fs.mkdirSync(outDir, { recursive: true });
      const targets = picks || cells.map((_, i) => [i + 1, sh.keys[i]]);
      for (const [no, key] of targets) {
        const c = cells[no - 1];
        if (!c) { empty.push(`${no}番(${key})`); continue; }
        fs.writeFileSync(path.join(outDir, key + '.png'), c.toBuffer('image/png')); wrote.push(key);
      }
      console.log(`${wrote.length}個を ${outDir}/ に書き出しました（${im.width}x${im.height} → ${size}px）：${wrote.join(', ')}` + (empty.length ? `。空のマス：${empty.join(', ')}` : ''));
    });
  };
  if (cmd === 'list') for (const x of SHEETS) console.log(`${x.id}\t${x.name}\t${x.keys.length}個（${sheetCols(x)}×${sheetRows(x)}）`);
  else if (cmd === 'prompt' && sh) console.log(sheetPrompt(sh));
  else if (cmd === 'slice' && sh && img) run(null);
  else if (cmd === 'pick' && sh && img) {
    const picks = rest.filter(a => /^\d+=/.test(a)).map(a => { const [n, k] = a.split('='); return [+n, k]; });
    if (!picks.length) { console.log('番号=キー を1つ以上指定してください（例: 2=icon_herb）'); process.exit(1); }
    run(picks);
  } else { console.log('使い方: node tests/tools/sheets.js list | prompt <ID> | slice <ID> <画像> [--size 256] [--out assets] | pick <ID> <画像> <番号>=<キー> ...'); process.exit(1); }
}
