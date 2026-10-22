// ダンジョン地形の品質を数字で測る。使い方：
//   node tests/tools/dungeon_metrics.js [幅] [高さ] [シード数] [--ascii=件数]
// 例：node tests/tools/dungeon_metrics.js 40 25 1000 --ascii=6
// assets/dungeon-generator.js の DungeonGenerator.generate(width,height,seed,depth) だけを使う（本編・描画に依存しない）。
const fs = require('fs'), path = require('path'), vm = require('vm');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flag = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const W = +(args[0] || 40), H = +(args[1] || 25), N = +(args[2] || 1000), ASCII = +(flag('ascii') || 0);
const src = fs.readFileSync(path.join(__dirname, '../../assets/dungeon-generator.js'), 'utf8');
const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const G = ctx.DungeonGenerator;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function analyze(f) {
  const m = f.map, inR = Array.from({ length: H }, () => Array(W).fill(-1));
  f.rooms.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) inR[y][x] = i; });
  const walk = (x, y) => y >= 0 && y < H && x >= 0 && x < W && m[y][x] !== 0;
  let floor = 0, corr = 0, deadEnd = 0, hugging = 0, border = 0, block = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!walk(x, y)) continue; floor++;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border++;
    if (inR[y][x] >= 0) continue; corr++;
    const n = D4.filter(([dx, dy]) => walk(x + dx, y + dy)).length;
    if (n <= 1) deadEnd++;
    const touch = (xx, yy) => D4.some(([dx, dy]) => inR[yy + dy] && inR[yy + dy][xx + dx] >= 0);
    if (touch(x, y) && D4.some(([dx, dy]) => walk(x + dx, y + dy) && inR[y + dy][x + dx] < 0 && touch(x + dx, y + dy))) hugging++;   // 部屋の壁に沿って張り付く通路マス（出入口の1マスは数えない）
    if (walk(x + 1, y) && walk(x, y + 1) && walk(x + 1, y + 1) && inR[y][x + 1] < 0 && inR[y + 1][x] < 0 && inR[y + 1][x + 1] < 0) block++;   // 通路の2×2の塊（通路が太くなる）
  }
  // 連結性：全床マスが1つの塊か
  let start = null; for (let y = 0; y < H && !start; y++) for (let x = 0; x < W; x++) if (walk(x, y)) { start = [x, y]; break; }
  const dist = Array.from({ length: H }, () => Array(W).fill(-1)); let reached = 0;
  if (start) { const q = [start]; dist[start[1]][start[0]] = 0; while (q.length) { const [x, y] = q.shift(); reached++; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (walk(nx, ny) && dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } } } }
  const connected = reached === floor;
  // 開始部屋(0)から最も遠い部屋までの歩数（階段候補の距離）
  const sc = f.rooms[0]; const d0 = {}; { const q = [[sc.cx, sc.cy]]; for (const r of [0]) { } const dd = Array.from({ length: H }, () => Array(W).fill(-1)); dd[sc.cy][sc.cx] = 0; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (walk(nx, ny) && dd[ny][nx] < 0) { dd[ny][nx] = dd[y][x] + 1; q.push([nx, ny]); } } } f.rooms.forEach((r, i) => { d0[i] = dd[r.cy][r.cx]; }); }
  const maxPath = Math.max(...Object.values(d0));
  // 通路が部屋の内部を貫通した回数（通路マスではなく、部屋の床が通路由来の線で貫かれるかは判別不能なので、部屋を3つ以上経由する最短路で近似しない）
  // 偏り：マップを3×3に分け、部屋の中心がある区画の数（多いほど散らばっている）
  const cells = new Set(f.rooms.map(r => Math.floor(r.cx / (W / 3)) + ',' + Math.floor(r.cy / (H / 3))));
  // 空白：8×8の窓で床が1マスも無い窓の割合（大きな空白＝無駄な空間）
  let emptyWin = 0, totalWin = 0; for (let y = 0; y + 8 <= H; y += 4) for (let x = 0; x + 8 <= W; x += 4) { totalWin++; let any = false; for (let yy = y; yy < y + 8 && !any; yy++) for (let xx = x; xx < x + 8; xx++) if (m[yy][xx]) { any = true; break; } if (!any) emptyWin++; }
  return { rooms: f.rooms.length, block, floor, cover: floor / (W * H), corr, deadEnd, hugging, border, connected, maxPath, spread: cells.size, emptyWin: totalWin ? emptyWin / totalWin : 0, shaped: f.rooms.filter(r => r.shape && r.shape !== 'rect').length / Math.max(1, f.rooms.length), bigRooms: f.rooms.filter(r => r.big).length, roomShapes: new Set(f.rooms.map(r => r.w + 'x' + r.h)).size };
}
const keys = ['rooms', 'floor', 'cover', 'corr', 'deadEnd', 'hugging', 'block', 'border', 'maxPath', 'spread', 'emptyWin', 'shaped', 'bigRooms'];
const sum = Object.fromEntries(keys.map(k => [k, 0])); let notConn = 0, bad = 0; const styles = {}, mins = {}, maxs = {};
for (let s = 1; s <= N; s++) {
  const f = G.generate(W, H, (s * 7919) >>> 0, 1 + (s % 12));
  const a = analyze(f); styles[f.style] = (styles[f.style] || 0) + 1;
  if (!a.connected) notConn++;
  if (f.map.length !== H || f.map[0].length !== W || !f.rooms.length) bad++;
  for (const k of keys) { sum[k] += a[k]; mins[k] = Math.min(mins[k] ?? 1e9, a[k]); maxs[k] = Math.max(maxs[k] ?? -1e9, a[k]); }
}
const fmt = (k, v) => k === 'cover' || k === 'emptyWin' || k === 'shaped' ? (v * 100).toFixed(1) + '%' : v.toFixed(1);
console.log(`地形メトリクス ${W}x${H} / ${N}シード（平均 [最小〜最大]）`);
const label = { rooms: '部屋数', floor: '床マス', cover: '床の占有率', corr: '通路マス', deadEnd: '通路の行き止まり', hugging: '部屋の壁に沿う通路マス', block: '通路の2×2の塊', border: '外周の床マス(0が正)', maxPath: '開始→最遠部屋の歩数', spread: '部屋のある3×3区画数(最大9)', emptyWin: '8×8の空白窓の割合', shaped: 'L字・十字の部屋の割合', bigRooms: '大部屋(8×5以上)の数' };
for (const k of keys) console.log(`  ${label[k].padEnd(22, '　')} ${fmt(k, sum[k] / N)}  [${fmt(k, mins[k])}〜${fmt(k, maxs[k])}]`);
console.log(`  連結していない階: ${notConn} / 形が不正な階: ${bad} / 構成: ${JSON.stringify(styles)}`);
for (let i = 0; i < ASCII; i++) {
  const seed = ((i + 1) * 104729) >>> 0, f = G.generate(W, H, seed, 1 + i), inR = (x, y) => f.rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  console.log(`\n--- seed ${seed} ${f.style} 部屋${f.rooms.length} ---`);
  console.log(f.map.map((row, y) => row.map((v, x) => v ? (inR(x, y) ? '.' : '#') : ' ').join('').replace(/\s+$/, '')).join('\n'));
}
if (notConn || bad) process.exitCode = 1;
