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

// Magenta remains in the source PNGs. Cut it out in the shader for 3D cards.
function forestCardMaterial(name) {
  const mat = new THREE.MeshBasicMaterial({ map: tex(`assets/dungeon/forest-festival-v1/${name}.png`), side: THREE.DoubleSide, toneMapped: false });
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nif (diffuseColor.r > 0.16 && diffuseColor.b > 0.16 && diffuseColor.r > diffuseColor.g * 1.6 && diffuseColor.b > diffuseColor.g * 1.6) discard;');
  };
  mat.customProgramCacheKey = () => 'forest-magenta-v1';
  return mat;
}

function addForest(g, level) {
  const plan = window.ForestFestival.plan(level);
  const matrix = new THREE.Object3D();
  const cards = (name, placements) => {
    if (!placements.length) return;
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, name === 'garland' ? 0 : 0.4, 0);
    const mesh = new THREE.InstancedMesh(geo, forestCardMaterial(name), placements.length);
    placements.forEach((p, i) => {
      matrix.position.set(p.x, p.y, p.z);
      matrix.rotation.set(-TILT, 0, 0);
      matrix.scale.set(p.w, p.h, 1);
      matrix.updateMatrix(); mesh.setMatrixAt(i, matrix.matrix);
    });
    g.add(mesh);
  };
  cards('tree', plan.trees.map(t => ({ x: t.x + .5, y: .24, z: t.y + .8, w: t.size, h: t.size })));
  cards('lantern', plan.lamps.map(l => ({ x: l.x + .5, y: .7, z: l.y + .85, w: .38, h: .6 })));
  // Each string runs along a solid north bank; no support stands on a floor cell.
  cards('garland', plan.garlands.map(s => ({ x: (s.x0 + s.x1 + 1) / 2, y: 1.1, z: s.y + 1, w: s.x1 - s.x0 + .8, h: s.x1 - s.x0 + .8 })));
  // Six nearest lights illuminate the current view. Other lanterns stay emissive.
  const lights = Array.from({ length: Math.min(6, plan.lamps.length) }, () => {
    const light = new THREE.PointLight(0xffbd65, 12, 5, 2);
    light.castShadow = false;
    g.add(light); return light;
  });
  g.userData.forest = { plan, lights };
}

// 階の地形を作る。level = { map, W, H, themeId, wall, stairs }。内容が変わったときだけ作り直す。
function sync(level) {
  if (!inited || failed || !level || !level.map) return;
  const { map, W, H, themeId, wall, stairs } = level;
  let h = 2166136261;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) h = Math.imul(h ^ (map[y][x] + 1), 16777619);
  const key = themeId + ':' + W + 'x' + H + ':' + (h >>> 0);
  if (key === levelKey) return;
  levelKey = key;
  disposeGroup();
  const g = new THREE.Group();
  group = g;
  scene.add(g);
  const forest = themeId === 'forest' && !!window.ForestFestival;
  ambient.color.setHex(forest ? 0x9bc6ce : 0x7a8098);
  ambient.intensity = forest ? 1.35 : 1.1;
  torch.intensity = forest ? 32 : 90;
  renderer.setClearColor(forest ? 0x09181c : BG, 1);
  const url = n => `assets/dungeon/locations-v1/${themeId}/${n}.webp`;
  const isFloor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && map[y][x] !== wall;
  const dummy = new THREE.Object3D();

  // 床：4種を座標ハッシュで振り分け（階段は別メッシュ）
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const fCells = [[], [], [], []], stCells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isFloor(x, y)) continue;
    if (map[y][x] === stairs) { stCells.push([x, y]); continue; }
    fCells[(((x * 73856093) ^ (y * 19349663)) >>> 0) % 4].push([x, y]);
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

  // 壁：床に隣接する（8近傍）壁マスだけ箱にする。側面=wallF、上面=wallT
  const wCells = [[], []];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isFloor(x, y)) continue;
    let adj = false;
    for (let dy = -1; dy <= 1 && !adj; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isFloor(x + dx, y + dy)) { adj = true; break; }
    if (adj) wCells[((x * 31 + y * 17) >>> 0) % 2].push([x, y]);
  }
  const height = forest ? .2 : WALL_H;
  const boxGeo = new THREE.BoxGeometry(1, height, 1);
  wCells.forEach((cells, i) => {
    if (!cells.length) return;
    const side = new THREE.MeshLambertMaterial({ map: tex(url('wallF' + i)) });
    const top = new THREE.MeshLambertMaterial({ map: tex(url('wallT' + i)) });
    const im = new THREE.InstancedMesh(boxGeo, [side, side, top, top, side, side], cells.length);
    place(cells, im, height / 2);
    im.castShadow = true;
    im.receiveShadow = true;
    g.add(im);
  });
  if (forest) addForest(g, level);
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
    const { plan, lights } = group.userData.forest;
    const near = plan.lamps.slice().sort((a, b) => (a.x+.5-o.hx)**2+(a.y+.85-o.hy)**2-((b.x+.5-o.hx)**2+(b.y+.85-o.hy)**2));
    lights.forEach((light, i) => light.position.set(near[i].x + .5, .85, near[i].y + 1));
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
  debug: () => ({ inited, failed, levelKey, children: group ? group.children.length : -1, forest: group?.userData.forest ? { trees: group.userData.forest.plan.trees.length, lanterns: group.userData.forest.plan.lamps.length, garlands: group.userData.forest.plan.garlands.length, lights: group.userData.forest.lights.length } : null, cam: camera ? camera.position.toArray() : null, frustum: camera ? [camera.left, camera.right, camera.top, camera.bottom] : null, size: renderer ? renderer.getSize(new THREE.Vector2()).toArray() : null, calls: renderer ? renderer.info.render.calls : -1, tris: renderer ? renderer.info.render.triangles : -1 }),
};
