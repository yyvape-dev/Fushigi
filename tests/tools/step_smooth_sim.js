// 連続移動のカメラのなめらかさを、画面の更新ごとの移動量で比べる（index.html の stepVis の補間だけを再現）。
//   node tests/tools/step_smooth_sim.js         ＝ 固定100ms/マス（旧）と、一歩の間隔に合わせる方式（新）を並べて表示
// 事実の入力：押しっぱなし=120ms間隔、ダッシュ=110ms間隔（index.html / assets/controls-ui.js）。タイマーのゆらぎは仮定（±JIT ms）。
const TS = 32, W = 400, FRAME = 1000 / 60;
function rng(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
function run(mode, interval, jit, seed){
  const r = rng(seed), e = { x: 0, vx: 0 };
  let t = 0, nextIn = 200, lastCam = null; const deltas = [];
  while (t < 2600) {
    if (t >= nextIn) { e.x++; nextIn += interval + (r() * 2 - 1) * jit;
      if (mode === 'new') { const gap = t - (e._stt || -1e9); const raw = gap < 260 ? Math.max(90, Math.min(150, gap * 1.08)) : 100;
        e._stm = e._stm && gap < 260 ? e._stm * .5 + raw * .5 : raw; e._stt = t; } }
    const dt = FRAME + (r() * 2 - 1) * 1.5, dx = e.x - e.vx, d = Math.abs(dx), s0 = dt / (mode === 'new' ? (e._stm || 100) : 100), s = mode === 'new' ? s0 * Math.max(1, d) : s0;
    if (d <= s) e.vx = e.x; else e.vx += dx / d * s;
    const cam = Math.round(W / 2 - (e.vx + .5) * TS);
    if (lastCam !== null && t > 600 && t < 2400) deltas.push(lastCam - cam);
    lastCam = cam; t += dt;
  }
  const n = deltas.length, mean = deltas.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { stalls: deltas.filter(v => v === 0).length, pct: (deltas.filter(v => v === 0).length / n * 100).toFixed(0), sd: sd.toFixed(2), max: Math.max(...deltas) };
}
for (const [label, interval, jit] of [['押しっぱなし120ms', 120, 0], ['押しっぱなし120ms ゆらぎ±10', 120, 10], ['ダッシュ110ms', 110, 0], ['ダッシュ110ms ゆらぎ±10', 110, 10]]) {
  const o = [0, 1, 2, 3, 4].map(s => run('old', interval, jit, s + 1)), n = [0, 1, 2, 3, 4].map(s => run('new', interval, jit, s + 1));
  const avg = (a, k) => (a.reduce((x, y) => x + Number(y[k]), 0) / a.length).toFixed(1);
  console.log(`${label}: 止まる更新 旧${avg(o, 'pct')}% → 新${avg(n, 'pct')}% ／移動量のばらつき(sd) 旧${avg(o, 'sd')} → 新${avg(n, 'sd')} ／最大1更新の移動 旧${avg(o, 'max')}px → 新${avg(n, 'max')}px`);
}
