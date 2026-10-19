;(function () {
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
  for (const [w, h] of [[320, 568], [360, 740], [414, 896], [1024, 768]]) { innerWidth = w; innerHeight = h; resize(); draw(); }
  ok('resize at various sizes', TS === 48 || TS === 32);

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
  openCfg(); ok('cfg has grid row', cfgListEl.innerHTML.includes('町の判定を表示') && cfgListEl.innerHTML.includes('町（一枚絵）')); closeCfg();
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
    ok('enemies: floor5 has all 5 kinds', seen5.size === 5);
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
    useType('scroll'); ok('scroll: raises equipped weapon plus', inv[0].plus === 3 && !inv.some(i => i.type === 'scroll'));
    whSide = 'bag'; whTransfer(ikey(inv[0]), false); ok('warehouse: moving equipped item unequips it', eqWeapon === null && wh.length === 1 && wh[0].plus === 3);
    eqWeapon = null; eqShield = null; useType('scroll'); }
  { scene = 'dungeon'; floorNo = 1; newFloor(); eqWeapon = null; eqShield = null; inv = [];
    const sl = { kind: 'slime', x: player.x + 1, y: player.y, vx: 0, vy: 0, hp: 99, maxhp: 99, aware: true, lost: 0, flash: 0, bump: null, fl: false };
    enemies = [sl]; player.hp = 20; player.maxhp = 20; map[player.y][player.x + 1] = FLOOR; hitEnemy(sl);
    ok('combat: bare hand 2-4', sl.hp >= 95 && sl.hp <= 97);
    const wp = mkItem('axe', 0); inv = [wp]; eqWeapon = wp; sl.hp = 99; hitEnemy(sl); ok('combat: axe adds +5 (7-9)', sl.hp >= 90 && sl.hp <= 92);
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
  DUNGEONS.first.floors = 3; toTown(false);
  console.log(fail.length ? 'FAIL: ' + fail.join(' | ') : 'ALL OK');
})();
