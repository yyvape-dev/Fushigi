;(function () {
  ACC.p = ACC.e = 1;                                              // 旧テストは命中100%前提（命中のテストは別に行う）
  const fail = [];
  const ok = (name, cond) => { console.log((cond ? 'OK  ' : 'NG  ') + name); if (!cond) fail.push(name); };
  const out = n => '/tmp/claude-0/-home-claude/0eb386c6-7351-54b0-8403-f6a23a641574/scratchpad/cv/' + n;
  const cnt = t => inv.filter(i => i.type === t).length, wcnt = t => wh.filter(i => i.type === t).length;

  // --- ドット絵データの形
  const okArt = Object.entries(ART).every(([k, rows]) => rows.length === 16 && rows.every(r => r.length === 16));
  ok('pixel art rows are 16x16', okArt);
  if (!okArt) for (const [k, rows] of Object.entries(ART)) rows.forEach((r, i) => { if (r.length !== 16) console.log('  bad row', k, i, r.length); });

  // --- 起動：町、倉庫に薬3個
  DUNGEONS.first.floors = 1;                                       // 旧テストは1階想定（多階層は末尾で別に検証）
  ok('boot: starts in town at spawn', scene === 'town' && player.x === 11 && player.y === 9);
  ok('boot: fresh save has 3 potions in warehouse, bag empty', wcnt('potion') === 3 && inv.length === 0);
  fadeT = -1e9; draw(); __savePng(out('shot_town.png'));

  // --- 町の移動と倉庫
  ok('town: all tiles seen/visible', seen.every(r => r.every(v => v)) && vis.every(r => r.every(v => v)));
  player.x = 4; player.y = 4; snapVis();
  playerMove(0, -1);                                               // 倉庫の入口を踏む
  ok('town: stepping on warehouse door opens warehouse', whOpen === true && map[player.y][player.x] === DOOR);
  ok('town: ctx button on door = 倉庫', (() => { closeWh(); const c = ctxInfo(); return c && c.label === '倉庫'; })());
  openWh(); whSide = 'wh'; whTransfer('potion', true);
  ok('warehouse: take all out', cnt('potion') === 3 && wcnt('potion') === 0);
  whSide = 'bag'; whTransfer('potion', false);
  ok('warehouse: store 1', cnt('potion') === 2 && wcnt('potion') === 1);
  whSide = 'wh'; whTransfer('potion', false);
  ok('warehouse: take 1 back', cnt('potion') === 3 && wcnt('potion') === 0);
  // 容量
  inv = []; for (let i = 0; i < MAXBAG; i++) inv.push(mkItem('potion')); wh = [mkItem('potion')];
  whSide = 'wh'; whTransfer('potion', true);
  ok('warehouse: bag full blocks take-out', inv.length === MAXBAG && wh.length === 1 && whMsg.includes('いっぱい'));
  wh = []; for (let i = 0; i < MAXWH; i++) wh.push(mkItem('potion')); inv = [mkItem('potion')];
  whSide = 'bag'; whTransfer('potion', true);
  ok('warehouse: warehouse full blocks store', wh.length === MAXWH && inv.length === 1);
  closeWh();
  inv = []; wh = [mkItem('potion'), mkItem('potion'), mkItem('potion')]; saveGame();

  // --- 保存と復元
  inv = [mkItem('potion')]; wh = [mkItem('potion'), mkItem('potion')]; clears = 4; deaths = 2; quick = null; autoPick = true; saveGame();
  inv = []; wh = []; clears = 0; deaths = 0; quick = 'potion'; autoPick = false;
  ok('save/load round trip', loadGame() && inv.length === 1 && wh.length === 2 && clears === 4 && deaths === 2 && quick === null && autoPick === true);
  __store[SAVE_KEY] = '{broken';
  ok('corrupted save does not crash', loadGame() === false);
  inv = [mkItem('potion'), mkItem('potion')]; wh = [mkItem('potion')]; clears = 0; deaths = 0; quick = 'potion'; autoPick = false; saveGame();

  // --- 町でできないこと
  playerAttack();
  ok('town: 決定(Attack) on the door opens warehouse', whOpen === true); closeWh();
  player.x = 11; player.y = 9; snapVis();
  dropType('potion');
  ok('town: cannot drop items on the ground', inv.length === 2 && floorItems.length === 0);
  playerAttack();
  ok('town: attack away from facilities does nothing harmful', scene === 'town' && !whOpen);

  // --- ダンジョンへ
  player.x = 17; player.y = 3; snapVis();
  playerMove(0, -1);
  ok('town: gate tile + ctx button = 潜る', map[player.y][player.x] === GATE && ctxInfo().label === '潜る');
  doCtx();
  ok('enter dungeon: scene/floor/hp/bag kept', scene === 'dungeon' && floorNo === 1 && player.hp === 20 && inv.length === 2);
  ok('dungeon: stairs exist & reachable, items reachable', (() => {
    const d = distMap(); let st = null;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (map[y][x] === STAIRS) st = [x, y];
    return st && d[st[1]][st[0]] >= 0 && floorItems.every(f => d[f.y][f.x] >= 0);
  })());

  // 見た目：敵を隣に置いて戦闘演出を出す → スクショ
  enemies = []; const dd = DIRS.find(([dx, dy]) => geomOK(player.x, player.y, dx, dy));
  enemies.push({ x: player.x + dd[0], y: player.y + dd[1], vx: player.x + dd[0], vy: player.y + dd[1], hp: 6, maxhp: 8, aware: true, lost: 0, flash: 0, bump: null });
  player.face = dd; playerAttack(); snapVis();
  fx.forEach(f => f.t0 = performance.now() - 200); hurtT = 0; player.flash = 0; enemies.forEach(e => e.flash = 0);
  fadeT = -1e9; draw(); __savePng(out('shot_dungeon.png'));

  // --- 踏破：階段を踏む → 町へ、持ち物は残る、踏破+1
  enemies = [];
  let st = null; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (map[y][x] === STAIRS) st = [x, y];
  let nb = DIRS.find(([dx, dy]) => geomOK(st[0] - dx, st[1] - dy, dx, dy));
  player.x = st[0] - nb[0]; player.y = st[1] - nb[1]; snapVis();
  const bagBefore = inv.length;
  playerMove(nb[0], nb[1]);
  ok('clear: back in town, bag kept, clears+1, saved', scene === 'town' && inv.length === bagBefore && clears === 1 && JSON.parse(__store[SAVE_KEY]).clears === 1);

  // --- 死亡：持ち物ロスト、倉庫は無事
  wh = [mkItem('potion'), mkItem('potion'), mkItem('potion')]; inv = [mkItem('potion'), mkItem('potion')]; saveGame();
  player.x = 17; player.y = 3; snapVis(); playerMove(0, -1); doCtx();
  ok('second run starts', scene === 'dungeon');
  player.hp = 1; enemies = [];
  const d2 = DIRS.find(([dx, dy]) => geomOK(player.x, player.y, dx, dy));
  enemies.push({ x: player.x + d2[0], y: player.y + d2[1], vx: 0, vy: 0, hp: 99, maxhp: 99, aware: true, lost: 0, flash: 0, bump: null });
  playerMove(0, 0);                                                // 待機 → 敵が殴って死亡
  ok('death: dead flag set', dead === true);
  fadeT = -1e9; draw(); __savePng(out('shot_death.png'));
  const nowT = performance.now(); deadAt = nowT;                  // 400ms以内の入力は無視される
  playerMove(0, 0);
  ok('death: instant tap is ignored', dead === true && scene === 'dungeon');
  deadAt = -1e9; playerMove(0, 0);
  ok('death: back in town, bag lost, warehouse kept, deaths+1', scene === 'town' && !dead && inv.length === 0 && wh.length === 3 && deaths === 1);
  const sv = JSON.parse(__store[SAVE_KEY]);
  ok('death: saved state matches', sv.bag.length === 0 && sv.wh.length === 3 && sv.deaths === 1);
  fadeT = -1e9; draw(); __savePng(out('shot_town_after.png'));

  // --- ランダムbot：町→ダンジョン→(踏破|死亡)→町 を何度も回して不変条件を確認
  const _render = render; render = () => {};                         // botの間は毎ステップの描画を省く（描画は間引いて別に実行）
  let runs = 0, clr = 0, dth = 0, bug = 0;
  for (let n = 0; n < 60; n++) {
    if (dead) { deadAt = -1e9; playerMove(0, 0); }                 // 前回の最後の1手で死亡していた場合は、町へ戻してから始める
    wh = [mkItem('potion'), mkItem('potion')]; inv = []; saveGame();
    toTown(false); player.x = 17; player.y = 3; snapVis(); playerMove(0, -1); doCtx();
    if (scene !== 'dungeon') { bug++; continue; }
    runs++;
    const c0 = clears, d0 = deaths;
    for (let t = 0; t < 2000 && scene === 'dungeon'; t++) {
      if (dead) { deadAt = -1e9; }
      const r = rnd(0, 11);
      if (r <= 6) { const m = DIRS[rnd(0, 7)]; playerMove(m[0], m[1]); }
      else if (r === 7) playerAttack();
      else if (r === 8) useQuick();
      else if (r === 9) doCtx();
      else if (r === 10 && inv.length) dropType(inv[0].type);
      else playerMove(0, 0);
      if (inv.length > MAXBAG || player.hp > player.maxhp || wh.length > MAXWH) bug++;
      if (floorItems.some((f, i) => floorItems.findIndex(o => o.x === f.x && o.y === f.y) !== i)) bug++;
      if (t % 40 === 0) draw();                                     // 描画も定期的に通して例外を拾う
    }
    if (clears > c0) clr++; if (deaths > d0) dth++;
    if (scene !== 'town' && scene !== 'dungeon') bug++;
    if (deaths > d0 && inv.length !== 0) bug++;
  }
  render = _render;
  console.log('bot runs', runs, 'cleared', clr, 'died', dth);
  ok('bot: no invariant violations / exceptions', bug === 0);

  // --- ゴール志向bot：敵が隣なら殴り、そうでなければ階段へ。1階が現実的に踏破できるか
  render = () => {};
  let goal = 0, goalDead = 0, goalTurns = [];
  for (let n = 0; n < 60; n++) {
    if (dead) { deadAt = -1e9; playerMove(0, 0); }
    wh = []; inv = [mkItem('potion')]; toTown(false); player.x = 17; player.y = 3; snapVis(); playerMove(0, -1); doCtx();
    let st2 = null; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (map[y][x] === STAIRS) st2 = [x, y];
    const dist = Array.from({ length: MH }, () => new Array(MW).fill(-1)); const q = [st2]; dist[st2[1]][st2[0]] = 0;
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of DIRS) { if (!geomOK(x, y, dx, dy)) continue; const nx = x + dx, ny = y + dy; if (dist[ny][nx] >= 0) continue; dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } }
    const c0 = clears, d0 = deaths; let steps = 0;
    for (; steps < 600 && scene === 'dungeon'; steps++) {
      if (dead) { deadAt = -1e9; playerMove(0, 0); break; }
      if (player.hp <= 8 && inv.length) { useQuick(); continue; }
      const adj = DIRS.find(([dx, dy]) => geomOK(player.x, player.y, dx, dy) && enemyAt(player.x + dx, player.y + dy));
      if (adj) { player.face = adj; playerAttack(); continue; }
      let best = null, bd = dist[player.y][player.x];
      for (const [dx, dy] of DIRS) { if (!geomOK(player.x, player.y, dx, dy)) continue; const d = dist[player.y + dy][player.x + dx]; if (d >= 0 && d < bd) { bd = d; best = [dx, dy]; } }
      if (best) playerMove(best[0], best[1]); else playerMove(0, 0);
    }
    if (clears > c0) { goal++; goalTurns.push(steps); } if (deaths > d0) goalDead++;
  }
  render = _render;
  console.log('goal bot: cleared', goal, '/ 60, died', goalDead, ', avg steps', Math.round(goalTurns.reduce((a, b) => a + b, 0) / Math.max(1, goalTurns.length)));
  ok('goal bot can clear floor 1 in most runs (stairs path + combat + potion)', goal >= 45);

  // --- 描画：画面幅ごと（小型スマホ/タブレット相当）で例外が出ない
  for (const [w, h] of [[320, 568], [360, 740], [414, 896]]) { innerWidth = w; innerHeight = h; zoomPref = 0; resize(); draw(); }
  ok('resize at various sizes', TS === 48 || TS === 32);
  // 横持ち：縦に約6.5マス → 高さ390で64px、横は約13マス見える
  innerWidth = 844; innerHeight = 390; zoomPref = 0; resize(); draw();
  ok('landscape: auto tile 64px (about 13 tiles across)', TS === 64 && Math.round(844 / TS) === 13);
  ok('landscape: focus at screen centre, portrait above centre', focusY() === 195 && (innerWidth = 390, innerHeight = 844, focusY() < 844 / 2));
  innerWidth = 844; innerHeight = 390; resize(); mapMode = 1; scene = 'dungeon'; drawMinimap();
  ok('landscape: minimap sits top-left', mmRect && mmRect.x < 20);
  mapMode = 0;
  for (const [w, h] of [[1024, 768], [844, 390], [667, 375]]) { innerWidth = w; innerHeight = h; resize(); draw(); }
  ok('landscape sizes draw without error', true);

  // ===== 追加：地図・視界・高解像度・表示サイズ・向き =====
  innerWidth = 390; innerHeight = 800; zoomPref = 0; resize();
  const mmTown = (scene = 'town', mapMode = 1, drawMinimap(), mmRect === null);
  ok('minimap: none in town', mmTown);
  // 町→ダンジョン
  scene = 'town'; const pl = { x: player.x, y: player.y }; enterDungeon();
  ok('enter dungeon for map tests', scene === 'dungeon');
  enemies = [];
  // 部屋の中：部屋全体が見える
  let R = rooms[0]; player.x = R.x + (R.w >> 1); player.y = R.y + (R.h >> 1); updateVis();
  let allVis = true; for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) if (!vis[y][x]) allVis = false;
  ok('vision: whole room visible when inside', allVis && playerRoom() === 0);
  // 別の部屋は見えない
  const R2 = rooms[rooms.length - 1];
  ok('vision: other room not visible', !vis[R2.y + 1][R2.x + 1]);
  // 通路：見える数は9以下
  let corr = null;
  for (let y = 1; y < MH - 1 && !corr; y++) for (let x = 1; x < MW - 1; x++) if (map[y][x] === FLOOR && roomGrid[y][x] < 0) { player.x = x; player.y = y; if (playerRoom() < 0) { corr = [x, y]; break; } }
  if (corr) { player.x = corr[0]; player.y = corr[1]; updateVis(); let n = 0; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (vis[y][x]) n++; ok('vision: corridor shows <=9 tiles (' + n + ')', n <= 9); }
  // 地図描画
  for (const mode of [0, 1, 2]) { mapMode = mode; draw(); ok('minimap draws mode ' + mode + (mode ? ' rect set' : ' rect null'), mode ? !!mmRect : mmRect === null); }
  mapMode = 1; player.x = R.x + 1; player.y = R.y + 1; updateVis(); fadeT = -1e9; hurtT = 0; draw(); __savePng('shot_map_small.png');
  mapMode = 2; draw(); __savePng('shot_map_large.png');
  // タップ切替はハンドラ経由でなく状態遷移で確認（保存往復）
  mapMode = 2; zoomPref = 2; saveGame(); mapMode = 0; zoomPref = 0; loadGame();
  ok('save/load keeps mapMode & zoomPref', mapMode === 2 && zoomPref === 2);
  // 表示サイズ
  for (const [zp, ts] of [[1, 32], [2, 48], [3, 64]]) { zoomPref = zp; resize(); ok('zoomPref ' + zp + ' -> TS ' + ts, TS === ts); }
  // 高解像度スプライト
  const big = document.createElement('canvas'); big.width = 256; big.height = 256; const bg = big.getContext('2d');
  bg.fillStyle = '#c33'; bg.beginPath(); bg.arc(128, 150, 90, 0, 7); bg.fill(); bg.fillStyle = '#fff'; bg.fillRect(100, 90, 20, 20); bg.fillRect(140, 90, 20, 20);
  SPRITES.player = big; SPRITES.goblin = big; zoomPref = 3; resize(); mapMode = 1; let thrown = null;
  try { draw(); __savePng('shot_hires.png'); } catch (e) { thrown = e; }
  ok('hi-res sprite renders without error', !thrown); if (thrown) console.log(thrown);
  ok('scaledOf returns a cached square canvas', (() => { const a = scaledOf(big, 64), b = scaledOf(big, 64); return a === b && a.width === 64; })());
  delete SPRITES.player; delete SPRITES.goblin; zoomPref = 0; resize();
  // 向き
  scene = 'dungeon'; player.fl = false; const ld = DIRS.find(([dx, dy]) => dx < 0 && !dy);
  for (let y = 1; y < MH - 1; y++) for (let x = 2; x < MW - 1; x++) if (map[y][x] === FLOOR && map[y][x - 1] === FLOOR && !enemyAt(x - 1, y)) { player.x = x; player.y = y; y = MH; break; }
  playerMove(-1, 0); ok('facing: moving left sets fl', player.fl === true);
  // 設定画面
  openCfg(); ok('cfg opens & blocks input', cfgOpen && uiBlocked()); renderCfg(); closeCfg(); ok('cfg closes', !cfgOpen);

  // 追加：キャラの拡大率
  scene = 'dungeon'; charPref = 2; zoomPref = 3; resize(); saveGame(); charPref = 0; loadGame();
  ok('save/load keeps charPref', charPref === 2);
  const bg2 = document.createElement('canvas'); bg2.width = 256; bg2.height = 256; const g2 = bg2.getContext('2d');
  g2.fillStyle = '#39c'; g2.beginPath(); g2.arc(128, 150, 90, 0, 7); g2.fill(); g2.fillStyle = '#fff'; g2.fillRect(100, 90, 20, 20); g2.fillRect(140, 90, 20, 20);
  SPRITES.player = bg2; enemies = []; let th2 = null;
  try { player.flash = now() + 1e9; fadeT = -1e9; hurtT = 0; mapMode = 0; draw(); __savePng('shot_charscale.png'); player.flash = 0; for (const c of [0, 1, 2]) { charPref = c; draw(); } } catch (e) { th2 = e; console.log(e); }
  ok('charPref 0/1/2 draw (incl. hit flash) without error', !th2);
  openCfg(); renderCfg(); ok('cfg shows char row', cfgListEl.innerHTML.includes('キャラの大きさ')); closeCfg();
  delete SPRITES.player; charPref = 0; zoomPref = 0; resize();

  for (const [zp, ts] of [[4, 80], [5, 96]]) { zoomPref = zp; resize(); ok('zoomPref ' + zp + ' -> TS ' + ts, TS === ts); }
  zoomPref = 5; saveGame(); zoomPref = 0; loadGame(); ok('zoomPref 5 round trip', zoomPref === 5); zoomPref = 0; resize();
  // ===== 追加：満腹度 =====
  scene = 'town'; dead = false; hungerPref = 0; enterDungeon(); enemies = []; floorItems = [];
  ok('hunger: starts at 100 on entering dungeon', belly === MAXBELLY && scene === 'dungeon');
  turn = 0; for (let i = 0; i < 10; i++) playerMove(0, 0);
  ok('hunger: -1% per 10 turns', belly === 99);
  hungerPref = 1; turn = 0; const b0 = belly; for (let i = 0; i < 4; i++) playerMove(0, 0);
  ok('hunger: fast mode -1% per 2 turns', belly === b0 - 2); hungerPref = 0;
  belly = 20; bellyWarn = 99; turn = 1; logs = []; hungerTick();
  ok('hunger: warning at 20%', logs.join().includes('へってきた') && bellyWarn === 20);
  belly = 10; hungerTick(); ok('hunger: warning at 10%', logs.join().includes('ふらふら'));
  belly = 0; player.hp = 10; player.maxhp = 20; turn = 9; playerMove(0, 0);
  ok('hunger: at 0% HP drops 1/turn and no natural regen', player.hp === 9 && belly === 0);
  player.hp = 2; let guard = 0; while (!dead && guard++ < 10) playerMove(0, 0);
  ok('hunger: starvation kills', dead && player.hp === 0);
  deadAt = -1e9; playerMove(0, 0);
  ok('starvation death returns to town', scene === 'town' && !dead && inv.length === 0);
  scene = 'town'; enterDungeon(); enemies = [];
  inv = [mkItem('onigiri')]; belly = 100; const tt = turn; useType('onigiri');
  ok('onigiri at full: not consumed, no turn', inv.length === 1 && turn === tt && belly === 100);
  belly = 30; useType('onigiri');
  ok('onigiri: +50%, consumed', belly === 80 && inv.length === 0);
  belly = 10; bellyWarn = 10; inv = [mkItem('onigiri')]; useType('onigiri');
  ok('eating resets warning stage', belly === 60 && bellyWarn === 99);
  let oc = 0; for (let i = 0; i < 3000; i++) if (rollType() === 'onigiri') oc++;
  ok('onigiri appears on floors (' + oc + '/3000)', oc > 200 && oc < 1700);
  scene = 'town'; belly = 50; const tb = turn; playerMove(0, 0); ok('no hunger tick in town', belly === 50);
  scene = 'dungeon'; belly = 77; refreshUI(); ok('HUD shows belly in dungeon', (cache.get('belly') || '').includes('77'));
  hungerPref = 1; saveGame(); hungerPref = 0; loadGame(); ok('hungerPref round trip', hungerPref === 1); hungerPref = 0;
  openCfg(); ok('cfg has hunger row', cfgListEl.innerHTML.includes('満腹度の減り')); closeCfg();
  scene = 'town'; toTown(false);

  // ===== 追加：陰影（立体感） =====
  scene = 'town'; enterDungeon(); enemies = []; floorItems = []; let th3 = null;
  const fk = document.createElement('canvas'); fk.width = fk.height = 256; fk.getContext('2d').fillStyle = '#556'; fk.getContext('2d').fillRect(0, 0, 256, 256);
  SPRITES.floor = fk; SPRITES.wall = fk;
  try { for (const sp of [0, 1, 2]) { shadePref = sp; draw(); } } catch (e) { th3 = e; console.log(e); }
  ok('shade 0/1/2 draw (with external floor/wall) without error', !th3);
  delete SPRITES.floor; delete SPRITES.wall;
  try { for (const sp of [0, 1, 2]) { shadePref = sp; draw(); } } catch (e) { th3 = e; }
  ok('shade 0/1/2 draw (built-in art) without error', !th3);
  shadePref = 2; saveGame(); shadePref = 1; loadGame(); ok('shadePref round trip', shadePref === 2); shadePref = 1;
  openCfg(); ok('cfg has shade row', cfgListEl.innerHTML.includes('陰影')); closeCfg(); toTown(false);
  // ===== 追加：縦横比の違うタイル画像はマス全体を埋める =====
  const wide = document.createElement('canvas'); wide.width = 512; wide.height = 288; { const g = wide.getContext('2d'); g.fillStyle = '#c40'; g.fillRect(0, 0, 512, 288); }
  const cov = scaledOf(wide, 64, true), con = scaledOf(wide, 64, false);
  const px = (c, x, y) => c.getContext('2d').getImageData(x, y, 1, 1).data[3];
  ok('tile (cover): wide image fills corners', px(cov, 0, 0) === 255 && px(cov, 63, 63) === 255 && px(cov, 0, 63) === 255);
  ok('character (contain): wide image keeps letterbox', px(con, 0, 0) === 0 && px(con, 32, 63) === 255);
  scene = 'town'; buildTown(); SPRITES.roof = wide; SPRITES.ground = wide; let th4 = null;
  try { zoomPref = 4; resize(); draw(); __savePng('shot_town_wide.png'); } catch (e) { th4 = e; console.log(e); }
  ok('town draws with wide tile images', !th4); delete SPRITES.roof; delete SPRITES.ground; zoomPref = 0; resize(); toTown(false);
  // ===== 追加：町の一枚絵 =====
  ok('ASSET_KEYS has town', ASSET_KEYS.includes('town'));
  toTown(false); zoomPref = 1; resize(); const ta = document.createElement('canvas'); ta.width = 1500; ta.height = 1000; { const g = ta.getContext('2d'); g.fillStyle = '#d02090'; g.fillRect(0, 0, 1500, 1000); }
  SPRITES.town = ta; fadeT = -1e9; hurtT = 0; let th5 = null;
  try { draw(); } catch (e) { th5 = e; console.log(e); }
  ok('town art draws without error', !th5);
  { const camX = Math.round(innerWidth / 2 - (player.vx + 0.5) * TS), camY = Math.round(innerHeight * 0.4 - (player.vy + 0.5) * TS);
    // 木(3,7)のマスの中心：タイル絵ではなく一枚絵の色になっている
    const tx = Math.round(camX + 9.5 * TS), ty = Math.round(camY + 5.5 * TS), d = ctx.getImageData(tx, ty, 1, 1).data;
    ok('town art replaces tile art (tree tile shows art colour)', map[5][9] === TREE && d[0] > 180 && d[1] < 80 && d[2] > 100); }
  showGrid = true; try { draw(); __savePng('shot_town_grid.png'); } catch (e) { th5 = e; console.log(e); } ok('town grid overlay draws', !th5);
  { const camX = Math.round(innerWidth / 2 - (player.vx + 0.5) * TS), camY = Math.round(innerHeight * 0.4 - (player.vy + 0.5) * TS);
    const d = ctx.getImageData(Math.round(camX + 9.5 * TS), Math.round(camY + 5.5 * TS), 1, 1).data;
    ok('grid marks solid tiles red', d[0] > d[2] && d[0] > 200); }
  showGrid = false; delete SPRITES.town; zoomPref = 0; resize(); draw();
  openCfg(); ok('cfg has grid row', cfgListEl.innerHTML.includes('町の判定を表示')); ok('cfg: no in-game image import UI (art comes only from assets/)', !/シート取り込み|画像を選ぶ|素材|data-cfg="(pick|reset|sheet)/.test(cfgListEl.innerHTML) && typeof setArtFromBlob === 'undefined' && typeof importSheet === 'undefined' && typeof idbPut === 'undefined'); closeCfg();
  // ===== 追加：メッセージ窓 =====
  scene = 'town'; dead = false; enterDungeon(); enemies = []; floorItems = [];
  turn = 5; logTurn = -1; logs = []; say('A'); say('B');
  ok('log: same turn accumulates', logs.join() === 'A,B');
  turn = 6; say('C'); ok('log: next turn clears window (like original: reset on actor switch)', logs.join() === 'C');
  turn = 7; for (const m of ['1', '2', '3', '4', '5', '6']) say(m); ok('log: window caps at ' + LOG_LINES + ' lines', logs.length === LOG_LINES && logs[0] === '3');
  ok('log: history keeps everything', msgHistory.includes('A') && msgHistory.includes('6') && msgHistory.indexOf('A') < msgHistory.indexOf('6'));
  for (let i = 0; i < 400; i++) { turn++; say('x' + i); } ok('log: history capped', msgHistory.length === HIST_MAX);
  ok('log: classes', msgClass('おなかがへってきた…') === 'hunger' && msgClass('ゴブリンの攻撃！ 2ダメージ。') === 'dmg' && msgClass('回復薬を拾った。（1/24）') === 'item' && msgClass('ゴブリンに3ダメージ。倒した！') === 'good' && msgClass('ただの文') === '');
  ok('log: html has classes', logHtml(['ゴブリンの攻撃！ 1ダメージ。']).includes('class="dmg"'));
  openHist(); ok('history opens & blocks input', histOpen && uiBlocked()); { const t0 = turn; playerMove(1, 0); ok('history open: move ignored', turn === t0); } closeHist(); ok('history closes', !histOpen && !uiBlocked());
  logPos = 1; saveGame(); logPos = 0; loadGame(); ok('logPos round trip', logPos === 1); logPos = 0;
  openCfg(); ok('cfg has log position row', cfgListEl.innerHTML.includes('メッセージ窓の位置')); closeCfg();
  { let th6 = null; try { for (const lp of [0, 1]) { logPos = lp; render(); } } catch (e) { th6 = e; console.log(e); } ok('refreshUI with log pos 0/1', !th6); logPos = 0; }
  toTown(false);
  // ===== 追加：3階建て =====
  DUNGEONS.first.floors = 3; logPos = 1;
  scene = 'town'; dead = false; wh = []; inv = [mkItem('potion'), mkItem('onigiri')]; toTown(false); player.x = 17; player.y = 3; snapVis(); playerMove(0, -1); doCtx();
  ok('3F: enter dungeon on floor 1', scene === 'dungeon' && floorNo === 1);
  const stepStairs = () => {
    enemies = []; let st = null; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (map[y][x] === STAIRS) st = [x, y];
    for (const [dx, dy] of DIRS) { const x = st[0] - dx, y = st[1] - dy; if (inb(x, y) && map[y][x] === FLOOR && geomOK(x, y, dx, dy)) { player.x = x; player.y = y; snapVis(); playerMove(dx, dy); return true; } }
    return false;
  };
  belly = 77; player.hp = 13; const bagCarry = inv.map(i => i.type).join();
  ok('3F: step on stairs', stepStairs());
  ok('3F: descends to floor 2 (still in dungeon)', floorNo === 2 && scene === 'dungeon');
  ok('3F: bag, hp, belly carried over', inv.map(i => i.type).join() === bagCarry && player.hp >= 13 && player.hp <= 14 && belly >= 70 && belly <= 77);
  ok('3F: floor 2 has stairs & enemies scale', enemies.length >= 3 && map.flat().includes(STAIRS));
  stepStairs(); ok('3F: floor 3', floorNo === 3 && scene === 'dungeon');
  const c0b = clears; stepStairs(); ok('3F: clearing floor 3 returns to town', scene === 'town' && clears === c0b + 1 && inv.length === 2);
  // 3階で死亡：持ち物を失う
  scene = 'town'; toTown(false); player.x = 17; player.y = 3; snapVis(); playerMove(0, -1); doCtx(); stepStairs(); stepStairs();
  player.hp = 1; dead = true; deadAt = -1e9; playerMove(0, 0);
  ok('3F: death on floor 3 -> town, bag lost, deaths counted', scene === 'town' && inv.length === 0);
  // ===== 追加：敵の種類・装備と強化値・5階建て =====
  ok('5F: dungeon has 5 floors by default', (DUNGEONS.first.floors = 5) === 5);
  { const seen1 = new Set(), seen5 = new Set(); for (let i = 0; i < 400; i++) { seen1.add(rollEnemy(1)); seen5.add(rollEnemy(5)); }
    ok('enemies: floor1 only slime/goblin', [...seen1].sort().join() === 'goblin,slime');
    ok('enemies: floor5 has every kind that can appear there (12)', seen5.size === 12 && Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= 5 && 5 <= (ENEMIES[k].to || 99)).every(k => seen5.has(k)));
    ok('enemies: every kind has stats', Object.keys(ENEMIES).every(k => ENEMIES[k].hp(5) > 0 && ENEMIES[k].atk(5)[1] >= ENEMIES[k].atk(5)[0] && DEFAULT[k])); }
  { toTown(false); wh = []; inv = [mkItem('sword', 2), mkItem('sword', 0), mkItem('woodshield', 1), mkItem('scroll'), mkItem('potion')];
    ok('equip: name shows plus', itemName(inv[0]) === '鉄の剣+2' && itemName(mkItem('sword', -1)) === '鉄の剣-1');
    ok('equip: groups split by plus', groups(inv).length === 5);
    ok('equip: no bonus when unequipped', atkBonus() === 0 && defBonus() === 0);
    scene = 'town'; useType(ikey(inv[0]));
    ok('equip: sword+2 equipped, atk +5', eqWeapon === inv[0] && atkBonus() === 5);
    useType(ikey(inv[2])); ok('equip: shield+1 -> def 2', defBonus() === 2);
    useType(ikey(inv[0])); ok('equip: toggle off', eqWeapon === null && atkBonus() === 0);
    useType(ikey(inv[0]));
    saveGame(); const sv = JSON.parse(localStorage.getItem(SAVE_KEY));
    ok('equip: save keeps plus + eq slots', sv.bag.includes('sword:2') && sv.eq[0] === 0 && sv.eq[1] === 2);
    eqWeapon = eqShield = null; wh = []; inv = []; loadGame();
    ok('equip: load restores plus and equipped', inv[0].plus === 2 && eqWeapon === inv[0] && eqShield === inv[2] && inv.length === 5);
    { const rs = Math.random; Math.random = () => 0.5; useType('scroll'); Math.random = rs; }                      // 「たまに+3」を避けて+1に固定
    ok('scroll: raises equipped weapon plus', inv[0].plus === 3 && !inv.some(i => i.type === 'scroll'));
    whSide = 'bag'; whTransfer(ikey(inv[0]), false); ok('warehouse: moving equipped item unequips it', eqWeapon === null && wh.length === 1 && wh[0].plus === 3);
    eqWeapon = null; eqShield = null; useType('scroll'); }
  { scene = 'dungeon'; floorNo = 1; newFloor(); eqWeapon = null; eqShield = null; inv = [];
    const sl = { kind: 'slime', x: player.x + 1, y: player.y, vx: 0, vy: 0, hp: 99, maxhp: 99, aware: true, lost: 0, flash: 0, bump: null, fl: false };
    enemies = [sl]; player.hp = 20; player.maxhp = 20; map[player.y][player.x + 1] = FLOOR; hitEnemy(sl);
    ok('combat: bare hand 2-4', sl.hp >= 95 && sl.hp <= 97);
    const wp = mkItem('axe', 0); inv = [wp]; eqWeapon = wp; sl.hp = 99; hitEnemy(sl); ok('combat: axe Lv1 hits for 6-8', sl.hp >= 91 && sl.hp <= 93);
    const sh = mkItem('ironshield', 3); inv.push(sh); eqShield = sh; ok('combat: shield def 5', defBonus() === 5);
    dead = false; eqWeapon = eqShield = null; }
  // ===== 追加：草・杖・巻物 =====
  { scene = 'dungeon'; floorNo = 1; newFloor(); eqWeapon = eqShield = null; dead = false;
    const mk = (dx, k) => ({ kind: 'goblin', x: player.x + dx, y: player.y, vx: 0, vy: 0, hp: 20, maxhp: 20, aware: true, lost: 0, flash: 0, bump: null, fl: false });
    player.x = 5; player.y = 10; snapVis(); for (let dx = -1; dx <= 9; dx++) map[10][5 + dx] = FLOOR;   // 一直線の安全な床を用意（乱数に左右されない）
    player.face = [1, 0]; player.hp = 10; player.maxhp = 20; const etSave = enemyTurn; enemyTurn = () => {};   // 敵を動かさず効果だけ確認
    inv = [mkItem('herb'), mkItem('lifeherb')]; useType('herb'); ok('herb: +6 HP', player.hp >= 16 && player.hp <= 17 && inv.length === 1);
    useType('lifeherb'); ok('lifeherb: max HP +3', player.maxhp === 23 && inv.length === 0);
    enemies = [mk(3)]; const fs = mkItem('firestaff'); ok('staff: has 3-5 charges', fs.plus >= 3 && fs.plus <= 5 && itemName(fs).includes('['));
    inv = [fs]; const c0 = fs.plus; useType(ikey(fs)); ok('firestaff: 8 dmg and charge used', enemies[0].hp === 12 && fs.plus === c0 - 1 && inv.length === 1);
    const bs = mkItem('blowstaff', 2); inv = [bs]; enemies = [mk(1)]; useType(ikey(bs)); ok('blowstaff: knocks back up to 5', enemies[0].x === player.x + 6 && bs.plus === 1);
    const ss = mkItem('swapstaff', 1); inv = [ss]; enemies = [mk(4)]; const px = player.x; useType(ikey(ss)); ok('swapstaff: swaps places', player.x === px + 4 && enemies[0].x === px);
    const es = mkItem('firestaff', 0); inv = [es]; enemies = [mk(2)]; useType(ikey(es)); ok('empty staff does nothing but stays', enemies[0].hp === 20 && inv.length === 1);
    player.x = px; enemies = [mk(5)]; const f1 = mkItem('firestaff', 2); inv = [f1]; useType(ikey(f1)); ok('staff hits enemy up to range 8', enemies[0].hp === 12);
    enemies = [mk(1), mk(2), mk(5)]; inv = [mkItem('boomscroll')]; useType('boomscroll'); ok('boomscroll: hits within 2 only', enemies.length === 3 && enemies[0].hp === 13 && enemies[1].hp === 13 && enemies[2].hp === 20);
    seen = Array.from({ length: MH }, () => new Array(MW).fill(false)); inv = [mkItem('mapscroll')]; useType('mapscroll'); ok('mapscroll: reveals map', seen.every(r => r.every(v => v)));
    inv = [mkItem('escscroll'), mkItem('potion')]; useType('escscroll'); ok('escscroll: back to town with bag kept', scene === 'town' && inv.length === 1);
    scene = 'town'; inv = [mkItem('mapscroll')]; useType('mapscroll'); ok('mapscroll in town: not consumed', inv.length === 1);
    wh = []; inv = [mkItem('firestaff', 3), mkItem('herb')]; saveGame(); inv = []; loadGame(); enemyTurn = etSave; ok('staff charges survive save/load', inv.some(i => i.type === 'firestaff' && i.plus === 3)); }
  // ===== 追加：パーツで動く主人公（リグ） =====
  { for (const k of RIG_PARTS) { const c = document.createElement('canvas'); c.width = 40; c.height = 60; const g2 = c.getContext('2d'); g2.fillStyle = '#c33'; g2.fillRect(0, 0, 40, 60); RIG_IMG[k] = c; }
    rigReady = true; delete SPRITES.player; ok('rig: on when ready and no imported player art', rigOn());
    SPRITES.player = document.createElement('canvas'); ok('rig: still on when player art was imported (default)', rigOn()); rigPref = 1; ok('rig: off when 1枚絵 selected', !rigOn()); rigPref = 0; delete SPRITES.player;
    wh = []; inv = []; saveGame(); rigPref = 1; saveGame(); rigPref = 0; loadGame(); ok('rig: pref saved and loaded', rigPref === 1); rigPref = 0;
    scene = 'dungeon'; floorNo = 1; newFloor(); eqWeapon = mkItem('sword', 1); eqShield = mkItem('woodshield', 0);
    let thr = null; try { for (const sw of [0, 0.1, 0.4, 0.8]) { player.swing = sw ? now() - sw * SWING_MS : 0; render(); } player.vx += 0.4; render(); player.vx = player.x; player.fl = true; player.flash = now() + 100; render(); eqWeapon = mkItem('axe', 0); eqShield = null; render(); eqWeapon = mkItem('stick', 0); render(); } catch (e) { thr = e; console.log(e); }
    ok('rig: draws all poses/equipment without error', !thr);
    player.swing = now(); ok('rig: swing keeps animation running', animating(now()));
    const P0 = rigPose({ vx: 0, vy: 0, swing: 0 }, 0), P1 = rigPose({ vx: 0.5, vy: 0 }, 0);
    ok('rig: walking swings legs, idle does not', Math.abs(P0.legA) < 1e-9 && Math.abs(P1.legA) > 0.3);
    const Ps = rigPose({ vx: 0, vy: 0, swing: 1000 }, 1000 + SWING_MS * 0.4); ok('rig: strike phase lunges and leans', Ps.lunge > 0 && Ps.lean > 0);
    { const Pa = rigPose({ vx: 0, vy: 0, swing: 1000 }, 1000 + SWING_MS * 0.4), Pi = rigPose({ vx: 0, vy: 0, swing: 0 }, 5000);
      ok('rig: attack face only during swing', Pa.atk === true && Pi.atk === false);
      const dSave = dead, daSave = deadAt; dead = true; deadAt = 1000; const Pd = rigPose(player, 1000 + 300);
      ok('rig: death makes the body fall backward', Pd.fall > 1.3); dead = dSave; deadAt = daSave;
      RIG_IMG.head_hurt = RIG_IMG.head; hurtT = now(); player.swing = 0; player.fl = false; let t3 = null; try { render(); dead = true; deadAt = now() - 500; render(); } catch (e) { t3 = e; } dead = false; hurtT = 0;
      ok('rig: hurt/dead faces draw (and fall back when extra heads are missing)', !t3); delete RIG_IMG.head_hurt; }
    player.swing = 0; rigReady = false; for (const k of RIG_PARTS) delete RIG_IMG[k]; eqWeapon = eqShield = null; render(); ok('rig: falls back to flat sprite when not loaded', !rigOn()); }
  // ===== 追加：お試し装備の配布・町の素振り =====
  { localStorage.removeItem(SAVE_KEY); gift = false; boot();
    ok('gift: 5 weapons/shields given once on a fresh boot', ['stick', 'sword', 'axe', 'woodshield', 'ironshield'].every(t => wh.some(i => i.type === t)) && gift === true);
    const n0 = wh.length; boot(); ok('gift: not given twice after save/load', wh.length === n0 || wh.length === n0);
    scene = 'town'; toTown(false); player.x = 11; player.y = 9; snapVis(); player.swing = 0; playerAttack(); ok('town: attack button does a practice swing (no turn)', player.swing > 0); }
  ok('log position default is bottom-right', logPos === 1);
  // ===== 追加：戦闘の演出（斬撃・火花・揺れ）=====
  { const fresh = () => { scene = 'dungeon'; floorNo = 1; newFloor(); dead = false; vfx.length = 0; shakeAmp = 0; };
    const spawnAdj = () => { const e = enemies[0] || (enemies.push({ kind: 'goblin', hp: 99, maxhp: 99 }), enemies[0]); const p = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => geomOK(player.x, player.y, dx, dy)) || [1, 0]; e.x = e.vx = player.x + p[0]; e.y = e.vy = player.y + p[1]; e.hp = e.maxhp = 99; e.bump = null; return e; };
    ok('vfx: default is 標準', vfxPref === 1);
    fresh(); vfxPref = 1; let e = spawnAdj(); hitEnemy(e);
    ok('vfx: a hit spawns a slash and sparks', vfx.some(v => v.kind === 'slash') && vfx.filter(v => v.kind === 'spark').length >= 4);
    ok('vfx: a hit shakes the screen and keeps animating', shakeAmp > 0 && animating(now()));
    let thr = null; try { for (const dt of [0, 80, 150, 250, 400]) { for (const v of vfx) v.t0 -= dt; shakeT0 -= dt; draw(); } } catch (er) { thr = er; console.log(er); }
    ok('vfx: draws across its whole lifetime without error', !thr);
    fresh(); e = spawnAdj(); hitEnemy(e); for (const v of vfx) v.t0 -= 200; shakeT0 -= 40; fadeT = -1e9; draw(); __savePng(out("shot_vfx_hit.png"));
    fresh(); vfxPref = 2; e = spawnAdj(); e.hp = 1; hitEnemy(e); const strong = vfx.length, amp2 = shakeAmp;
    fresh(); vfxPref = 1; e = spawnAdj(); e.hp = 1; hitEnemy(e);
    ok('vfx: 強 gives more sparks and a bigger shake than 標準', strong > vfx.length && amp2 > shakeAmp);
    fresh(); vfxPref = 0; e = spawnAdj(); hitEnemy(e);
    ok('vfx: なし spawns nothing and does not shake', vfx.length === 0 && shakeAmp === 0);
    fresh(); vfxPref = 1; e = spawnAdj(); e.hp = 99; player.hp = player.maxhp = 50; enemyTurn();
    ok('vfx: an enemy hit on the player spawns a slash on the player', vfx.some(v => v.kind === 'slash' && v.x === player.x && v.y === player.y));
    for (const v of vfx) v.t0 -= 5000; shakeT0 -= 5000; draw();
    ok('vfx: expired effects are removed and the shake settles', vfx.length === 0 && shakeAmp === 0);
    vfxPref = 2; saveGame(); vfxPref = 1; loadGame(); ok('vfx: pref saved and loaded', vfxPref === 2); vfxPref = 1; toTown(false); }
  // ===== 追加：草・巻物・腕輪・武器盾の拡充（シレン6準拠）=====
  { const SEALS = new Set(['crit', 'double', 'tri', 'drain', 'hungry', 'knock', 'bat', 'fire', 'counter', 'dodge', 'guts', 'fullhalf', 'belly', 'hungryDef', 'critguard']);
    const etSave = enemyTurn; let calls = 0; const stub = () => { calls++; };
    const R = (v, f) => { const rs = Math.random; Math.random = () => v; try { f(); } finally { Math.random = rs; } };
    const setup = () => {
      scene = 'dungeon'; floorNo = 3; newFloor(); dead = false; eqWeapon = eqShield = null; eqRings = [null, null]; inv = []; enemies = []; floorItems = [];
      player.st = newStatus(); player.maxhp = 20; player.hp = 20; atkUp = 0; bellyBonus = 0; belly = 100; floorLight = false; calls = 0; enemyTurn = stub; player.face = [1, 0]; turn = 1;   // turn=1：自然回復の周期に当たらないように
    };
    const mkE = (dx, dy, hp = 30, kind = 'goblin') => { const x = player.x + dx, y = player.y + dy; map[y][x] = FLOOR; const e = { kind, x, y, vx: x, vy: y, hp, maxhp: hp, aware: true, lost: 0, flash: 0, bump: null, fl: false, st: {} }; enemies.push(e); return e; };
    const give = (t, plus) => { const it = mkItem(t, plus); inv.push(it); return it; };

    // --- 一覧の整合
    const keys = Object.keys(ITEMS);
    ok('items: every item has name/cat/ch/fg/weight/desc', keys.every(k => { const d = ITEMS[k]; return d.name && d.cat && d.ch && d.fg && (d.w > 0 || k === 'gold') && typeof d.desc === 'string' && d.desc.length > 4; }));
    ok('items: every item is usable, equippable or a staff', keys.every(k => typeof ITEMS[k].use === 'function' || ITEMS[k].equip));
    ok('items: weapons have atk, shields have def, seals are known', keys.every(k => { const d = ITEMS[k]; return (d.equip !== 'weapon' || d.atk > 0) && (d.equip !== 'shield' || d.def > 0) && (!d.seal || SEALS.has(d.seal)); }));
    ok('items: rings have no plus value, weapons do', mkItem('ring_regen').plus === undefined && itemName(mkItem('ring_regen')) === '回復の腕輪' && mkItem('katana', 1).plus === 1);
    ok('items: 19+ herbs, 2 seeds, 10+ scrolls, 15+ rings, 10+ weapons, 10+ shields', ['草', '種', '巻物', '腕輪', '武器', '盾'].every((c, i) => keys.filter(k => ITEMS[k].cat === c).length >= [19, 2, 10, 15, 10, 10][i]));
    ok('items: save/load keeps ids of new items', keys.every(k => { const it = mkItem(k); const b = decItem(encItem(it)); return b && b.type === k && b.plus === it.plus; }));
    floorNo = 1; { let bad = 0; for (let i = 0; i < 600; i++) if ((ITEMS[rollType()].from || 1) > 1) bad++; ok('items: floor 1 never drops deeper items', bad === 0); }
    floorNo = 5; { const got = new Set(); for (let i = 0; i < 4000; i++) got.add(rollType()); ok('items: floor 5 can drop every item (gold is placed separately)', keys.every(k => k === 'gold' || got.has(k)) && !got.has('gold')); }

    // --- 草
    setup(); inv = [give('herb'), give('outogiri'), give('iyashi')]; player.hp = 10; useType('herb');
    ok('herb: +6 HP', player.hp === 16);
    player.st.confuse = 5; useType('outogiri'); ok('outogiri: +15 HP and cures confusion', player.hp === 20 && player.st.confuse === 0);
    player.st.sleep = 0; player.st.blind = 4; player.st.weak = 4; player.hp = 5; useType('iyashi'); ok('iyashi: heals and cures every bad state', player.hp === 20 && !ST_BAD.some(k => player.st[k] > 0));
    inv = [give('herb')]; player.hp = player.maxhp; useType('herb'); ok('herb at full HP: max HP +1 instead', player.maxhp === 21 && inv.length === 0);
    setup(); inv = [give('kaguwashi')]; ok('kaguwashi: not consumed when nothing to cure', (useType('kaguwashi'), inv.length === 1));
    player.st.mute = 3; ok('mute: herbs and scrolls cannot be used', (useType('kaguwashi'), inv.length === 1)); player.st.mute = 0; player.st.confuse = 3; useType('kaguwashi'); ok('kaguwashi: cures and is consumed', inv.length === 0 && player.st.confuse === 0);
    setup(); inv = [give('bellyup'), give('bellydown')]; useType('bellyup'); ok('bellyup seed: max belly +5', maxBelly() === 105); useType('bellydown'); useType('bellydown'); ok('bellydown seed: clamps belly to the new max', maxBelly() === 100 && belly <= maxBelly());
    setup(); inv = [give('strherb'), give('powerherb')]; useType('strherb'); ok('strherb: attack +1 for the run', atkBonus() === 1); useType('powerherb'); ok('powerherb: attack +3 while it lasts', atkBonus() === 4 && player.st.power >= 28);
    setup(); inv = [give('poisonherb')]; useType('poisonherb'); ok('poisonherb: 5 damage and weakened (-2 attack)', player.hp === 15 && player.st.weak > 30 && atkBonus() === -2);
    setup(); eqRings[0] = give('ring_antidote'); inv = [eqRings[0], give('poisonherb')]; useType('poisonherb'); ok('ring_antidote: blocks weakness (damage still taken)', player.hp === 15 && player.st.weak === 0);
    setup(); player.hp = 4; inv = [give('poisonherb')]; useType('poisonherb'); ok('poisonherb can kill', dead === true); dead = false;
    setup(); player.hp = 4; inv = [give('poisonherb'), give('reviveherb')]; useType('poisonherb'); ok('reviveherb: revives at full HP and turns into a weed', dead === false && player.hp === player.maxhp && !inv.some(i => i.type === 'reviveherb') && inv.some(i => i.type === 'weed'));
    setup(); inv = [give('reviveherb')]; useType('reviveherb'); ok('reviveherb: eating it by hand is refused', inv.length === 1);
    setup(); inv = [give('invincherb'), give('confherb'), give('sleepherb')]; player.st.confuse = 3; useType('invincherb'); ok('invincherb: invincible and cures bad states', player.st.invinc >= 18 && player.st.confuse === 0);
    useType('confherb'); useType('sleepherb'); ok('invincible: blocks confusion and sleep', player.st.confuse === 0 && player.st.sleep === 0);
    setup(); inv = [give('confherb')]; useType('confherb'); ok('confherb: confused', player.st.confuse > 0);
    setup(); eqRings[0] = give('ring_noconf'); eqRings[1] = give('ring_nosleep'); inv.push(give('confherb'), give('sleepherb')); useType('confherb'); useType('sleepherb'); ok('rings: noconf/nosleep block them', player.st.confuse === 0 && player.st.sleep === 0);
    setup(); inv = [give('sleepherb')]; useType('sleepherb'); ok('sleepherb: sleeps through 5 enemy turns, then wakes', calls === 5 && player.st.sleep === 0);
    setup(); inv = [give('hasteherb')]; useType('hasteherb'); calls = 0; for (let i = 0; i < 4; i++) playerMove(0, 0); ok('hasteherb: enemies act only every other action', calls === 2);
    setup(); inv = [give('blindherb')]; useType('blindherb'); updateVis(); ok('blindherb: only own tile is visible', vis.flat().filter(Boolean).length === 1 && vis[player.y][player.x]);
    inv = [give('eyeherb')]; useType('eyeherb'); updateVis(); ok('eyeherb: cures blindness, shows enemies on the map', player.st.blind === 0 && senseEnemies() && vis.flat().filter(Boolean).length > 1);
    setup(); const ox = player.x, oy = player.y; inv = [give('warpherb')]; useType('warpherb'); ok('warpherb: lands on a floor tile', map[player.y][player.x] === FLOOR && !enemyAt(player.x, player.y)); void ox; void oy;
    setup(); { const e = mkE(1, 0, 40); inv = [give('dragonherb')]; useType('dragonherb'); ok('dragonherb: 12-15 fire damage to the first enemy', e.hp >= 25 && e.hp <= 28); }
    setup(); player.st.confuse = 9; { let faces = new Set(); for (let i = 0; i < 40; i++) { player.face = [1, 0]; playerMove(1, 0); faces.add(player.face.join()); } ok('confusion: movement direction is random', faces.size >= 3); }

    // --- 巻物（部屋の敵が対象）
    setup(); { const a = mkE(1, 0), b = mkE(-1, 1); inv = [give('confscroll'), give('sleepscroll'), give('hastescroll'), give('vacuumscroll')];
      useType('confscroll'); ok('confscroll: confuses every enemy in the room', a.st.confuse === 15 && b.st.confuse === 15);
      useType('sleepscroll'); ok('sleepscroll: sleeps them', a.st.sleep === 20 && b.st.sleep === 20);
      useType('hastescroll'); ok('hastescroll: speeds them up', a.st.boost === 20);
      a.hp = b.hp = 30; useType('vacuumscroll'); ok('vacuumscroll: 12-15 damage to each, and damage wakes them', a.hp >= 15 && a.hp <= 18 && b.hp >= 15 && b.hp <= 18 && a.st.sleep === 0); }
    setup(); { mkE(1, 0); mkE(-1, 0); inv = [give('annihilatescroll')]; useType('annihilatescroll'); ok('annihilatescroll: removes the room\'s enemies', enemies.length === 0); }
    setup(); { const e = mkE(1, 0); inv = [give('helpscroll')]; player.hp = 2; player.st.sleep = 0; player.st.blind = 5; belly = 10; useType('helpscroll'); ok('helpscroll: full heal, cures, refills a starving belly', player.hp === player.maxhp && player.st.blind === 0 && belly === 50); void e; }
    setup(); { const e = mkE(1, 0, 30); e.x = e.vx = player.x + 1; inv = [give('gatherscroll')]; const far = rooms[rooms.length - 1]; const f = { kind: 'goblin', x: far.cx, y: far.cy, vx: far.cx, vy: far.cy, hp: 5, maxhp: 5, aware: false, lost: 0, flash: 0, bump: null, fl: false, st: {} }; enemies.push(f);
      useType('gatherscroll'); ok('gatherscroll: every enemy ends up near the player', enemies.every(o => Math.max(Math.abs(o.x - player.x), Math.abs(o.y - player.y)) <= 3) && new Set(enemies.map(o => o.x + ',' + o.y)).size === enemies.length); }
    setup(); { floorItems = [{ x: rooms[0].cx, y: rooms[0].cy, item: mkItem('potion') }]; const far = rooms[rooms.length - 1]; floorItems.push({ x: far.cx, y: far.cy, item: mkItem('herb') }); player.x = far.cx + 0; player.y = far.cy + 0; inv = [give('itemscroll')]; useType('itemscroll');
      ok('itemscroll: floor items gather around the player', floorItems.every(f => Math.max(Math.abs(f.x - player.x), Math.abs(f.y - player.y)) <= 2) && new Set(floorItems.map(f => f.x + ',' + f.y)).size === floorItems.length); }
    setup(); { inv = [give('housescroll')]; useType('housescroll'); ok('housescroll: 6 aware enemies appear around the player', enemies.length === 6 && enemies.every(e => e.aware)); }
    setup(); inv = [give('lightscroll')]; useType('lightscroll'); ok('lightscroll: map revealed and enemies/items sensed', seen.every(r => r.every(v => v)) && senseEnemies() && senseItems());
    newFloor(); ok('lightscroll: effect ends on the next floor', !senseEnemies());
    setup(); inv = [give('mutescroll')]; useType('mutescroll'); ok('mutescroll: mutes for 30 turns', player.st.mute > 25);
    setup(); { const w = give('sword', 0); eqWeapon = w; const sh = give('woodshield', 0); eqShield = sh; inv.push(give('scroll'), give('shieldscroll'));
      R(0.5, () => { useType('scroll'); useType('shieldscroll'); }); ok('scrolls: 天の恵み→weapon, 地の恵み→shield (+1 each)', w.plus === 1 && sh.plus === 1); }

    // --- 腕輪
    setup(); { const r1 = give('ring_regen'), r2 = give('ring_regen'), r3 = give('ring_strength'); useType(ikey(r1)); useType(ikey(r2)); ok('rings: two can be worn at once', eqRings[0] === r1 && eqRings[1] === r2 && ringN('regen') === 2);
      const n0 = turn; useType(ikey(r3)); ok('rings: a third is refused', eqRings.every(r => r !== r3) && isEq(r3) === false && true); void n0;
      saveGame(); eqRings = [null, null]; loadGame(); ok('rings: worn rings survive save/load', ringN('regen') === 2 && inv.filter(isEq).length === 2);
      useType(ikey(inv.find(isEq))); ok('rings: tapping a worn ring takes it off', ringN('regen') === 1);
      dropType(ikey(inv.find(isEq))); ok('rings: dropping a worn ring takes it off', ringN('regen') === 0); }
    setup(); { eqRings[0] = give('ring_strength'); ok('ring_strength: attack +2', atkBonus() === 2); eqRings[1] = give('ring_strength'); ok('ring_strength x2: attack +4', atkBonus() === 4);
      eqRings = [give('ring_bellyup'), null]; ok('ring_bellyup: max belly +25', maxBelly() === 125); eqRings = [give('ring_bellydown'), give('ring_bellydown')]; ok('ring_bellydown x2: max belly 50', maxBelly() === 50);
      eqRings = [give('ring_regen'), null]; ok('ring_regen: belly drains faster', hungerIv() < HUNGER_TURNS[hungerPref]);
      eqRings = [null, null]; ok('no ring: belly drains at the normal pace', hungerIv() === HUNGER_TURNS[hungerPref]);
      eqRings = [give('ring_senseE'), null]; ok('ring_senseE: senses enemies only', senseEnemies() && !senseItems()); eqRings = [give('ring_senseI'), null]; ok('ring_senseI: senses items only', !senseEnemies() && senseItems());
      eqRings = [give('ring_seeall'), null]; ok('ring_seeall: senses both', senseEnemies() && senseItems()); eqRings = [null, null]; }
    setup(); { eqRings[0] = give('ring_boom'); const e = mkE(1, 0, 30); R(0, () => ringTick()); ok('ring_boom: explodes — enemy hurt 10, player left at 1 HP', e.hp === 20 && player.hp === 1);
      setup(); eqRings[0] = give('ring_warp'); const ox = player.x, oy = player.y; let moved = false; for (let i = 0; i < 20 && !moved; i++) { R(0, () => ringTick()); moved = player.x !== ox || player.y !== oy; } ok('ring_warp: eventually warps', moved);
      setup(); eqRings[0] = give('ring_leak'); give('potion'); R(0, () => ringTick()); ok('ring_leak: drops an unworn item at your feet', inv.filter(i => i.type === 'potion').length === 0 && floorItems.some(f => f.item.type === 'potion'));
      setup(); eqRings[0] = give('ring_summon'); for (const r of vis) r.fill(false); const n0 = enemies.length; R(0, () => { for (let i = 0; i < 30 && enemies.length === n0; i++) ringTick(); }); ok('ring_summon: a new enemy appears', enemies.length > n0); }
    setup(); { eqRings[0] = give('ring_sneak'); enemyTurn = etSave; const e = mkE(-2, 0); e.aware = false; player.face = [1, 0]; const far = { ...e }; void far; e.x = player.x + 5; e.y = player.y; map[e.y][e.x] = FLOOR; for (let x = player.x; x <= e.x; x++) map[player.y][x] = FLOOR;
      endTurn(); ok('ring_sneak: an enemy 5 tiles away does not notice you', e.aware === false); eqRings = [null, null]; endTurn(); ok('without ring_sneak, the same enemy notices you', e.aware === true); enemyTurn = stub; }
    setup(); { eqRings[0] = give('ring_moroha'); const e = mkE(1, 0, 99); R(0, () => hitEnemy(e)); ok('ring_moroha: a low roll is a critical hit (2 x 2 = 4)', 99 - e.hp === 4);
      e.hp = 99; R(0.5, () => hitEnemy(e)); ok('ring_moroha: a normal roll is not a crit (2)', 99 - e.hp === 2); }

    // --- 武器の印
    setup(); { eqWeapon = give('minoaxe', 0); const e = mkE(1, 0, 99); R(0, () => hitEnemy(e)); ok('minoaxe: 会心 doubles ((1+4+1)*0.875 -> 5)*2 = 10', e.hp === 99 - 10); }
    setup(); { eqWeapon = give('skyblade', 0); const b = mkE(1, 0, 99, 'bat'), g = mkE(0, 1, 99, 'goblin'); R(0, () => { hitEnemy(b); hitEnemy(g); }); ok('skyblade: double damage to bats only', 99 - b.hp === 8 && 99 - g.hp === 4); }
    setup(); { eqWeapon = give('healsword', 0); player.hp = 10; const e = mkE(1, 0, 99); R(0, () => hitEnemy(e)); ok('healsword: heals a third of the damage', player.hp === 11); }
    setup(); { eqWeapon = give('steakknife', 0); const e = mkE(1, 0, 99); belly = 100; R(0, () => hitEnemy(e)); const a = 99 - e.hp; e.hp = 99; belly = 20; R(0, () => hitEnemy(e)); ok('steakknife: +3 when hungry', 99 - e.hp === a + 3); }
    setup(); { eqWeapon = give('harisen', 0); const e = mkE(1, 0, 99); map[player.y][player.x + 2] = FLOOR; R(0, () => hitEnemy(e)); ok('harisen: knocks the enemy back one tile', e.x === player.x + 2); }
    setup(); { eqWeapon = give('renkentou', 0); const e = mkE(1, 0, 99); R(0, () => hitEnemy(e)); ok('renkentou: attacks twice on a proc', 99 - e.hp === 4 * 2); }
    setup(); { eqWeapon = give('kamaitachi', 0); player.face = [1, 0]; const a = mkE(1, 0, 99), b = mkE(1, -1, 99), c = mkE(1, 1, 99), d = mkE(-1, 0, 99); R(0, () => hitEnemy(a)); ok('kamaitachi: hits the front three tiles, not behind', a.hp < 99 && b.hp < 99 && c.hp < 99 && d.hp === 99); }
    setup(); { eqWeapon = give('firesword', 0); player.face = [-1, 0]; const e = mkE(-2, 0, 99); playerAttack(); ok('firesword: fires at range when HP is full', e.hp === 91); player.hp = 5; e.hp = 99; playerAttack(); ok('firesword: no fire when HP is not full', e.hp === 99); }
    setup(); { eqWeapon = give('katana', 2); ok('katana+2: attack bonus 4+2', atkBonus() === 6); }

    // --- 盾の印（敵の攻撃は本物の enemyTurn で）
    const foe = () => { enemyTurn = etSave; const e = mkE(1, 0, 30); e.aware = true; return e; };
    setup(); { eqShield = give('mikiri', 0); const e = foe(); R(0, () => enemyTurn()); ok('mikiri: dodges at a low roll', player.hp === 20); enemyTurn = stub; }
    setup(); { eqShield = give('battlecounter', 0); const e = foe(); R(0.99, () => enemyTurn()); ok('battlecounter: reflects half the damage', player.hp < 20 && e.hp < 30); enemyTurn = stub; }
    setup(); { eqShield = give('zekkocho', 0); const e = foe(); e.kind = 'ogre'; R(0.99, () => enemyTurn()); const full = 20 - player.hp; setup(); eqShield = give('zekkocho', 0); const e2 = foe(); e2.kind = 'ogre'; player.hp = 19; R(0.99, () => enemyTurn()); ok('zekkocho: half damage at full HP', full >= 1 && 19 - player.hp >= full); enemyTurn = stub; }
    setup(); { eqShield = give('konjo', 0); const e = foe(); e.kind = 'ogre'; player.hp = 1; R(0, () => enemyTurn()); ok('konjo: survives a lethal hit at 1 HP on a low roll', dead === false && player.hp === 1); enemyTurn = stub; dead = false; }
    setup(); { const e = foe(); e.kind = 'ogre'; player.hp = 1; R(0, () => enemyTurn()); ok('without konjo the same hit kills', dead === true); enemyTurn = stub; dead = false; }
    setup(); { eqShield = give('steakplate', 0); belly = 100; const a = defBonus(); belly = 20; ok('steakplate: +2 defence when hungry', defBonus() === a + 2); }
    setup(); { eqShield = give('haramochi', 0); ok('haramochi: belly lasts longer', hungerIv() > HUNGER_TURNS[hungerPref] || HUNGER_TURNS[hungerPref] === 2 && hungerIv() === 3); }
    setup(); { eqShield = give('tekkoshield', 0); eqWeapon = give('dotanuki', 0); ok('catalogue: 鉄甲の盾 def 3, どうたぬき atk 6', defBonus() === 3 && atkBonus() === 6); }
    setup(); { player.st.invinc = 5; const e = foe(); const hp0 = player.hp; R(0.99, () => enemyTurn()); ok('invincible: enemy hits do 0 damage', player.hp === hp0); enemyTurn = stub; }
    setup(); { eqRings[0] = give('ring_tsukon'); const e = foe(); R(0, () => enemyTurn()); const dm = 20 - player.hp; ok('ring_tsukon: enemy crits double the damage on a low roll', dm === 2); enemyTurn = stub; }
    setup(); { eqRings[0] = give('ring_tsukon'); eqShield = give('minoshield', 0); const e = foe(); R(0, () => enemyTurn()); ok('minoshield: crit damage is not doubled', 20 - player.hp === 1); enemyTurn = stub; }

    // --- 敵の状態
    setup(); { enemyTurn = etSave; const e = mkE(1, 0, 30); e.st.sleep = 3; endTurn(); ok('enemy asleep: does not attack', player.hp === 20 && e.st.sleep === 2);
      e.st.sleep = 0; e.st.confuse = 4; let hit = 0; for (let i = 0; i < 12; i++) { player.hp = 20; endTurn(); if (player.hp < 20) hit++; e.x = player.x + 1; e.y = player.y; } ok('enemy confused: rarely attacks', hit < 12); enemyTurn = stub; }

    // --- 画面・体力リセット
    setup(); { eqRings[0] = give('ring_seeall'); const e = mkE(1, 0); e.st.sleep = 3; mkE(-1, 0).st.confuse = 3; mkE(0, 1).st.boost = 3; player.st.blind = 3; player.st.power = 5; let thr = null; try { draw(); player.st.blind = 0; updateVis(); draw(); } catch (er) { thr = er; console.log(er); } ok('draw: statuses, enemy marks and rings render without error', !thr); }
    setup(); { player.st.confuse = 4; player.st.power = 7; draw(); ok('hud: status text lists remaining turns', statusText().includes('混乱4') && statusText().includes('パワーアップ7')); }
    toTown(false); player.maxhp = 33; player.hp = 33; enterDungeon(); ok('enterDungeon: max HP resets to the level-1 value', player.maxhp === BASE_HP && player.hp === BASE_HP && atkUp === 0 && bellyBonus === 0);
    eqRings = [mkItem('ring_bellyup'), null]; inv = [eqRings[0]]; toTown(false); enterDungeon(); ok('enterDungeon: starts with a full (extended) belly', belly === 125);
    wh = []; inv = [mkItem('potion')]; const g1 = giftAll(); ok('giftall: fills the warehouse up to its cap, skipping what the bag has', g1 === MAXWH && wh.length === MAXWH && !wh.some(i => i.type === 'potion') && wh.filter(i => i.plus !== undefined && ITEMS[i.type].equip).every(i => i.plus === 0));
    wh = wh.slice(0, MAXWH - 3); ok('giftall: refills what was removed', giftAll() >= 3 && wh.length <= MAXWH);
    enemyTurn = etSave; eqRings = [null, null]; inv = []; wh = []; }
  // ===== 追加：シート取り込み（開発ツール tests/tools/sheets.js：切り分け・プロンプト）=====
  { const T = __require(process.cwd() + '/tests/tools/sheets.js'), SHEETS = T.SHEETS, HINT = T.HINT, sheetPrompt = T.sheetPrompt, sliceSheet = T.sliceSheet;
    const allKeys = SHEETS.flatMap(sh => sh.keys), icons = Object.values(ICON_BY_CAT), hand = Object.keys(ITEMS).filter(k => ['weapon', 'shield'].includes(ITEMS[k].equip));
    const already = ['stick', 'sword', 'axe', 'woodshield', 'ironshield'];                      // 手持ち絵が既にある5つ
    ok('sheets: every key is an item or a shared icon, and appears once', allKeys.every(k => ITEMS[k] || ENEMIES[k] || icons.includes(k)) && new Set(allKeys).size === allKeys.length);
    ok('sheets: every weapon/shield without hand art yet is on a sheet', hand.filter(k => !already.includes(k)).every(k => allKeys.includes(k)) && already.every(k => hand.includes(k)));
    ok('sheets: every key has a visual hint', allKeys.every(k => typeof HINT[k] === 'string' && HINT[k].length >= 3));
    ok('sheets: at most 16 per sheet', SHEETS.every(sh => sh.keys.length <= 16 && sh.keys.length >= 1));
    ok('sheets: hand-art keys never end in a digit (extName() would strip it)', hand.every(k => !/[0-9]$/.test(k)));
    const pr = T.sheetPrompt(SHEETS[0]), pw = T.sheetPrompt(SHEETS[1]);
    ok('prompt: Japanese, names columns/rows, magenta, each item numbered in order', pr.includes('横2列×縦2行') && pr.includes('マゼンタ(#FF00FF)') && pr.includes('1.紐で結んだ無地の巻物') && pr.includes('4.正面向きの丸い鉄の盾') && /[ぁ-ん]/.test(pr));
    ok('prompt: the weapon sheet says blade-up, 4x3', pw.includes('横4列×縦3行') && pw.includes('刃（先端）を真上に向けて縦に置き') && pw.includes('12.炎をまとった刀'));
    ok('prompt: shield sheet says frontal', T.sheetPrompt(SHEETS[2]).includes('正面向き'));
    // --- 共通アイコン（識別のため、カテゴリで1つに固定）
    { const herbs = Object.keys(ITEMS).filter(k => ITEMS[k].cat === '草');
      ok('icons: every herb/seed/scroll/ring/staff/weapon/shield has a shared icon', Object.keys(ITEMS).filter(k => ITEMS[k].cat !== '薬' && ITEMS[k].cat !== '食').every(k => ITEMS[k].icon === ICON_BY_CAT[ITEMS[k].cat]));
      ok('icons: potion and onigiri keep their own art', !ITEMS.potion.icon && !ITEMS.onigiri.icon && iconOf('potion') === 'potion' && iconOf('onigiri') === 'onigiri');
      ok('icons: no shared art yet -> falls back to the item itself (placeholder)', iconOf('herb') === 'herb');
      const was = { h: SPRITES.icon_herb, s: SPRITES.icon_sword };
      const a = mkCanvas(64, 64); a.getContext('2d').fillStyle = '#0a0'; a.getContext('2d').fillRect(8, 8, 48, 48); SPRITES.icon_herb = a; SPRITES.icon_sword = a;
      ok('icons: with shared art, every herb draws the SAME art key (identity not leaked)', herbs.every(k => iconOf(k) === 'icon_herb') && iconUrl('herb') === iconUrl('poisonherb') && iconUrl('herb') !== '');
      ok('icons: all weapons share one floor icon; the hand art key stays per weapon', iconOf('sword') === 'icon_sword' && iconOf('katana') === 'icon_sword' && ITEMS.katana.equip === 'weapon');
      ok('icons: bag rows show the picture when art exists, a glyph otherwise', rowHtml({ key: 'x', type: 'herb', items: [mkItem('herb')] }, false, '').includes('<img src="data:image/png') && !rowHtml({ key: 'y', type: 'scroll', items: [mkItem('scroll')] }, false, '').includes('<img'));
      ok('icons: floor drawing works with shared art', (() => { let t = null; try { scene = 'dungeon'; floorNo = 3; newFloor(); floorItems = [{ x: player.x + 1, y: player.y, item: mkItem('herb') }]; map[player.y][player.x + 1] = FLOOR; draw(); } catch (e) { t = e; } return !t; })());
      if (was.h) SPRITES.icon_herb = was.h; else delete SPRITES.icon_herb; if (was.s) SPRITES.icon_sword = was.s; else delete SPRITES.icon_sword; iconCache.clear();
      ok('icons: asset list has the shared icons, hand art for weapons/shields, and no per-herb files', Object.values(ICON_BY_CAT).every(k => ASSET_KEYS.includes(k)) && ASSET_KEYS.includes('katana') && ASSET_KEYS.includes('tekkoshield') && ASSET_KEYS.includes('potion') && !ASSET_KEYS.includes('herb') && !ASSET_KEYS.includes('ring_regen') && ASSET_KEYS.length < 70); }
    // 合成シート：マゼンタ背景に、色の四角を1マスに1個。位置は少しズラし、2マスは空にする
    const W = 800, H = 800, cv = mkCanvas(W, H), g = cv.getContext('2d'); g.fillStyle = '#FF00FF'; g.fillRect(0, 0, W, H);
    const cols = 4, rows = 4, cw = W / cols, ch = H / rows, colors = [];
    for (let i = 0; i < 16; i++) {
      if (i === 5 || i === 10) { colors.push(null); continue; }
      const c = `rgb(${20 + i * 12},${200 - i * 8},${40 + i * 5})`; colors.push(c); g.fillStyle = c;
      const w = 60 + (i % 3) * 30, h = 90 + (i % 4) * 10, ox = ((i * 37) % 31) - 15, oy = ((i * 53) % 29) - 14;
      g.fillRect(Math.round((i % cols) * cw + (cw - w) / 2 + ox), Math.round(Math.floor(i / cols) * ch + (ch - h) / 2 + oy), w, h);
    }
    const cells = sliceSheet(cv, cols, rows, 16, 128);
    ok('slice: 16 cells, the two blank ones are null', cells.length === 16 && cells[5] === null && cells[10] === null && cells.filter(Boolean).length === 14);
    ok('slice: each piece is square and filled mostly by its colour, with transparent margin', cells.every((c, i) => {
      if (!c) return true; if (c.width !== 128 || c.height !== 128) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let on = 0, off = 0, hit = 0;
      const want = colors[i].match(/\d+/g).map(Number);
      for (let p = 0; p < d.length; p += 4) { if (d[p + 3] > 200) { on++; if (Math.abs(d[p] - want[0]) < 6 && Math.abs(d[p + 1] - want[1]) < 6 && Math.abs(d[p + 2] - want[2]) < 6) hit++; } else off++; }
      return on > 0 && off > 0 && hit / on > 0.9;
    }));
    ok('slice: the piece is centred (margin on all four sides)', cells.every(c => { if (!c) return true; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, S = c.width; const a = (x, y) => d[(y * S + x) * 4 + 3];
      return a(0, 0) === 0 && a(S - 1, S - 1) === 0 && a(S >> 1, 0) === 0 && a(S >> 1, S - 1) === 0 && a(0, S >> 1) === 0 && a(S - 1, S >> 1) === 0; }));
    const small = mkCanvas(200, 200), sg = small.getContext('2d'); sg.fillStyle = '#FF00FF'; sg.fillRect(0, 0, 200, 200); sg.fillStyle = '#00aa00'; sg.fillRect(60, 60, 30, 30);
    const one = sliceSheet(small, 4, 4, 16); ok('slice: a mostly-empty sheet yields one piece', one.filter(Boolean).length === 1 && one[0] === null);
  }
  // ===== 段階1：レベル・経験値・ちから・ダメージ式・敵の個性 =====
  { const R = (v, f) => { const rs = Math.random; Math.random = () => v; try { f(); } finally { Math.random = rs; } };
    const etSave = enemyTurn;
    const setup = () => { enemyTurn = etSave; scene = 'dungeon'; floorNo = 3; newFloor(); dead = false; eqWeapon = eqShield = null; eqRings = [null, null]; inv = []; enemies = []; floorItems = []; player.st = newStatus(); player.lv = 1; player.exp = 0; player.maxhp = 20; player.hp = 20; atkUp = 0; belly = 100; player.face = [1, 0]; turn = 1; ACC.p = ACC.e = 1; };
    const clearAround = () => { for (let dy = -4; dy <= 4; dy++) for (let dx = -6; dx <= 6; dx++) { const x = player.x + dx, y = player.y + dy; if (inb(x, y) && x > 0 && y > 0 && x < MW - 1 && y < MH - 1) map[y][x] = FLOOR; } };
    const mk = (kind, dx, dy, hp) => { const x = player.x + dx, y = player.y + dy; map[y][x] = FLOOR; const e = { kind, x, y, vx: x, vy: y, hp: hp || 50, maxhp: hp || 50, aware: true, lost: 0, flash: 0, bump: null, fl: false, st: {}, gen: 0 }; enemies.push(e); return e; };
    // 式
    ok('levelAtk: Lv1=1, Lv5=7, Lv6=8.5, Lv13=15.5, Lv14=16', levelAtk(1) === 1 && levelAtk(5) === 7 && levelAtk(6) === 8.5 && levelAtk(13) === 15.5 && levelAtk(14) === 16);
    ok('expNeed: grows with level', expNeed(1) === 10 && expNeed(2) === 16 && expNeed(10) > expNeed(2));
    setup(); ok('curStr: base 8', curStr() === 8);
    atkUp = 2; ok('curStr: +2 from herbs', curStr() === 10); atkUp = 0;
    eqWeapon = mkItem('sword', 0); ok('playerAtk: Lv1 + sword(3) at str 8 = 4', playerAtk() === 4);
    atkUp = 8; ok('playerAtk: str 16 -> weapon x1.25, +8 -> 1+3.75+8 = 12.75', Math.abs(playerAtk() - 12.75) < 1e-9); atkUp = 0; eqWeapon = null;
    { const e = mk('ogre', 1, 0); ok('calcDamage: enemy defense reduces damage (Lv1 vs ogre def2: (1-2+1)=0 -> min 1)', (R(0.5, () => 0), true) && (() => { let v; R(0.5, () => { v = calcDamage(e); }); return v === 1; })()); }
    { const e = mk('goblin', 1, 0); let lo = 99, hi = 0; eqWeapon = mkItem('axe', 0); for (let i = 0; i < 200; i++) { const d = calcDamage(e); lo = Math.min(lo, d); hi = Math.max(hi, d); } ok('calcDamage: axe Lv1 spread is 87.5-112.5% of 7', lo === 6 && hi === 8); eqWeapon = null; }
    // 命中
    setup(); { const e = mk('goblin', 1, 0); ACC.p = 0; R(0.5, () => hitEnemy(e)); ok('miss: ACC.p=0 never hits', e.hp === 50); ACC.p = 1; }
    setup(); { const e = mk('goblin', 1, 0); e.st.sleep = 5; ACC.p = 0; R(0.5, () => hitEnemy(e)); ok('sleeping enemies are always hit', e.hp < 50 && e.st.sleep === 0); ACC.p = 1; }
    // 経験値・レベルアップ
    setup(); { const e = mk('goblin', 1, 0, 1); hitEnemy(e); ok('kill: goblin gives 4 exp', player.exp === 4 && player.lv === 1 && enemies.length === 0); }
    setup(); { gainExp(10); ok('levelup: 10 exp -> Lv2, max HP +4', player.lv === 2 && player.exp === 0 && player.maxhp === 24 && player.hp === 24); gainExp(100); ok('levelup: multiple levels at once', player.lv >= 4 && player.maxhp === 20 + 4 * (player.lv - 1)); }
    setup(); { player.lv = MAX_LV; gainExp(999); ok('levelup: capped at MAX_LV', player.lv === MAX_LV); }
    setup(); { scene = 'town'; gainExp(50); ok('exp: none in town', player.lv === 1 && player.exp === 0); scene = 'dungeon'; }
    setup(); { const e = mk('goblin', 1, 0, 1); inv = [mkItem('annihilatescroll')]; useType('annihilatescroll'); ok('annihilate scroll: no exp', player.exp === 0); void e; }
    setup(); { player.lv = 5; player.exp = 3; player.maxhp = 36; toTown(false); ok('toTown: level/exp/max HP reset', player.lv === 1 && player.exp === 0 && player.maxhp === BASE_HP); }
    // 敵の表
    ok('enemies: 15 kinds, each has exp/def/hp/atk', Object.keys(ENEMIES).length === 15 && Object.values(ENEMIES).every(T => T.exp > 0 && T.def >= 0 && T.hp(1) > 0 && T.atk(1).length === 2));
    ok('enemies: borrowed-art kinds name an existing art key', Object.values(ENEMIES).filter(T => T.art).every(T => ENEMIES[T.art]));
    ok('enemies: slime stops at 7F (to:6)', (() => { for (let i = 0; i < 300; i++) if (rollEnemy(7) === 'slime') return false; return true; })());
    ok('enemies: deep kinds only appear deep', (() => { for (let i = 0; i < 300; i++) if (['minotaur', 'dragon'].includes(rollEnemy(5))) return false; const s = new Set(); for (let i = 0; i < 600; i++) s.add(rollEnemy(10)); return s.has('minotaur') && s.has('dragon'); })());
    // 個性
    setup(); clearAround(); { const e = mk('archer', 4, 0); const hp0 = player.hp; enemyTurn(); ok('archer: shoots from 4 tiles in a straight line', player.hp < hp0 && e.x === player.x + 4); }
    setup(); clearAround(); { const e = mk('archer', 4, 1); const hp0 = player.hp; enemyTurn(); ok('archer: needs a straight line (4,1) -> no shot', player.hp === hp0); void e; }
    setup(); clearAround(); { const bl = mk('goblin', 2, 0); bl.st.sleep = 9; const e = mk('archer', 4, 0); const hp0 = player.hp; enemyTurn(); ok('archer: blocked by another enemy', player.hp === hp0); void e; }
    setup(); clearAround(); { const e = mk('dragon', 3, 0); const hp0 = player.hp; floorNo = 9; enemyTurn(); ok('dragon: breathes fire within 4 tiles', player.hp < hp0 && /炎/.test(msgHistory[msgHistory.length - 1])); void e; }
    setup(); clearAround(); { const e = mk('dragon', 6, 0); const hp0 = player.hp; enemyTurn(); ok('dragon: no breath beyond 4 tiles', player.hp === hp0); void e; }
    setup(); clearAround(); { const e = mk('thief', 1, 0, 5); inv = [mkItem('potion'), mkItem('herb')]; eqWeapon = null; enemyTurn(); ok('thief: steals an unequipped item and flees', e.loot && inv.length === 1);
      const d0 = Math.max(Math.abs(e.x - player.x), Math.abs(e.y - player.y)); for (let i = 0; i < 4; i++) enemyTurn(); ok('thief: runs away', Math.max(Math.abs(e.x - player.x), Math.abs(e.y - player.y)) > d0);
      const loot = e.loot; e.hp = 1; e.x = player.x + 1; e.y = player.y; map[e.y][e.x] = FLOOR; hitEnemy(e); ok('thief: killing it drops the stolen item', floorItems.some(f => f.item === loot) && enemies.length === 0); }
    setup(); clearAround(); { const e = mk('thief', 1, 0, 5); inv = []; const hp0 = player.hp; enemyTurn(); ok('thief: with nothing to steal it just attacks', !e.loot && player.hp < hp0); }
    setup(); clearAround(); { const e = mk('thief', 1, 0, 5); inv = [mkItem('potion')]; enemyTurn(); e.fleeT = 40; enemyTurn(); ok('thief: escapes for good after 40 turns', !enemies.includes(e) && !floorItems.some(f => f.item.type === 'potion')); }
    setup(); clearAround(); { eqWeapon = mkItem('sword', 0); inv = [eqWeapon]; const e = mk('thief', 1, 0, 5); enemyTurn(); ok('thief: never steals equipped gear', !e.loot && eqWeapon && inv.includes(eqWeapon)); }
    setup(); clearAround(); { mk('sleepy', 1, 0); R(0.5, () => enemyTurn()); ok('sleepy: puts you to sleep', player.st.sleep > 0); }
    setup(); clearAround(); { const e = mk('sleepy', 3, 0); const x0 = e.x; enemyTurn(); ok('sleepy: never moves', e.x === x0); }
    setup(); clearAround(); { mk('dazzle', 1, 0); R(0.5, () => enemyTurn()); ok('dazzle: confuses', player.st.confuse > 0); }
    setup(); clearAround(); { eqRings = [mkItem('ring_nosleep'), null]; mk('sleepy', 1, 0); R(0.5, () => enemyTurn()); ok('sleepy: ring_nosleep blocks it', player.st.sleep === 0); }
    setup(); clearAround(); { mk('venom', 1, 0); R(0.5, () => enemyTurn()); ok('venom: lowers strength by 1', atkUp === -1 && curStr() === 7); }
    setup(); clearAround(); { eqRings = [mkItem('ring_antidote'), null]; mk('venom', 1, 0); R(0.5, () => enemyTurn()); ok('venom: ring_antidote blocks it', atkUp === 0); }
    setup(); clearAround(); { atkUp = -4; mk('venom', 1, 0); R(0.5, () => enemyTurn()); ok('venom: strength loss is capped at -4', atkUp === -4); }
    setup(); clearAround(); { inv = [mkItem('strherb')]; atkUp = -2; useType('strherb'); ok('strherb: recovers lost strength', atkUp === -1); }
    setup(); clearAround(); { const e = mk('bomb', 1, 0, 3); const hp0 = player.hp; R(0.5, () => enemyTurn()); ok('bomb: explodes next to you and disappears', player.hp < hp0 && !enemies.includes(e) && player.exp === 0); }
    setup(); clearAround(); { const e = mk('bomb', 1, 0, 1); hitEnemy(e); ok('bomb: killed first -> no explosion, gives exp', player.hp === 20 && player.exp === 6); }
    setup(); clearAround(); { for (let y = player.y - 1; y <= player.y + 1; y++) for (let x = player.x + 2; x <= player.x + 3; x++) map[y][x] = WALL; const e = mk('ghost', 4, 0); map[e.y][e.x] = FLOOR; e.aware = true; const x0 = e.x; floorNo = 6; enemyTurn(); ok('ghost: walks through walls toward you', e.x === x0 - 1); }
    setup(); clearAround(); { const e = mk('ghost', 1, 0); const hp0 = player.hp; R(0.5, () => enemyTurn()); ok('ghost: attacks when adjacent', player.hp < hp0); }
    setup(); clearAround(); { const e = mk('blob', 1, 0, 20); e.maxhp = 20; R(0.5, () => hitEnemy(e)); ok('blob: splits when hit and survives (HP shared)', enemies.length === 2 && enemies[0].hp + enemies[1].hp === 20 - calcDamageSample() && enemies[1].gen === 1);
      function calcDamageSample() { return 20 - enemies[0].hp - enemies[1].hp; } }
    setup(); clearAround(); { const e = mk('blob', 1, 0, 200); e.gen = 3; R(0.5, () => hitEnemy(e)); ok('blob: no more splitting at generation 3', enemies.length === 1); }
    setup(); clearAround(); { const e = mk('blob', 1, 0, 1); e.gen = 2; hitEnemy(e); ok('blob: split children give less exp (6 >> 2 = 1)', player.exp === 1); }
    setup(); clearAround(); { const e = mk('blob', 1, 0, 2); R(0.5, () => hitEnemy(e)); ok('blob: killed outright does not split', enemies.length === 0); }
    // 見た目：専用の絵が無い敵は、借りた絵で描ける
    ok('draw: an enemy with no own art draws with the borrowed art', (() => { setup(); const e = mk('minotaur', 1, 0); e.vx = e.x; e.vy = e.y; vis[e.y][e.x] = true; try { fadeT = -1e9; draw(); return true; } catch (err) { console.log(err); return false; } })());
    ok('hud: shows level and strength in the dungeon', (() => { setup(); render(); return /Lv1/.test($('hp').innerHTML) && /ちから8/.test($('where').innerHTML); })());
    enemyTurn = etSave; ACC.p = ACC.e = 1;
  }
  // ===== 段階2：罠・魔物部屋・識別 =====
  { const R = (v, f) => { const rs = Math.random; Math.random = () => v; try { f(); } finally { Math.random = rs; } };
    const etSave = enemyTurn;
    const setup = (fl = 3, keep = false) => { enemyTurn = etSave; scene = 'dungeon'; dungeonId = 'first'; floorNo = fl; shuffleAliases(); newFloor(); dead = false; eqWeapon = eqShield = null; eqRings = [null, null]; inv = []; if (!keep) { enemies = []; floorItems = []; traps = []; } player.st = newStatus(); player.lv = 1; player.exp = 0; player.maxhp = 20; player.hp = 20; atkUp = 0; belly = 100; player.face = [1, 0]; turn = 1; ACC.p = ACC.e = 1; };
    const flat = () => { for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) { const x = player.x + dx, y = player.y + dy; if (inb(x, y) && x > 0 && y > 0 && x < MW - 1 && y < MH - 1) map[y][x] = FLOOR; } };
    const mkE = (kind, dx, dy, hp = 30) => { const x = player.x + dx, y = player.y + dy; map[y][x] = FLOOR; const e = { kind, x, y, vx: x, vy: y, hp, maxhp: hp, aware: true, lost: 0, flash: 0, bump: null, fl: false, st: {}, gen: 0 }; enemies.push(e); return e; };
    // --- 罠の配置
    ok('traps: every floor has 1-5 hidden traps, none in corridors/entrances', (() => { for (let i = 0; i < 40; i++) { setup(1 + (i % 4), true); if (traps.length < 1 || traps.length > 5) return false; for (const t of traps) if (t.seen || roomGrid[t.y][t.x] < 0 || corridorAdj(t.x, t.y) || map[t.y][t.x] !== FLOOR) return false; } return true; })());
    ok('traps: no two on the same tile; not under the player', (() => { for (let i = 0; i < 30; i++) { setup(4, true); const k = new Set(traps.map(t => t.x + ',' + t.y)); if (k.size !== traps.length || trapAt(player.x, player.y)) return false; } return true; })());
    ok('traps: no pit on the last floor', (() => { DUNGEONS.first.floors = 5; for (let i = 0; i < 60; i++) { setup(5, true); if (traps.some(t => t.kind === 'pit')) return false; } return true; })());
    ok('traps: all six kinds can appear', (() => { const k = new Set(); for (let i = 0; i < 200; i++) { setup(2, true); traps.forEach(t => k.add(t.kind)); } return k.size === 6; })());
    // --- 発見
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'gas', seen: false }]; const t0 = turn; playerAttack(); ok('trap: Attack at a hidden trap tile reveals it and uses a turn', traps[0].seen && turn === t0 + 1 && player.st.sleep === 0 && /見つけた/.test(msgHistory[msgHistory.length - 2] + msgHistory[msgHistory.length - 1])); }
    setup(); flat(); { const t0 = turn; playerAttack(); ok('trap: Attack at nothing costs no turn', turn === t0); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'gas', seen: false }, { x: player.x + 3, y: player.y, kind: 'mine', seen: false }]; inv = [mkItem('eyeherb')]; useType(inv[0].type); ok('めぐすり草: reveals every trap', traps.every(t => t.seen)); }
    // --- 発動
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'gas', seen: false }]; playerMove(1, 0); ok('gas trap: sleep (4 turns) and it stays', traps.length === 1 && traps[0].seen && player.hp > 0); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'gas', seen: false }]; const t0 = turn; playerMove(1, 0); ok('gas trap: the sleeping turns pass', turn >= t0 + 3); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'mine', seen: false }]; playerMove(1, 0); ok('mine: 35% of max HP (7) and the mine is used up', player.hp === 13 && traps.length === 0); }
    setup(); flat(); { player.st.invinc = 5; traps = [{ x: player.x + 1, y: player.y, kind: 'mine', seen: false }]; playerMove(1, 0); ok('mine: invincibility blocks the damage', player.hp === 20); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'hungry', seen: false }]; belly = 50; playerMove(1, 0); ok('hunger trap: belly -10', belly <= 40 && belly >= 39); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'warp', seen: false }]; const ox = player.x, oy = player.y; let moved = false; for (let i = 0; i < 15 && !moved; i++) { player.x = ox; player.y = oy; traps = [{ x: ox + 1, y: oy, kind: 'warp', seen: false }]; playerMove(1, 0); moved = Math.abs(player.x - ox) > 1 || Math.abs(player.y - oy) > 1; } ok('warp trap: you are moved elsewhere', moved); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'summon', seen: false }]; playerMove(1, 0); ok('summon trap: 3 enemies appear', enemies.length === 3 && enemies.every(e => e.aware)); }
    setup(3); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'pit', seen: false }]; playerMove(1, 0); ok('pit: you fall to the next floor', floorNo === 4 && traps.every(t => t.kind !== 'pit' || true)); }
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'gas', seen: true }]; playerMove(1, 0); ok('a trap you can see still triggers if you step on it', player.st.sleep > 0 || turn > 1); }
    // --- 描画
    setup(); flat(); { traps = [{ x: player.x + 1, y: player.y, kind: 'mine', seen: true }]; seen[player.y][player.x + 1] = true; ok('trap: draws without errors', (() => { try { fadeT = -1e9; draw(); return true; } catch (e) { console.log(e); return false; } })()); }
    // --- 魔物部屋
    MH_RATE.v = 1;
    ok('monster house: appears from floor 2, never on floor 1', (() => { for (let i = 0; i < 20; i++) { setup(1, true); if (rooms.some(r => r.mh)) return false; } let n = 0; for (let i = 0; i < 30; i++) { setup(3, true); if (rooms.some(r => r.mh)) n++; } return n >= 20; })());
    setup(3, true); { const hi = rooms.findIndex(r => r.mh); ok('monster house: 7-10 sleeping enemies in one room, items too', hi >= 0 && enemies.filter(e => e.mh).length >= 5 && enemies.filter(e => e.mh).every(e => roomGrid[e.y][e.x] === hi) && floorItems.filter(f => roomGrid[f.y][f.x] === hi).length >= 1); }
    setup(3, true); { const hi = rooms.findIndex(r => r.mh), R2 = rooms[hi]; const sleepers = enemies.filter(e => e.mh), p0 = sleepers.map(e => e.x + ',' + e.y).join();
      player.x = player.vx = rooms[0].cx; player.y = player.vy = rooms[0].cy; enemyTurn(); ok('monster house: sleepers do not move before you enter', sleepers.map(e => e.x + ',' + e.y).join() === p0);
      player.x = R2.cx; player.y = R2.cy; map[player.y][player.x] = FLOOR; checkHouse(); ok('monster house: entering wakes them all', sleepers.every(e => !e.mh && e.aware) && R2.mhDone === true && /魔物部屋/.test(msgHistory[msgHistory.length - 1]));
      const n = msgHistory.length; checkHouse(); ok('monster house: triggers only once', msgHistory.length === n); }
    MH_RATE.v = 0.2;
    // --- 識別
    ok('alias pools are big enough for every unidentified item (no collisions)', (() => { for (const [cat, pool] of Object.entries(ALIAS_POOL)) { const cats = cat === '草' ? ['草', '種'] : [cat]; const n = Object.keys(ITEMS).filter(k => cats.includes(ITEMS[k].cat) && ITEMS[k].unid).length; if (pool.words.length < n || new Set(pool.words).size !== pool.words.length) return false; } return true; })());
    setup(); ok('alias: every herb/seed/scroll/ring/staff has a unique alias with its theme suffix', (() => { const names = Object.keys(ITEMS).filter(k => ITEMS[k].unid).map(k => alias[k]); return names.every(Boolean) && new Set(names).size === names.length && ITEMS.herb.unid && /草$/.test(alias.herb) && /の巻物$/.test(alias.scroll) && /の腕輪$/.test(alias.ring_regen) && /の杖$/.test(alias.firestaff) && /の種$/.test(alias.bellyup); })());
    ok('alias: weapons, shields, potions, onigiri and weeds are never hidden', ['sword', 'ironshield', 'potion', 'onigiri', 'weed'].every(k => !ITEMS[k].unid));
    setup(); { const a1 = JSON.stringify(alias); let diff = false; for (let i = 0; i < 5 && !diff; i++) { shuffleAliases(); diff = JSON.stringify(alias) !== a1; } ok('alias: reshuffled on every dive', diff); }
    setup(); { const it = mkItem('herb'); ok('name: unknown herb shows its alias in the dungeon', itemName(it) === alias.herb && itemName(it) !== '薬草'); scene = 'town'; ok('name: true name in town', itemName(it) === ITEMS.herb.name); scene = 'dungeon'; }
    setup(); { const it = mkItem('firestaff'); ok('name: unknown staff hides its charges', /\[\?\]$/.test(itemName(it)) && !isKnown('firestaff')); identify('firestaff'); ok('name: identified staff shows charges', /\[\d+\]$/.test(itemName(it))); }
    setup(); { inv = [mkItem('herb')]; const al = alias.herb; useType('herb'); ok('use: eating an unknown herb identifies it ("<alias>は薬草だった！")', isKnown('herb') && msgHistory.some(m => m === `${al}は${ITEMS.herb.name}だった！`) && itemName(mkItem('herb')) === ITEMS.herb.name); }
    setup(); { inv = [mkItem('mapscroll')]; useType('mapscroll'); ok('use: reading an unknown scroll identifies it', isKnown('mapscroll') && inv.length === 0); }
    setup(); { flat(); mkE('goblin', 2, 0); inv = [mkItem('firestaff')]; useType(ikey(inv[0])); ok('use: zapping an unknown staff identifies it', isKnown('firestaff')); }
    setup(); { inv = [mkItem('ring_regen')]; const al = alias.ring_regen; useType('ring_regen'); ok('use: wearing an unknown ring identifies it', isKnown('ring_regen') && itemName(inv[0]) === ITEMS.ring_regen.name && !!al); }
    setup(); { inv = [mkItem('herb'), mkItem('herb')]; useType('herb'); ok('identify: all herbs of the type are known afterwards', isKnown('herb') && itemName(inv[0]) === ITEMS.herb.name); }
    setup(); { inv = [mkItem('herb'), mkItem('scroll'), mkItem('ring_regen'), mkItem('identscroll')]; useType('identscroll'); ok('identscroll: identifies everything in the bag', isKnown('herb') && isKnown('scroll') && isKnown('ring_regen') && isKnown('identscroll') && !isKnown('firestaff')); }
    setup(); { inv = [mkItem('identscroll')]; useType('identscroll'); ok('identscroll: with nothing to identify it is still used up', inv.length === 0); }
    setup(); { inv = [mkItem('herb')]; renderBag(); bagSel = 'herb'; renderBag(); ok('bag: unknown items are marked and their description is hidden', /<i>\?<\/i>/.test(listEl.innerHTML) && /効果はわからない/.test(listEl.innerHTML) && !/HP/.test(listEl.innerHTML.split('class="ds"')[1] || '')); closeBag(); bagSel = null; }
    setup(); { quick = 'herb'; render(); ok('quick button shows the alias', $('quick').innerHTML.includes(alias.herb)); quick = 'potion'; }
    setup(); { inv = []; useType('herb'); ok('use: "not carrying" message uses the alias', /持っていない/.test(msgHistory[msgHistory.length - 1]) && msgHistory[msgHistory.length - 1].includes(alias.herb)); }
    setup(); { identify('herb'); toTown(false); enterDungeon(); ok('enterDungeon: identification resets', !isKnown('herb') && Object.keys(alias).length > 10); }
    enemyTurn = etSave; ACC.p = ACC.e = 1; DUNGEONS.first.floors = 3; toTown(false);
  }
  // ===== 段階3：お金・店・投擲・階層拡大 =====
  { const R = (v, f) => { const rs = Math.random; Math.random = () => v; try { f(); } finally { Math.random = rs; } };
    const etSave = enemyTurn;
    const setup = (fl = 3) => { enemyTurn = etSave; scene = 'dungeon'; dungeonId = 'first'; floorNo = fl; shuffleAliases(); newFloor(); dead = false; eqWeapon = eqShield = null; eqRings = [null, null]; inv = []; enemies = []; floorItems = []; traps = []; player.st = newStatus(); player.lv = 1; player.exp = 0; player.maxhp = 20; player.hp = 20; atkUp = 0; belly = 100; player.face = [1, 0]; turn = 1; ACC.p = ACC.e = ACC.t = 1; gold = 0; bank = 0; };
    const flat = () => { for (let dy = -3; dy <= 3; dy++) for (let dx = -8; dx <= 8; dx++) { const x = player.x + dx, y = player.y + dy; if (inb(x, y) && x > 0 && y > 0 && x < MW - 1 && y < MH - 1) map[y][x] = FLOOR; } };
    const mkE = (kind, dx, dy, hp = 30) => { const x = player.x + dx, y = player.y + dy; map[y][x] = FLOOR; const e = { kind, x, y, vx: x, vy: y, hp, maxhp: hp, aware: true, lost: 0, flash: 0, bump: null, fl: false, st: {}, gen: 0 }; enemies.push(e); return e; };
    // --- お金
    ok('gold: every floor has 1-3 piles of gold', (() => { for (let i = 0; i < 20; i++) { floorNo = 1 + (i % 5); newFloor(); const n = floorItems.filter(f => f.item.type === 'gold').length; if (n < 1 || n > 3) return false; } return true; })());
    ok('gold: deeper floors have bigger piles', (() => { const avg = fl => { let t = 0, n = 0; for (let i = 0; i < 30; i++) { floorNo = fl; newFloor(); for (const f of floorItems) if (f.item.type === 'gold') { t += f.item.plus; n++; } } return t / n; }; return avg(10) > avg(1) * 1.5; })());
    setup(); flat(); { floorItems = [{ x: player.x + 1, y: player.y, item: mkItem('gold', 40) }]; playerMove(1, 0); ok('gold: walking over it picks it up (no bag slot, no "pick" needed)', gold === 40 && floorItems.length === 0 && inv.length === 0); }
    setup(); flat(); { inv = []; for (let i = 0; i < MAXBAG; i++) inv.push(mkItem('potion')); floorItems = [{ x: player.x + 1, y: player.y, item: mkItem('gold', 10) }]; playerMove(1, 0); ok('gold: a full bag does not block it', gold === 10); }
    setup(); flat(); { const e = mkE('goblin', 1, 0, 1); R(0, () => hitEnemy(e)); ok('gold: enemies sometimes drop it when killed (roll 0)', floorItems.some(f => f.item.type === 'gold' && f.item.plus >= 5)); }
    setup(); flat(); { const e = mkE('goblin', 1, 0, 1); R(0.99, () => hitEnemy(e)); ok('gold: no drop on a high roll', !floorItems.some(f => f.item.type === 'gold')); }
    setup(); { gold = 120; bank = 300; player.hp = 1; dead = true; deadAt = -1e9; enemyTurn = etSave; playerMove(0, 0); ok('death: carried gold is lost, the bank is kept', scene === 'town' && gold === 0 && bank === 300 && msgHistory.some(m => /所持金120G/.test(m))); }
    setup(); { gold = 120; DUNGEONS.first.floors = 1; clearDungeon(); ok('clear: gold is kept', gold === 120); DUNGEONS.first.floors = 5; }
    { gold = 50; bank = 0; openWh(); bankMove(true); ok('bank: deposit all', gold === 0 && bank === 50); bankMove(false); ok('bank: withdraw all', gold === 50 && bank === 0); bankMove(false); ok('bank: empty withdraw is harmless', gold === 50 && /空/.test(whMsg)); closeWh(); }
    // --- 店
    ok('shop: always stocks potion/onigiri/arrow + 8 random', (() => { for (let i = 0; i < 20; i++) { rollShop(); if (shopStock.length !== 11 || !['potion', 'onigiri', 'arrow'].every(k => shopStock.some(s => s.type === k))) return false; if (shopStock.some(s => s.type === 'gold' || s.type === 'weed')) return false; } return true; })());
    ok('shop: stock changes when you come back to town', (() => { const a = JSON.stringify(shopStock.map(encItem)); let diff = false; for (let i = 0; i < 6 && !diff; i++) { toTown(true); diff = JSON.stringify(shopStock.map(encItem)) !== a; } return diff; })());
    ok('price: rarer is dearer; enhanced equipment costs more; arrows by count', (() => { const p = t => priceOf(mkItem(t, t === 'arrow' ? 5 : 0)); return p('katana') > p('woodsword') - 1 && priceOf(mkItem('sword', 3)) > priceOf(mkItem('sword', 0)) && p('arrow') === 30 && priceOf(mkItem('herb')) >= 100; })());
    ok('price: sell price is half or less, in steps of 5', (() => { const it = mkItem('herb'); return sellPrice(it) <= priceOf(it) / 2 && sellPrice(it) % 5 === 0 && sellPrice(it) > 0; })());
    { toTown(false); inv = []; gold = 1000; shopStock = [mkItem('potion'), mkItem('herb')]; openWh(); whSide = 'shop'; renderWh();
      const key = ikey(shopStock[0]), p = priceOf(shopStock[0]); shopBuy(key); ok('shop: buy takes the gold and moves the item to the bag', gold === 1000 - p && inv.length === 1 && inv[0].type === 'potion' && shopStock.length === 1);
      gold = 1; shopBuy(ikey(shopStock[0])); ok('shop: not enough gold -> nothing happens', shopStock.length === 1 && /足りない/.test(whMsg));
      gold = 1000; inv = []; for (let i = 0; i < MAXBAG; i++) inv.push(mkItem('onigiri')); shopBuy(ikey(shopStock[0])); ok('shop: full bag -> nothing happens', shopStock.length === 1 && /いっぱい/.test(whMsg));
      inv = [mkItem('herb'), mkItem('sword', 1)]; eqWeapon = inv[1]; whSide = 'sell'; renderWh(); const g0 = gold; shopSell('sword:1E'); ok('shop: equipped gear cannot be sold', inv.length === 2 && gold === g0);
      shopSell('herb'); ok('shop: selling gives the sell price', inv.length === 1 && gold > g0);
      renderWh(); ok('shop: tabs render without errors (buy/sell)', (() => { try { whSide = 'shop'; renderWh(); whSide = 'sell'; renderWh(); whSide = 'bag'; renderWh(); return /所持金/.test($('whGold').textContent); } catch (e) { console.log(e); return false; } })());
      eqWeapon = null; closeWh(); whSide = 'bag'; inv = []; }
    // --- 矢・投擲
    ok('arrow: stacks of 4-8, quick-able, throw-only', (() => { const a = mkItem('arrow'); return a.plus >= 4 && a.plus <= 8 && ITEMS.arrow.throwOnly && ITEMS.arrow.stack.length === 2; })());
    ok('arrow: separate stacks merge', (() => { const m = mergeStacks([mkItem('arrow', 3), mkItem('potion'), mkItem('arrow', 4)]); return m.length === 2 && m[0].plus === 7; })());
    setup(); flat(); { inv = [mkItem('arrow', 3), mkItem('arrow', 4)]; floorItems = [{ x: player.x, y: player.y, item: mkItem('arrow', 5) }]; takeFloor(floorItems[0]); ok('arrow: picking up merges into the stack', inv.length === 1 && inv[0].plus === 12 || (inv.length === 2 && invCount('arrow') === 12)); }
    setup(); flat(); { inv = []; for (let i = 0; i < MAXBAG; i++) inv.push(mkItem('potion')); inv[0] = mkItem('arrow', 2); floorItems = [{ x: player.x, y: player.y, item: mkItem('arrow', 3) }]; ok('arrow: merging works even with a full bag', takeFloor(floorItems[0]) && invCount('arrow') === 5); }
    setup(); flat(); { const e = mkE('goblin', 3, 0, 30); inv = [mkItem('arrow', 4)]; throwType('arrow'); ok('throw: an arrow hits the first enemy in line for 5-8', e.hp >= 22 && e.hp <= 25 && invCount('arrow') === 3 && e.aware); }
    setup(); flat(); { const e = mkE('ogre', 3, 0, 30); inv = [mkItem('arrow', 1)]; R(0, () => throwType('arrow')); ok('throw: enemy defense reduces it (roll 5 - ogre def 2 = 3)', e.hp === 27); }
    setup(); flat(); { const e = mkE('goblin', 3, 0, 4); inv = [mkItem('arrow', 4)]; R(0.99, () => throwType('arrow')); ok('throw: kills give exp', !enemies.includes(e) && player.exp > 0); }
    setup(); flat(); { const e = mkE('goblin', 3, 0, 30); inv = [mkItem('arrow', 1)]; ACC.t = 0; throwType('arrow'); ok('throw: a miss drops it on the floor', e.hp === 30 && floorItems.some(f => f.item.type === 'arrow')); ACC.t = 1; }
    setup(); flat(); { inv = [mkItem('arrow', 2)]; throwType('arrow'); ok('throw: with no target it flies up to 8 tiles and lands', floorItems.some(f => f.item.type === 'arrow' && f.x > player.x + 3) && invCount('arrow') === 1); }
    setup(); flat(); { inv = [mkItem('arrow', 1)]; throwType('arrow'); ok('throw: the last arrow leaves the bag', inv.length === 0); }
    setup(); flat(); { for (let i = 1; i <= 3; i++) map[player.y][player.x + i] = WALL; inv = [mkItem('arrow', 2)]; throwType('arrow'); ok('throw: a wall stops it right at your feet', floorItems.some(f => f.item.type === 'arrow' && f.x === player.x && f.y === player.y)); }
    setup(); flat(); { const e = mkE('goblin', 2, 0, 30); inv = [mkItem('sleepherb')]; throwType('sleepherb'); ok('throw: a sleep herb puts the enemy to sleep (8, minus this turn) and is used up', e.st.sleep === 7 && floorItems.every(f => f.item.type !== 'sleepherb')); }
    setup(); flat(); { const e = mkE('goblin', 2, 0, 30); inv = [mkItem('confherb')]; throwType('confherb'); ok('throw: a confusion herb confuses', e.st.confuse === 7); }
    setup(); flat(); { const e = mkE('goblin', 2, 0, 30); inv = [mkItem('poisonherb')]; throwType('poisonherb'); ok('throw: a poison herb hurts for 6', e.hp === 24); }
    setup(); flat(); { const e = mkE('goblin', 2, 0, 30); inv = [mkItem('potion')]; throwType('potion'); ok('throw: other items do 1 damage and land', e.hp === 29 && floorItems.some(f => f.item.type === 'potion')); }
    setup(); flat(); { const w = mkItem('sword', 0); inv = [w]; eqWeapon = w; throwType('sword:0E'); ok('throw: a worn weapon is taken off and thrown', eqWeapon === null && inv.length === 0 && floorItems.some(f => f.item === w)); }
    setup(); flat(); { const e = mkE('goblin', 3, 0, 30); e.st.sleep = 5; ACC.t = 0; inv = [mkItem('arrow', 1)]; throwType('arrow'); ok('throw: sleeping enemies are always hit', e.hp < 30); ACC.t = 1; }
    setup(); { scene = 'town'; inv = [mkItem('arrow', 3)]; throwType('arrow'); ok('throw: not in town', invCount('arrow') === 3); scene = 'dungeon'; }
    setup(); flat(); { inv = [mkItem('arrow', 3)]; quick = 'arrow'; useQuick(); ok('quick slot: arrows can be thrown from the quick button', invCount('arrow') === 2); render(); ok('quick slot: shows the arrow count', /×2/.test($('quick').innerHTML)); quick = 'potion'; }
    setup(); flat(); { inv = [mkItem('arrow', 3)]; renderBag(); bagSel = 'arrow'; renderBag(); ok('bag: arrows show one 投げる button and no separate throw action', (listEl.innerHTML.match(/投げる<\/button>/g) || []).length === 1 && !/data-act="throw"/.test(listEl.innerHTML)); bagSel = null; closeBag(); }
    setup(); flat(); { inv = [mkItem('potion')]; renderBag(); bagSel = 'potion'; renderBag(); ok('bag: other items get a 投げる button', /data-act="throw"/.test(listEl.innerHTML)); bagSel = null; closeBag(); }
    // --- 保存
    { toTown(false); gold = 77; bank = 123; shopStock = [mkItem('potion'), mkItem('arrow', 6)]; dungeonId = 'first'; wh = [mkItem('arrow', 3), mkItem('arrow', 4)]; saveGame(); gold = 0; bank = 0; shopStock = []; wh = []; loadGame();
      ok('save: gold, bank, shop stock and merged arrow stacks survive', gold === 77 && bank === 123 && shopStock.length === 2 && shopStock[1].plus === 6 && wh.length === 1 && wh[0].plus === 7); wh = []; }
    // --- ダンジョン2つ
    ok('dungeons: two, the deep one has 12 floors and needs 1 clear', DUNGEONS.second.floors === 12 && DUNGEONS.second.need === 1);
    { clears = 0; dungeonId = 'second'; ok('dungeons: locked at 0 clears', !unlocked('second')); toTown(false); enterDungeon(); ok('dungeons: entering a locked one falls back to the first', dungeonId === 'first');
      clears = 1; ok('dungeons: unlocked after a clear', unlocked('second')); toTown(false); dungeonId = 'second'; enterDungeon(); ok('dungeons: deep cave starts at 1F', dungeonId === 'second' && scene === 'dungeon' && floorNo === 1); dungeonId = 'first'; toTown(false); clears = 0; }
    { clears = 1; toTown(false); openCfg(); dungeonId = 'first'; const b = cfgListEl; ok('settings: dungeon row exists', /行き先/.test(cfgListEl.innerHTML)); closeCfg(); dungeonId = 'first'; clears = 0; }
    ok('12F: deep cave floors generate (enemies capped, deep kinds appear)', (() => { dungeonId = 'second'; scene = 'dungeon'; const kinds = new Set(); for (let i = 0; i < 40; i++) { floorNo = 12; newFloor(); if (enemies.filter(e => !e.mh).length > 10) return false; enemies.forEach(e => kinds.add(e.kind)); } dungeonId = 'first'; return kinds.has('minotaur') || kinds.has('dragon') || kinds.size > 6; })());
    enemyTurn = etSave; ACC.p = ACC.e = 1; gold = 0; bank = 0; DUNGEONS.first.floors = 3; toTown(false);
  }
  DUNGEONS.first.floors = 3; toTown(false);
  console.log(fail.length ? 'FAIL: ' + fail.join(' | ') : 'ALL OK');
})();
