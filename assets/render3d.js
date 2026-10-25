// 3D地形描画（段階1）：地形・壁・光だけを three.js で描き、キャラ・演出・UIは既存の2D描画を上に重ねる。
// 計画：docs/3D_INTEGRATION_PLAN.md ／参照実装：experiment3d.html
// 正射影カメラを使うので、地面の座標は2D側の camX/camY/pitch と厳密に一致する（位置合わせの計算が要らない）。
//   画面x = camX + 列*TS　／　画面y = camY + 行*pitch　（pitch = TS*sin(傾き)）
// WebGL が使えない・読み込みに失敗したときは ready() が false になり、本編は従来の2D描画のまま動く。
import * as THREE from './vendor/three.module.min.js';

const TILT = 65 * Math.PI / 180, S = Math.sin(TILT), C = Math.cos(TILT);
const WALL_H = 0.95;               // 壁の高さ（1マス=1）
const CAM_DIST = 30;               // 正射影なので見た目には影響しない（クリップ用）
const BG = 0x0d0d12;

let inited = false, failed = false;
let renderer, scene, camera, torch, ambient, group, cvs;
let levelKey = '', sizeKey = '', shakeKey = '', shadowsOn = true;
let lastFrame = null;
const loader = new THREE.TextureLoader();
const texCache = new Map();

function tex(url) {
  if (texCache.has(url)) return texCache.get(url);
  const t = loader.load(url, () => { if (lastFrame && cvs?.style.display !== 'none') frame(lastFrame); }, undefined, () => console.warn('Render3D: 画像を読めません', url));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(url, t);
  return t;
}

function init() {
  if (inited || failed) return;
  try {
    cvs = document.createElement('canvas');
    cvs.id = 'c3d';
    // #c（2D）の背面に置く。タッチは #c が受ける。
    cvs.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:-1;display:none';
    document.body.prepend(cvs);
    renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    ambient = new THREE.AmbientLight(0x7a8098, 1.1);
    scene.add(ambient);
    torch = new THREE.PointLight(0xffd9a0, 90, 16, 2);
    torch.castShadow = true;
    torch.shadow.mapSize.set(512, 512);
    torch.shadow.bias = -0.002;
    torch.shadow.camera.near = 0.3;
    scene.add(torch);
    inited = true;
  } catch (e) {
    failed = true;
    console.warn('Render3D: WebGLを開始できません。2D描画のままにします。', e);
    if (cvs && cvs.parentNode) cvs.parentNode.removeChild(cvs);
  }
}

function disposeGroup() {
  if (!group) return;
  scene.remove(group);
  group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
  group = null;
}

// ---------- 絵の枚数（variants.json）----------
// 各テーマのフォルダ assets/dungeon/locations-v1/<テーマ>/variants.json に枚数を書くと、その分の絵を使う（絵を置くだけで反映される）。
//   { "floor": 8, "wallF": 4, "wallT": 4, "rock": 5, "decals": 8, "props": 10 }
//   floor  : floor0〜  床（鍾乳洞・森は広域床 floorW を使うので無関係）   wallF/wallT : wallF0〜／wallT0〜  壁の側面／上面
//   rock   : rock0〜   壁の外側の岩の面（3Dでは探索していない所。無ければ wallT を暗くして使う）
//   decals : decal0〜  床の汚れ（背景が透明のwebp。ひび・苔・水たまり・骨 など）
//   props  : prop0〜   小物（背景が透明のwebp。柱・岩・鍾乳石・根・松明 など。部屋の北の壁際に置く）
// ファイルが無い・json が無いときは、下の既定値（これまでと同じ見た目）で動く。
const DEFAULT_VARIANTS = { floor: 4, wallF: 2, wallT: 2, rock: 0, decals: 0, props: 0 };
const VARIANT_LIMIT = { floor: [1, 16], wallF: [1, 16], wallT: [1, 16], rock: [0, 32], decals: [0, 32], props: [0, 32] };
const variantCache = new Map();
let lastLevel = null;
function variantsOf(themeId) {
  if (variantCache.has(themeId)) return variantCache.get(themeId);
  variantCache.set(themeId, DEFAULT_VARIANTS);   // 読み込み中は既定値
  fetch(`assets/dungeon/locations-v1/${themeId}/variants.json`).then(r => r.ok ? r.json() : null).then(j => {
    if (!j || typeof j !== 'object') return;
    const v = { ...DEFAULT_VARIANTS };
    for (const k in v) if (Number.isInteger(j[k]) && j[k] >= VARIANT_LIMIT[k][0] && j[k] <= VARIANT_LIMIT[k][1]) v[k] = j[k];
    variantCache.set(themeId, v);
    if (lastLevel && lastLevel.themeId === themeId) { levelKey = ''; sync(lastLevel); if (lastFrame) frame(lastFrame); }
  }).catch(() => {});
  return DEFAULT_VARIANTS;
}
// マス座標から決まる乱数（同じマスはいつも同じ絵になる）
const hash2 = (x, y, salt = 0) => {
  let h = Math.imul(x + 1013, 73856093) ^ Math.imul(y + 2029, 19349663) ^ Math.imul(salt + 7, 83492791);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
};
const ROCK_MARGIN = 14;   // 地図の外にも岩の面を敷く（画面の端が真っ黒にならないように）

// 階の地形を作る。level = { map, W, H, themeId, wall, stairs }。内容が変わったときだけ作り直す。
function sync(level) {
  if (!inited || failed || !level || !level.map) return;
  lastLevel = level;
  const { map, W, H, themeId, wall, stairs } = level;
  const man = variantsOf(themeId);
  let h = 2166136261;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) h = Math.imul(h ^ (map[y][x] + 1), 16777619);
  const key = themeId + ':' + W + 'x' + H + ':' + (h >>> 0) + ':' + JSON.stringify(man);
  if (key === levelKey) return;
  levelKey = key;
  disposeGroup();
  const g = new THREE.Group();
  group = g;
  scene.add(g);
  const stats = { rock: 0, decals: 0, props: 0, floor: man.floor, wallF: man.wallF, wallT: man.wallT, wallMeshes: 0 };
  g.userData.stats = stats;
  const forest = themeId === 'forest' && !!window.ForestFestival;
  ambient.color.setHex(forest ? 0x9bc6ce : 0x7a8098);
  ambient.intensity = forest ? 1.35 : 1.1;
  torch.intensity = forest ? 32 : 90;
  renderer.setClearColor(forest ? 0x09181c : BG, 1);
  const url = n => `assets/dungeon/locations-v1/${themeId}/${n}.webp`;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const isFloor = (x, y) => inMap(x, y) && map[y][x] !== wall;
  const dummy = new THREE.Object3D();

  // 床：man.floor 種を座標ハッシュで振り分け（階段は別メッシュ）
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const fCells = Array.from({ length: man.floor }, () => []), stCells = [], allFloor = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isFloor(x, y)) continue;
    if (map[y][x] === stairs) { stCells.push([x, y]); continue; }
    allFloor.push([x, y]);
    fCells[(((x * 73856093) ^ (y * 19349663)) >>> 0) % man.floor].push([x, y]);
  }
  const place = (cells, mesh, y) => cells.forEach(([x, z], k) => {
    dummy.position.set(x + 0.5, y, z + 0.5); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix);
  });
  // 鍾乳洞の広域床：ワールド座標で6マスに1枚。形は既存の床マスだけを使う。
  // 単一マスへの縮小反復では細かな模様が目立ち、採用した静かな床にならない。
  if (themeId === 'limestone' || forest) {
    const positions = [], uvs = [], indices = [];
    for (const [x, z] of fCells.flat()) {
      const n = positions.length / 3;
      positions.push(x, 0, z, x, 0, z + 1, x + 1, 0, z + 1, x + 1, 0, z);
      uvs.push(x / 6, -z / 6, x / 6, -(z + 1) / 6, (x + 1) / 6, -(z + 1) / 6, (x + 1) / 6, -z / 6);
      indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    if (positions.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex(url('floorW')) }));
      floor.receiveShadow = true;
      g.add(floor);
    }
  }
  fCells.forEach((cells, i) => {
    if (themeId === 'limestone' || forest) return;
    if (!cells.length) return;
    const im = new THREE.InstancedMesh(floorGeo, new THREE.MeshLambertMaterial({ map: tex(url('floor' + i)) }), cells.length);
    place(cells, im, 0);
    im.receiveShadow = true;
    g.add(im);
  });
  if (stCells.length) {
    // 階段は床の上に重ねる（床と同じ高さだと重なって点滅するので少し浮かせる）
    const im = new THREE.InstancedMesh(floorGeo, new THREE.MeshLambertMaterial({ map: tex(url('stairs')) }), stCells.length);
    place(stCells, im, 0.01);
    im.receiveShadow = true;
    g.add(im);
    stCells.forEach(([x, z]) => { const l = new THREE.PointLight(0xffc060, 10, 5, 2); l.position.set(x + 0.5, 0.8, z + 0.5); g.add(l); });
  }

  // 床の汚れ：背景が透明の絵を、床の一部（約24%）にランダムに薄く重ねる（同じ床の繰り返し感を消す）
  if (man.decals > 0) {
    const byDecal = Array.from({ length: man.decals }, () => []);
    for (const [x, z] of allFloor) if (hash2(x, z, 11) % 100 < 24) byDecal[hash2(x, z, 12) % man.decals].push([x, z]);
    byDecal.forEach((cells, i) => {
      if (!cells.length) return;
      const mat = new THREE.MeshLambertMaterial({ map: tex(url('decal' + i)), transparent: true, alphaTest: 0.02, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const im = new THREE.InstancedMesh(floorGeo, mat, cells.length);
      cells.forEach(([x, z], k) => {
        dummy.position.set(x + 0.5, 0.004, z + 0.5);
        dummy.rotation.set(0, (hash2(x, z, 13) % 4) * Math.PI / 2, 0);
        dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
      });
      im.receiveShadow = true;
      g.add(im);
      stats.decals += cells.length;
    });
  }

  // 壁：床に隣接する（8近傍）壁マスだけ箱にする。側面=wallF、上面=wallT。F と T の枚数が同じなら同じ番号を組にする
  const hasBox = (x, y) => {
    if (!inMap(x, y) || isFloor(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isFloor(x + dx, y + dy)) return true;
    return false;
  };
  const wGroups = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!hasBox(x, y)) continue;
    const hf = ((x * 31 + y * 17) >>> 0), fi = hf % man.wallF, ti = man.wallF === man.wallT ? fi : hash2(x, y, 3) % man.wallT;
    const k = fi + '_' + ti;
    if (!wGroups.has(k)) wGroups.set(k, { fi, ti, cells: [] });
    wGroups.get(k).cells.push([x, y]);
  }
  const height = WALL_H;   // 森の木・ランタンは2Dの絵（ForestFestival.draw2d）を上に重ねるので、壁は他の洞窟と同じ高さ
  const boxGeo = new THREE.BoxGeometry(1, height, 1);
  wGroups.forEach(({ fi, ti, cells }) => {
    const side = new THREE.MeshLambertMaterial({ map: tex(url('wallF' + fi)) });
    const top = new THREE.MeshLambertMaterial({ map: tex(url('wallT' + ti)) });
    const im = new THREE.InstancedMesh(boxGeo, [side, side, top, top, side, side], cells.length);
    place(cells, im, height / 2);
    im.castShadow = true;
    im.receiveShadow = true;
    g.add(im);
    stats.wallMeshes++;
  });

  // 岩の面：壁の外側（探索していない所）を、壁の上面と同じ高さの岩で埋める。地図の外にも敷く。
  //   rock0〜 があればそれを、無ければ wallT を少し暗くして使う（3Dで真っ黒にならない）。
  {
    const nRock = man.rock > 0 ? man.rock : man.wallT, base = man.rock > 0 ? 'rock' : 'wallT';
    const byRock = Array.from({ length: nRock }, () => []);
    for (let y = -ROCK_MARGIN; y < H + ROCK_MARGIN; y++) for (let x = -ROCK_MARGIN; x < W + ROCK_MARGIN; x++) {
      if (isFloor(x, y) || hasBox(x, y)) continue;
      byRock[hash2(x, y, 5) % nRock].push([x, y]);
    }
    byRock.forEach((cells, i) => {
      if (!cells.length) return;
      const mat = new THREE.MeshLambertMaterial({ map: tex(url(base + i)), color: man.rock > 0 ? 0xffffff : 0xb4b4b4 });
      const im = new THREE.InstancedMesh(floorGeo, mat, cells.length);
      cells.forEach(([x, z], k) => {
        dummy.position.set(x + 0.5, height, z + 0.5);
        dummy.rotation.set(0, (hash2(x, z, 6) % 4) * Math.PI / 2, 0);
        dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
      });
      g.add(im);
      stats.rock += cells.length;
    });
  }

  // 小物：背景が透明の絵を板として立てる。部屋の北の壁際（奥が壁・手前と左右が床・3×2が開けている所）に、まばらに置く。
  //   通路・階段の近く・出入口には置かない。1つ置いたら左右2マスは空ける。
  if (man.props > 0) {
    const tilt = TILT * 0.95, size = 1.5;
    const geo = new THREE.PlaneGeometry(size, size);
    geo.translate(0, size / 2, 0);
    const byProp = Array.from({ length: man.props }, () => []);
    const placed = new Set();
    const nearStairs = (x, y) => stCells.some(([sx, sy]) => Math.abs(sx - x) <= 2 && Math.abs(sy - y) <= 2);
    for (let y = 1; y < H - 2; y++) for (let x = 1; x < W - 1; x++) {
      if (!isFloor(x, y) || map[y][x] === stairs || isFloor(x, y - 1)) continue;
      if (!(isFloor(x - 1, y) && isFloor(x + 1, y) && isFloor(x, y + 1) && isFloor(x - 1, y + 1) && isFloor(x + 1, y + 1) && isFloor(x, y + 2))) continue;
      if (nearStairs(x, y) || placed.has((x - 1) + ',' + y) || placed.has((x - 2) + ',' + y)) continue;
      if (hash2(x, y, 21) % 100 >= 14) continue;
      placed.add(x + ',' + y);
      byProp[hash2(x, y, 22) % man.props].push([x, y]);
    }
    byProp.forEach((cells, i) => {
      if (!cells.length) return;
      // 北の壁（箱）に頭が入って隠れないよう、奥行き判定の対象外にして壁より後に描く（主人公の板と同じ理由）
      const mat = new THREE.MeshLambertMaterial({ map: tex(url('prop' + i)), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
      const im = new THREE.InstancedMesh(geo, mat, cells.length);
      im.renderOrder = 5;
      cells.forEach(([x, z], k) => {
        dummy.position.set(x + 0.5, 0.02, z + 0.62);
        dummy.rotation.set(-tilt, 0, 0);
        dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
      });
      g.add(im);
      stats.props += cells.length;
    });
  }
}

// 毎フレーム。o = { camX, camY, TS, pitch, W, H, focusY, hx, hy, shx, shy, shadows }
//   hx,hy：主人公の表示位置（タイル座標。マスの中心）。松明の位置に使う。
function frame(o) {
  if (!inited || failed) return;
  lastFrame = o;
  const { camX, camY, TS, pitch, W, H, focusY } = o;
  const sk = W + 'x' + H;
  if (sk !== sizeKey) { sizeKey = sk; renderer.setSize(W, H, false); cvs.style.width = W + 'px'; cvs.style.height = H + 'px'; }
  // 2Dの座標系に合わせた枠：画面中央の水平位置・focusY の高さが、カメラの注視点になる
  camera.left = -W / (2 * TS); camera.right = W / (2 * TS);
  camera.top = focusY / TS; camera.bottom = -(H - focusY) / TS;
  camera.updateProjectionMatrix();
  const tx = (W / 2 - camX) / TS, tz = (focusY - camY) / pitch;
  camera.position.set(tx, S * CAM_DIST, tz + C * CAM_DIST);
  camera.lookAt(tx, 0, tz);
  const sh = !!o.shadows;
  if (sh !== shadowsOn) { shadowsOn = sh; torch.castShadow = sh; scene.traverse(n => { if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { m.needsUpdate = true; }); }); }
  torch.position.set(o.hx, 1.9, o.hy + 0.2);
  if (group?.userData.forest) {
    const { lampPositions, lights } = group.userData.forest;
    const near = lampPositions.slice().sort((a, b) => (a.x-o.hx)**2+(a.z-o.hy)**2-((b.x-o.hx)**2+(b.z-o.hy)**2));
    lights.forEach((light, i) => light.position.set(near[i].x, near[i].y, near[i].z));
  }
  const shk = Math.round(o.shx || 0) + ',' + Math.round(o.shy || 0);
  if (shk !== shakeKey) { shakeKey = shk; cvs.style.transform = shk === '0,0' ? '' : `translate(${shk.split(',')[0]}px,${shk.split(',')[1]}px)`; }
  renderer.render(scene, camera);
}

// html にも同じ暗色の背景があるので、body の背景だけ透明にすれば見た目は変わらない
// （body の背景は z-index:-1 の3Dキャンバスより手前に塗られてしまうため）
function show(on) {
  if (!cvs) return;
  cvs.style.display = on ? 'block' : 'none';
  document.body.style.backgroundColor = on ? 'transparent' : '';
}

window.Render3D = {
  init,
  ready: () => !failed,          // 読み込み済みで、WebGLの開始に失敗していない
  pitchK: () => S,               // 1行の高さ = TS * pitchK（2D側の tilePitchY が使う）
  sync, frame, show,
  debug: () => ({ inited, failed, levelKey, children: group ? group.children.length : -1, stats: group ? group.userData.stats : null, forest: group?.userData.forest ? { trees: group.userData.forest.plan.trees.length, lanterns: group.userData.forest.plan.lamps.length, garlands: group.userData.forest.plan.garlands.length, lights: group.userData.forest.lights.length, models: group.userData.forest.models } : null, cam: camera ? camera.position.toArray() : null, frustum: camera ? [camera.left, camera.right, camera.top, camera.bottom] : null, size: renderer ? renderer.getSize(new THREE.Vector2()).toArray() : null, calls: renderer ? renderer.info.render.calls : -1, tris: renderer ? renderer.info.render.triangles : -1 }),
};
