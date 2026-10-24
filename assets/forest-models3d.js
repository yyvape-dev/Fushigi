// Solid woodland models. No sprites, camera-facing planes or gameplay randomness.
import * as THREE from './vendor/three.module.min.js';

export function buildForestModels(group, plan, texture) {
  const bark = new THREE.MeshLambertMaterial({ map: texture('wallF0'), color: 0xb7a48b });
  const leaves = new THREE.MeshLambertMaterial({ map: texture('wallT0'), color: 0xc7e0ce });
  const bronze = new THREE.MeshLambertMaterial({ color: 0x75502a });
  const rope = new THREE.MeshLambertMaterial({ color: 0x51402b });
  const glass = new THREE.MeshLambertMaterial({ color: 0xffca70, emissive: 0xff8d26, emissiveIntensity: .65 });
  const bulbs = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const batches = new Map();
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const cylinder = (r0, r1, segments = 7, rings = 1) => new THREE.CylinderGeometry(r0, r1, 1, segments, rings);
  const definitions = {
    trunk: [cylinder(.11, .22, 7, 3), bark, true],
    branch: [cylinder(.045, .09, 6), bark, true],
    root: [cylinder(.018, .08, 5), bark, true],
    crown: [new THREE.IcosahedronGeometry(1, 1), leaves, true],
    frame: [new THREE.CylinderGeometry(.145, .145, .035, 6), bronze, true],
    cage: [cylinder(.009, .009, 5), bronze, true],
    roof: [new THREE.ConeGeometry(.18, .13, 6), bronze, true],
    hook: [new THREE.TorusGeometry(.045, .011, 4, 10), bronze, true],
    glass: [new THREE.CylinderGeometry(.12, .12, .24, 6), glass, false],
    rope: [cylinder(.012, .012, 5), rope, true],
    bulb: [new THREE.SphereGeometry(.062, 8, 6), bulbs, false],
    bulbCap: [new THREE.CylinderGeometry(.033, .043, .04, 6), bronze, true],
  };
  // A bent trunk and softly lobed crowns change their silhouette with viewpoint.
  const trunkPos = definitions.trunk[0].getAttribute('position');
  for (let i = 0; i < trunkPos.count; i++) {
    const y = trunkPos.getY(i);
    trunkPos.setX(i, trunkPos.getX(i) + .055 * Math.sin((y + .5) * 4));
  }
  definitions.trunk[0].computeVertexNormals();
  const crownPos = definitions.crown[0].getAttribute('position');
  for (let i = 0; i < crownPos.count; i++) {
    const x = crownPos.getX(i), y = crownPos.getY(i), z = crownPos.getZ(i);
    const k = 1 + .075 * Math.sin(x * 8 + z * 3) * Math.cos(y * 7 - z * 4);
    crownPos.setXYZ(i, x * k, y * k, z * k);
  }
  definitions.crown[0].computeVertexNormals();

  function add(name, x, y, z, sx = 1, sy = 1, sz = 1, q = null, color = null) {
    if (!batches.has(name)) batches.set(name, []);
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    if (q) dummy.quaternion.copy(q); else dummy.quaternion.identity();
    dummy.updateMatrix();
    batches.get(name).push({ matrix: dummy.matrix.clone(), color });
  }
  function segment(name, a, b, radiusScale = 1) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const d = end.clone().sub(start), mid = start.clone().add(end).multiplyScalar(.5);
    add(name, mid.x, mid.y, mid.z, radiusScale, d.length(), radiusScale,
      new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
  }

  for (const t of plan.trees) {
    const s = t.size / 1.85, x = t.x + .5, z = t.y + .5;
    const h = ((Math.imul(t.x + 13, 73856093) ^ Math.imul(t.y + 7, 19349663) ^ plan.seed) >>> 0);
    const angle = (h % 628) / 100;
    const color = new THREE.Color().setHSL(.43 + (h % 7) / 120, .12, .86 + (h % 9) / 100);
    add('trunk', x, .2 + .65 * s, z, s, 1.3 * s, s);
    for (let j = 0; j < 3; j++) {
      const a = angle + j * Math.PI * 2 / 3;
      const dx = Math.cos(a), dz = Math.sin(a);
      segment('root', [x, .43, z], [x + dx * .39, .22, z + dz * .39], s);
      segment('branch', [x, .75 * s, z], [x + dx * .31 * s, 1.46 * s, z + dz * .31 * s], s);
      add('crown', x + dx * .28 * s, 1.48 * s, z + dz * .28 * s, .44 * s, .43 * s, .44 * s, null, color);
    }
    add('crown', x, 1.93 * s, z, .48 * s, .46 * s, .48 * s, null, color);
  }

  const lampPositions = [];
  for (const l of plan.lamps) {
    const x = l.x + .5, z = l.y + .88, y = .65;
    if (!plan.trees.some(t => t.x === l.x && t.y === l.y)) add('trunk', x, .85, z - .38, .5, 1.3, .5);
    // Arm and hook attach to a trunk-side support, entirely inside the wall cell.
    segment('branch', [x, 1.05, z - .38], [x, 1.05, z], .45);
    add('hook', x, y + .35, z);
    add('cage', x, y + .29, z, 1, .04, 1);
    add('glass', x, y, z);
    add('roof', x, y + .21, z);
    for (const dy of [-.14, .14]) add('frame', x, y + dy, z);
    for (let j = 0; j < 6; j++) {
      const a = j * Math.PI / 3;
      add('cage', x + Math.cos(a) * .13, y, z + Math.sin(a) * .13, 1, .28, 1);
    }
    lampPositions.push({ x, y, z });
  }

  const palette = [0xffd47a, 0xffc46e, 0xffd99a, 0xf0a28d, 0xa9d5b3, 0xffd47a, 0xffc46e];
  for (const s of plan.garlands) {
    const x0 = s.x0 + .5, x1 = s.x1 + .5, z = s.y + .72;
    const point = t => [x0 + (x1 - x0) * t, 1.5 - .22 * Math.sin(Math.PI * t), z];
    for (let j = 0; j < 16; j++) segment('rope', point(j / 16), point((j + 1) / 16));
    for (let j = 0; j < 7; j++) {
      const [x, y] = point((j + .5) / 7);
      segment('rope', [x, y, z], [x, y - .09, z], .6);
      add('bulbCap', x, y - .09, z);
      add('bulb', x, y - .16, z, 1, 1.15, 1, null, new THREE.Color(palette[j]));
    }
  }

  const stats = { kind: 'solid-mesh-v1', billboardCount: 0, batches: 0, instances: 0, triangles: 0, geometryTypes: [] };
  for (const [name, [geometry, material, shadow]] of Object.entries(definitions)) {
    const placements = batches.get(name);
    if (!placements?.length) { geometry.dispose(); continue; }
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    mesh.name = 'forest-3d-' + name;
    placements.forEach((p, i) => { mesh.setMatrixAt(i, p.matrix); if (p.color) mesh.setColorAt(i, p.color); });
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    group.add(mesh);
    stats.batches++;
    stats.instances += placements.length;
    stats.triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3 * placements.length;
    stats.geometryTypes.push(geometry.type);
  }
  return { stats, lampPositions };
}
