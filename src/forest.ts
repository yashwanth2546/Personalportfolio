// @ts-nocheck
// The hero playground: a voxel forest you steer Marty through with WASD. Written for this site with three.js.
// Marty explores a jungle with a fox, finds a sword, and fights a dragon for its chest (which holds a crown). The same rig and clips as the rest of the page.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clipPose } from './marty-clips';
import { buildQuest } from './forest-quest';

const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v); };
const fbm = (x, z, o = 3) => { let a = .5, s = 0, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); f *= 2; a *= .5; } return s; };
let seed = 11; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rand();

/* ---------- the map: 84 x 84 tiles, tile (i, j) sits at world (i - 42, j - 42). Heights are whole blocks. ---------- */
const N = 84, O = N / 2, WATER_TOP = -.35;
const ix = (x, z) => (z + O) * N + (x + O), inMap = (x, z) => x >= -O + 1 && x <= O - 2 && z >= -O + 1 && z <= O - 2;
const SPAWN = { x: 1, z: 3 }, FIRE = { x: -2, z: 1 };
const SWORD = { x: -4, z: 27 }, LAIR = { x: 30, z: 6 };   // where the sword waits in the jungle, and where the dragon sleeps
const SPOTS = [{ ...SWORD, r: 4.5 }, { ...LAIR, r: 7 }];   // kept flat and clear of trees
const PEAKS = [{ x: -14, z: -10, h: 15, r: 12 }, { x: -4, z: -19, h: 14, r: 11 }, { x: -24, z: -4, h: 13, r: 10 }];
function buildMap() {
  const hgt = new Int8Array(N * N), kind = new Uint8Array(N * N), solid = new Uint8Array(N * N);   // kind: 0 grass 1 dirt 2 sand 3 water 4 rock
  const POND = { x: 9, z: 9, rx: 5.5, rz: 3.6 };
  for (let z = -O; z < O; z++) for (let x = -O; x < O; x++) {
    let h = Math.max(0, Math.floor(fbm(x * .07 + 5, z * .07 + 9) * 3.4 - .75));
    const dSpawn = Math.hypot(x - 2, z - 1); if (dSpawn < 10) h = 0; else if (dSpawn < 13) h = Math.min(h, 1);
    for (const l of SPOTS) if (Math.hypot(x - l.x, z - l.z) < l.r) h = 0;
    const wd = Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz); if (wd < 1.45) h = 0;
    const i = ix(x, z); hgt[i] = h;
    if (wd < 1) { kind[i] = 3; solid[i] = 1; } else if (wd < 1.3) kind[i] = 2;
    // mountains: a ridged range along the back and the far flanks, with three tall peaks (kind 5; high tiles are rock, then snow)
    const u = -(x + z) / 1.414, v = (x - z) / 1.414;   // u: how far "up the screen", v: how far right
    let mh = Math.max(smooth(11, 24, u), smooth(22, 36, Math.abs(v)) * .8);
    if (mh > 0) { const rg = 1 - Math.abs(2 * fbm(x * .09 + 30, z * .09 + 3, 4) - 1); mh *= 3 + 8 * rg * rg; }
    for (const p of PEAKS) mh += Math.max(0, p.h * (1 - Math.hypot(x - p.x, z - p.z) / p.r));
    mh = Math.min(40, Math.floor(mh)); if (mh >= 2 && !SPOTS.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 1.5)) { hgt[i] = mh; kind[i] = 5; }
    if (!inMap(x, z)) { hgt[i] = Math.max(3, hgt[i]); solid[i] = 1; if (kind[i] !== 5) kind[i] = 4; }
  }
  // dirt paths from the campfire to each landmark's doorstep
  const path = (ax, az, bx, bz) => { let x = ax, z = az; for (let s = 0; s < 80 && (x !== bx || z !== bz); s++) { if (Math.abs(bx - x) > Math.abs(bz - z) || (bz === z)) x += Math.sign(bx - x); else z += Math.sign(bz - z);
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) { const i = ix(x + dx, z + dz); if (kind[i] !== 3) { kind[i] = 1; hgt[i] = 0; solid[i] = 0; } } } };
  // winding trails out of camp into the jungle: one to each far place, so there is always a way to go (the ends stay unmarked)
  const trail = pts => { for (let i = 0; i + 1 < pts.length; i++) path(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); };
  trail([[FIRE.x, FIRE.z + 2], [2, 9], [-2, 15], [-3, 20], [SWORD.x, SWORD.z - 4]]);
  trail([[FIRE.x + 2, FIRE.z], [9, -1], [15, 3], [20, 2], [LAIR.x - 6, LAIR.z - 1]]);
  const clear = new Uint8Array(N * N);   // no trees within two tiles of a trail
  for (let z = -O; z < O; z++) for (let x = -O; x < O; x++) if (kind[ix(x, z)] === 1) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (inMap(x + dx, z + dz)) clear[ix(x + dx, z + dz)] = 1;
  return { hgt, kind, solid, clear };
}

export async function initForest(ctx) {
  const { host, martyFromGLB, martyUrl, openOffer, reduce } = ctx;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const { hgt, kind, solid, clear } = buildMap();
  const topAt = (x, z) => { const i = ix(Math.round(x), Math.round(z)); return kind[i] === 3 ? WATER_TOP : hgt[i]; };

  /* renderer, camera (orthographic: crisp voxels, steady framing), lights */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement; cv.className = 'forest-canvas'; cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'An interactive 3D voxel jungle. Use W A S D to walk Nathan Drake, hold the right mouse button to turn the camera, find the sword, then fight the dragon with the left mouse button.'); host.appendChild(cv);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1.6, .5, 260);
  const look = { yaw: Math.PI / 4, pitch: .68, dist: 26 };   // third-person orbit around Marty; right mouse drag turns it
  const FWD = new THREE.Vector3(-1, 0, -1).normalize(), RIGHT = new THREE.Vector3(1, 0, -1).normalize();   // walking directions follow the camera
  scene.fog = new THREE.Fog('#bfdcf0', 38, 105); scene.background = new THREE.Color('#bfdcf0');
  const hemi = new THREE.HemisphereLight('#cfe6ff', '#6b5a3a', 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 140 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .06; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#ffffff', .8); fill.position.set(30, 22, 30); scene.add(fill);   // from the camera's side, so Marty is never a silhouette
const fireL = new THREE.PointLight('#ff9a3c', 0, 14, 1.6); fireL.position.set(FIRE.x, 1.4, FIRE.z); scene.add(fireL);

  /* foliage that is between the camera and Marty dissolves (dithered) so he is never hidden by a tree */
  const xray = { uCamP: { value: new THREE.Vector3() }, uMP: { value: new THREE.Vector3() } };
  const xmat = o => { const m = new THREE.MeshStandardMaterial(o); m.alphaToCoverage = true; m.onBeforeCompile = sh => { Object.assign(sh.uniforms, xray);
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vXW;\nvoid main() {').replace('#include <project_vertex>', `#include <project_vertex>
      vec4 xw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        xw = instanceMatrix * xw;
      #endif
      vXW = (modelMatrix * xw).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec3 uCamP; uniform vec3 uMP; varying vec3 vXW;\nvoid main() {').replace('#include <alphatest_fragment>', `
      { vec3 ab = uMP - uCamP; float tt = clamp(dot(vXW - uCamP, ab) / dot(ab, ab), 0.0, 1.0); float dd = length(vXW - (uCamP + ab * tt));
        diffuseColor.a *= mix(1.0, smoothstep(1.8, 5.2, dd), smoothstep(0.995, 0.93, tt)); }
      #include <alphatest_fragment>`); }; return m; };

  /* materials and boxes */
  const BOX = new THREE.BoxGeometry(1, 1, 1), mats = {};
  const M = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: .9, metalness: 0, ...o })); };
  const B = (w, h, d, col, x, y, z, parent, o) => { const m = new THREE.Mesh(BOX, M(col, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const tmp = new THREE.Object3D(), tc = new THREE.Color();
  const instanced = (n, mat, cast, recv) => { const im = new THREE.InstancedMesh(BOX, mat, n); im.castShadow = cast; im.receiveShadow = recv; im.instanceMatrix.setUsage(THREE.StaticDrawUsage); scene.add(im); return im; };
  const put = (im, i, x, y, z, sx, sy, sz, col) => { tmp.position.set(x, y, z); tmp.scale.set(sx, sy, sz); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix); im.setColorAt(i, tc.set(col)); };

  /* the ground: one column per tile */
  { const G = ['#6fae3e', '#68a63a', '#79b845', '#62a038'], HG = ['#5f9a38', '#74b043', '#6aa83e'];
    const im = instanced(N * N, new THREE.MeshStandardMaterial({ roughness: 1 }), false, true); let n = 0;
    for (let z = -O; z < O; z++) for (let x = -O; x < O; x++) { const i = ix(x, z), k = kind[i], h = k === 3 ? WATER_TOP : hgt[i];
      let col = k === 1 ? '#b58a58' : k === 2 ? '#e3cf98' : k === 3 ? '#49a8cf' : k === 4 ? '#7d7f7b' : k === 5 ? (hgt[i] >= 12 ? "#f4f7fb" : hgt[i] >= 9 ? "#a9acb0" : hgt[i] >= 6 ? '#7d7f7b' : hgt[i] >= 4 ? '#5f7f46' : '#58853a') : (hgt[i] ? HG : G)[(hash(x, z) * 4) | 0 % 4] || G[0];
      tc.set(col).offsetHSL(0, 0, (hash(x * 3, z * 5) - .5) * .05); tmp.position.set(x, (h - 3) / 2, z); tmp.scale.set(1, h + 3, 1); tmp.updateMatrix(); im.setMatrixAt(n, tmp.matrix); im.setColorAt(n, tc); n++; }
    im.count = n; }

  /* trees, rocks, flowers */
  { const trunks = [], leaves = [], rocks = [], flowers = [], vines = [], ferns = [];
    const free = (x, z) => inMap(x, z) && kind[ix(x, z)] === 0 && !clear[ix(x, z)] && !solid[ix(x, z)] && hgt[ix(x, z)] <= 1 && Math.hypot(x - FIRE.x, z - FIRE.z) > 6.5 && Math.hypot(x - SPAWN.x, z - SPAWN.z) > 2.5 && !SPOTS.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 1);
    const dens = (x, z) => fbm(x * .11 + 40, z * .11 + 7, 3);
    for (let t = 0; t < 6000 && trunks.length < 300; t++) { const x = Math.round(rr(-O + 2, O - 3)), z = Math.round(rr(-O + 2, O - 3)); if (!free(x, z) || dens(x, z) < .5 + (Math.hypot(x - FIRE.x, z - FIRE.z) < 13 ? .3 : 0) - (Math.hypot(x - SWORD.x, z - SWORD.z) < 15 ? .04 : 0) || solid[ix(x, z)]) continue;
      if (trunks.some(q => Math.abs(q.x - x) + Math.abs(q.z - z) < 4)) continue; trunks.push({ x, z, h: 6 + ((rand() * 4) | 0), pine: rand() < .22 }); solid[ix(x, z)] = 1; }
    for (const tr of trunks) { const base = hgt[ix(tr.x, tr.z)], gs = [['#2f9a3c', '#3fb04a', '#238a3a', '#58c050'], ['#2f6b3a', '#3a7a40', '#285c33', '#2c6a46']][tr.pine ? 1 : 0];
      if (tr.pine) { for (let L = 0; L < 5; L++) { const r = 2 - (L >> 1) + (L === 4 ? -1 : 0), y = base + tr.h - 3 + L; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (Math.abs(dx) + Math.abs(dz) > r + 1 || rand() < .1) continue; leaves.push([tr.x + dx, y, tr.z + dz, gs[(rand() * 4) | 0]]); } } }
      else { for (let dy = 0; dy < 3; dy++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { const d = dx * dx + dz * dz + (dy === 1 ? 0 : 3) + (dy === 2 ? 4 : 0); if (d > 8.5 || rand() < .12) continue; leaves.push([tr.x + dx, base + tr.h + dy, tr.z + dz, gs[(rand() * 4) | 0]]); }
        for (let v = 0; v < 5; v++) { const a = rand() * 6.283, r = 2.4 + rand(); vines.push([Math.round(tr.x + Math.cos(a) * r), base + tr.h - 0, Math.round(tr.z + Math.sin(a) * r), 3 + ((rand() * 4) | 0)]); } } }
    const trm = instanced(trunks.reduce((s, t) => s + t.h, 0), xmat({ roughness: 1 }), true, true); let n = 0;
    for (const tr of trunks) for (let y = 0; y < tr.h; y++) put(trm, n++, tr.x, hgt[ix(tr.x, tr.z)] + y + .5, tr.z, .78, 1, .78, y % 2 ? '#7a4f2b' : '#6b4424');
    const lm = instanced(leaves.length, xmat({ roughness: 1 }), true, true); leaves.forEach((l, i) => put(lm, i, l[0], l[1] + .5, l[2], 1, 1, 1, l[3]));
    const vm = instanced(vines.length, xmat({ roughness: 1 }), false, true); vines.forEach((v, i) => put(vm, i, v[0], v[1] - v[3] / 2 + .5, v[2], .16, v[3], .16, i % 2 ? '#2f8f3a' : '#3a9d44'));
    for (let t = 0; t < 1800 && ferns.length < 260; t++) { const x = Math.round(rr(-O + 2, O - 3)), z = Math.round(rr(-O + 2, O - 3)); if (!free(x, z) || solid[ix(x, z)] || dens(x, z) < .42) continue; ferns.push([x + rr(-.3, .3), z + rr(-.3, .3)]); }
    const fnm = instanced(ferns.length * 2, xmat({ roughness: 1 }), false, false); ferns.forEach(([x, z], i) => { const y = topAt(x, z); put(fnm, i * 2, x, y + .25, z, 1.1, .5, .22, '#2fa244'); put(fnm, i * 2 + 1, x, y + .25, z, .22, .5, 1.1, '#38b24d'); });
    for (let t = 0; t < 700 && rocks.length < 46; t++) { const x = Math.round(rr(-O + 2, O - 3)), z = Math.round(rr(-O + 2, O - 3)); if (!free(x, z) || solid[ix(x, z)] || Math.hypot(x, z) < 6) continue; rocks.push([x, z, 1 + ((rand() * 2) | 0)]); solid[ix(x, z)] = 1; }
    const rm = instanced(rocks.reduce((s, r) => s + r[2], 0), xmat({ roughness: .95 }), true, true); n = 0;
    for (const [x, z, h] of rocks) for (let y = 0; y < h; y++) put(rm, n++, x, hgt[ix(x, z)] + y + .5, z, .95 - y * .25, 1, .95 - y * .25, ['#8e908c', '#7d7f7b', '#9a9c97'][(rand() * 3) | 0]);
    for (let t = 0; t < 1400 && flowers.length < 260; t++) { const x = rr(-O + 2, O - 3), z = rr(-O + 2, O - 3), tx = Math.round(x), tz = Math.round(z); if (!free(tx, tz) || solid[ix(tx, tz)]) continue; flowers.push([x, z, ['#ff6b9d', '#fff6e0', '#ffd23f', '#ff8c42', '#b36bff'][(rand() * 5) | 0]]); }
    const fm = instanced(flowers.length * 2, xmat({ roughness: 1 }), false, false); flowers.forEach(([x, z, c], i) => { const y = topAt(x, z); put(fm, i * 2, x, y + .2, z, .08, .4, .08, '#3d7a2f'); put(fm, i * 2 + 1, x, y + .45, z, .22, .2, .22, c); }); }

  const live = [];   // things that animate
  { const g = new THREE.Group(); g.position.set(FIRE.x, hgt[ix(FIRE.x, FIRE.z)], FIRE.z); scene.add(g);   // the campsite: fire, log seats, a tent
    // stones laid by hand (uneven), on a patch of scorched ground
    B(2.5, .06, 2.5, '#2a2420', 0, .03, 0, g);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, s = .42 + hash(i, 3) * .2; B(s + .1, .3 + hash(i, 7) * .35, s, ['#8a8d88', '#757872', '#9a9c97'][i % 3], Math.cos(a) * 1.5, .2, Math.sin(a) * 1.5, g).rotation.y = a; }
    // five logs leaning together
    for (let i = 0; i < 5; i++) { const lg = new THREE.Group(); lg.rotation.y = i / 5 * 6.283; g.add(lg); const l = B(.3, 1.6, .3, i % 2 ? '#6b4424' : '#7a4f2b', .5, .75, 0, lg); l.rotation.z = .42; }
    // flames: stacked layers that flicker out of step
    const FL = [[.95, .9, '#ff4a12'], [.7, 1.2, '#ff7a1f'], [.48, 1.45, '#ffb52e'], [.26, 1.15, '#fff1a8']];
    const flames = FL.map(([w, h, c]) => ({ m: B(w, h, w, c, 0, h / 2 + .25, 0, g, { emissive: c, emissiveIntensity: 1.8 }), h }));
    flames.forEach(f => { f.m.castShadow = false; });
    // sparks rising and fading (additive: dimming the colour is the fade)
    const SN = 26, spPos = new Float32Array(SN * 3), spCol = new Float32Array(SN * 3), spSeed = Array.from({ length: SN }, () => [rand(), rr(.22, .5), rr(-1, 1), rr(-1, 1)]), sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: .22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; g.add(sparks);
    // smoke drifting off with the wind
    const smoke = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#b9b5ae', transparent: true, opacity: 0, depthWrite: false })); g.add(m); return m; });
    // light pooled on the ground
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; { const c = gc.getContext('2d'), gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,170,70,1)'); gr.addColorStop(.5, 'rgba(255,120,40,.35)'); gr.addColorStop(1, 'rgba(255,100,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glow.rotation.x = -Math.PI / 2; glow.position.y = .07; g.add(glow);
    // two log seats and a tent that faces the fire
    for (const [x, z, r] of [[-2.8, .6, Math.PI / 2], [-.6, -3, 0]]) { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = r; g.add(s); B(2.4, .5, .6, '#7a4f2b', 0, .25, 0, s); B(.1, .52, .62, '#caa571', 1.22, .25, 0, s); B(.1, .52, .62, '#caa571', -1.22, .25, 0, s); }
    const tp = [-4.8, -3.4], tent = new THREE.Group(); tent.position.set(tp[0], 0, tp[1]); tent.rotation.y = Math.atan2(-tp[0], -tp[1]); g.add(tent);
    for (const sd of [-1, 1]) { B(.14, 2.4, 3, sd < 0 ? '#d9573b' : '#c94b31', sd * .82, .9, 0, tent).rotation.z = sd * .75; }   // leaning in to meet at the ridge
    B(.16, .16, 3.1, '#5a3a22', 0, 1.78, 0, tent); [[.2, 2.9], [.6, 2.2], [1, 1.5], [1.4, .8]].forEach(([y, w]) => { B(w, .4, .1, '#1a1410', 0, y, 1.52, tent); B(w, .4, .1, '#c94b31', 0, y, -1.52, tent); });   // open door at the front, closed back B(.3, .5, .5, '#4a6fa5', 1.5, .25, 1.1, tent);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) solid[ix(Math.round(FIRE.x + tp[0]) + dx, Math.round(FIRE.z + tp[1]) + dz)] = 1;
    for (const [x, z] of [[-2.8, .6], [-.6, -3]]) solid[ix(Math.round(FIRE.x + x), Math.round(FIRE.z + z))] = 1;
    solid[ix(FIRE.x, FIRE.z)] = 1;
    live.push((t, night) => {
      flames.forEach((f, i) => { const s = .85 + Math.sin(t * 9 + i * 2) * .22 + Math.sin(t * 13 + i) * .1; f.m.scale.y = f.h * s; f.m.position.set(Math.sin(t * 5 + i) * .05 * i, .25 + f.h * s / 2, Math.cos(t * 4 + i) * .05 * i); f.m.rotation.y = t * (1 + i * .6); });
      for (let i = 0; i < SN; i++) { const s = spSeed[i], p = (t * s[1] + s[0]) % 1, k = (1 - p) * (1 - p); spPos[i * 3] = s[2] * .55 * p + Math.sin(t * 2 + i) * .15; spPos[i * 3 + 1] = .9 + p * 3.4; spPos[i * 3 + 2] = s[3] * .55 * p; spCol[i * 3] = k; spCol[i * 3 + 1] = .62 * k; spCol[i * 3 + 2] = .2 * k; }
      sg.attributes.position.needsUpdate = sg.attributes.color.needsUpdate = true;
      smoke.forEach((m, i) => { const p = (t * .2 + i / 5) % 1; m.position.set(Math.sin(t * .7 + i * 2) * .3 + p * 1.2, 1.9 + p * 4.4, Math.cos(t * .5 + i) * .3 - p * .4); m.scale.setScalar(.45 + p * 1.2); m.rotation.y = i + t * .3; m.material.opacity = (night ? .1 : .2) * Math.sin(p * Math.PI); });
      const fl = .85 + Math.sin(t * 11) * .08 + Math.sin(t * 17) * .07; fireL.intensity = (night ? 24 : 6) * fl; glow.material.opacity = (night ? .95 : .3) * fl; });
  }
  // cloud shadows drifting over the forest (the clouds themselves stay out of the picture)
  const shadows = []; { const cm = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(BOX, cm); b.scale.set(rr(3, 7), 1, rr(3, 6)); b.position.set(rr(-5, 5), 0, rr(-4, 4)); b.castShadow = true; g.add(b); } g.position.set(rr(-30, 30), 30, rr(-30, 30)); scene.add(g); shadows.push(g); } }
  // fireflies for the night theme
  const fly = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#d8ff7a', size: .35, transparent: true, opacity: 0, depthWrite: false })); const flyBase = [];
  { const p = []; for (let i = 0; i < 46; i++) { const x = rr(-12, 18), z = rr(-14, 14); flyBase.push([x, rr(.8, 2.6), z, rand() * 6]); p.push(x, 1, z); } fly.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); scene.add(fly); }

  /* Marty */
  const MS = 1.3;   // Marty is a bit bigger than a block-person so he reads next to the landmarks
  let rig = null; const mv = { x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, grounded: true, heading: Math.PI * .75, move: 0, run: 0, stride: 0, runStride: 0, goal: null, one: null, wasAir: false, seat: null, sit: 0, vx: 0, vz: 0, roll: null };
  mv.y = topAt(mv.x, mv.z);
  try { const gltf = await new GLTFLoader().loadAsync(martyUrl); rig = martyFromGLB(THREE, gltf); rig.root.traverse(o => { if (o.isMesh) { o.castShadow = o !== rig.ember; o.receiveShadow = true; } }); scene.add(rig.root); }
  catch (e) { console.warn('forest: Marty could not load', e); }
  const bubble = document.createElement('div'); bubble.className = 'bubble'; document.body.appendChild(bubble); let bubbleUntil = 0, lastSay = 0;
  const say = (t, ms = 3200, force) => { const n = performance.now(); if (!rig || (!force && n - lastSay < 1800)) return; lastSay = n; bubble.textContent = t; bubble.classList.add('show'); bubbleUntil = n + ms; };
  const play = (id, s = 2.2, off = 0) => { mv.one = { id, t0: performance.now() - off * 1000, until: performance.now() + s * 1000 }; };
  const _ke = new THREE.Euler(), _kq = new THREE.Quaternion(), mix = (a, b, k) => { const o = {}; for (const key in a) o[key] = lerp(a[key], b[key], k); return o; };
  const fk = (a, sh, sx, sy, sz, ex) => { a.upper.position.copy(sh); a.upper.quaternion.setFromEuler(_ke.set(sx, sy, sz)); a.fore.position.copy(a.elbowOff).applyQuaternion(a.upper.quaternion).add(sh); a.fore.quaternion.copy(a.upper.quaternion).multiply(_kq.setFromEuler(_ke.set(ex, 0, 0))); };
  function poseMarty(t) {
    const idle = { ...clipPose('idle', t) }, walk = { ...clipPose('walk', mv.stride / 4.8) }, run = clipPose('run', mv.runStride / 8.2);
    let c = mix(idle, mix(walk, run, mv.run), mv.move); const now = performance.now(), o = mv.one;
    if (o && now < o.until) { const w = Math.min(1, (now - o.t0) / 200, (o.until - now) / 250), b = clipPose(o.id, (now - o.t0) / 1000); c = mix(c, b, w * w * (3 - 2 * w)); }
    if (mv.sit > .002) { const k = mv.sit, SIT = { pelvisY: .3, leftHipX: -1.5, rightHipX: -1.5, leftKneeX: 1.5, rightKneeX: 1.5, leftHipZ: .06, rightHipZ: -.06, leftBootX: -.1, rightBootX: -.1, torsoRotX: .04, leftShoulderX: -.5, rightShoulderX: -.5, leftElbowX: -1.05, rightElbowX: -1.05, leftShoulderZ: .12, rightShoulderZ: -.12, headRotX: .08 }; for (const key in SIT) if (key in c) c[key] = lerp(c[key], SIT[key], k); }
    const { hips, torso, head, legs, armL, armR, M } = rig;
    hips.position.set(0, c.pelvisY, c.pelvisZ); torso.position.set(0, c.pelvisY, c.pelvisZ); hips.rotation.set(c.pelvisRotX, c.pelvisRotY, c.pelvisRotZ);
    torso.rotation.set(c.pelvisRotX + c.torsoRotX, c.pelvisRotY + c.torsoRotY, c.pelvisRotZ + c.torsoRotZ); torso.scale.set(1, c.torsoScaleY, 1);
    for (const [s, hx, hy, hz, kx, bx] of [['L', c.leftHipX, c.leftHipY, c.leftHipZ, c.leftKneeX, c.leftBootX], ['R', c.rightHipX, c.rightHipY, c.rightHipZ, c.rightKneeX, c.rightBootX]]) { const l = legs[s]; l.leg.rotation.set(hx, hy, hz); l.shin.rotation.x = kx; if (l.boot) l.boot.rotation.x = bx; }
    rig.brows.forEach((b, i) => { b.position.y = i ? c.rightBrowY : c.leftBrowY; b.rotation.z = i ? c.rightBrowRotZ : c.leftBrowRotZ; });
    head.rotation.set(c.headRotX, c.headRotY, c.headRotZ);
    fk(armL, M.shL, c.leftShoulderX, c.leftShoulderY, c.leftShoulderZ, c.leftElbowX); fk(armR, M.shR, c.rightShoulderX, c.rightShoulderY, c.rightShoulderZ, c.rightElbowX); rig.tipOf(rig.cig.position);
    return c.rootY * M.S;
  }

  /* input: WASD always (while the hero is on screen), arrows and space once you click the forest, a joystick on touch */
  const keys = new Set(), joy = { x: 0, y: 0 }; let heroOn = true, pressE = false, focused = false;
  const typing = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const modalOpen = () => /^#(engine|case)-/.test(location.hash);   // a craft page or a project page is open on top
  addEventListener('keydown', e => { if (!heroOn || typing(e) || e.ctrlKey || e.metaKey || e.altKey || modalOpen()) return; const k = e.key.toLowerCase();
    if ('wasd'.includes(k) && k.length === 1) { keys.add(k); e.preventDefault(); }
    else if (focused && k.startsWith('arrow')) { keys.add({ arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' }[k]); e.preventDefault(); }
    else if (k === 'shift') keys.add('shift'); else if (k === 'e') pressE = true; else if (k === 'f') { if (!mv.seat) quest.dodge(); } else if (k === 'q') { play('wave', 2.2); say('Hi!', 1600, true); quest.cheer(); }
    else if ((k === ' ' && focused) || k === 'j') { e.preventDefault(); jump(); } });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); if (k.startsWith('arrow')) keys.delete({ arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' }[k]); if (k === 'shift') keys.delete('shift'); });
  addEventListener('blur', () => keys.clear());
  host.tabIndex = 0; host.addEventListener('focus', () => { focused = true; host.classList.add('is-focus'); }); host.addEventListener('blur', () => { focused = false; host.classList.remove('is-focus'); });
  const jump = () => { if (mv.seat) { standUp(); return; } if (mv.grounded && rig) { mv.vy = 8.4; mv.grounded = false; play('jump', 1.4, .32); } };
  host.addEventListener('pointerdown', e => { if (e.target === cv) host.focus({ preventScroll: true }); });
  // hold the right mouse button and drag to turn the camera around Marty
  let orbit = null; host.addEventListener('contextmenu', e => e.preventDefault());
  host.addEventListener('pointerdown', e => { if (e.button === 2 && e.target === cv) { orbit = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch {} host.classList.add("is-look"); } });
  host.addEventListener('pointermove', e => { if (orbit && e.pointerId === orbit.id) { look.yaw -= (e.clientX - orbit.x) * .006; look.pitch = clamp(look.pitch + (e.clientY - orbit.y) * .005, .12, 1.35); orbit.x = e.clientX; orbit.y = e.clientY; } });
  const endLook = e => { if (orbit && e.pointerId === orbit.id) { orbit = null; host.classList.remove('is-look'); } }; host.addEventListener('pointerup', endLook); host.addEventListener('pointercancel', endLook);
  host.addEventListener('pointerdown', e => { if (e.button === 0 && e.pointerType !== 'touch' && e.target === cv && !mv.seat) quest.attack(); });   // left click swings the sword
  host.addEventListener('wheel', e => { if (!focused) return; e.preventDefault(); look.dist = clamp(look.dist * (1 + e.deltaY * .001), 10, 44); }, { passive: false });
  if (coarse) { const pad = document.createElement('div'); pad.className = 'fjoy'; pad.innerHTML = '<i></i>'; const knob = pad.firstChild; host.appendChild(pad); let id = null, cx = 0, cy = 0;
    const set = e => { const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), r = 44, k = d > r ? r / d : 1; knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`; joy.x = dx * k / r; joy.y = dy * k / r; };
    pad.addEventListener('pointerdown', e => { id = e.pointerId; pad.setPointerCapture(id); const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(e); mv.goal = null; });
    pad.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); }); const end = e => { if (e.pointerId === id) { id = null; joy.x = joy.y = 0; knob.style.transform = ''; } }; pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    const act = document.createElement('button'); act.type = 'button'; act.className = 'fact'; act.textContent = 'E'; act.setAttribute('aria-label', 'Interact'); act.addEventListener('click', () => { pressE = true; }); host.appendChild(act);
    const jb = document.createElement('button'); jb.type = 'button'; jb.className = 'fact fjump'; jb.textContent = '↑'; jb.setAttribute('aria-label', 'Jump'); jb.addEventListener('click', jump); host.appendChild(jb);
    const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'fact fjump'; rb.style.bottom = '150px'; rb.textContent = '⟲'; rb.setAttribute('aria-label', 'Roll'); rb.addEventListener('click', () => quest.dodge()); host.appendChild(rb); }
  else { const hint = document.createElement('div'); hint.className = 'fhint'; hint.innerHTML = '<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><span><kbd>Shift</kbd> run</span><span><kbd>Right-drag</kbd> look</span><span><kbd>Click</kbd> swing</span><span><kbd>F</kbd> roll</span><span><kbd>E</kbd> act</span>'; host.appendChild(hint); host._hint = hint; }

  /* sizing: wider field of view and a closer camera on a phone */
  const focus = new THREE.Vector3(mv.x, 0, mv.z); let camD = 26, camP = .68;
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); const portrait = w / h < .85;
    cam.aspect = w / h; cam.fov = portrait ? 62 : 45; look.base = portrait ? 19 : w < 1100 ? 24 : 26; look.dist = look.base; cam.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host); resize();

  /* time of day follows the page's theme switch */
  let night = false; const TOD = { morning: { sky: '#bfdcf0', sun: '#fff1d6', i: 2.8, el: 1.0, hs: '#cfe6ff', hg: '#8a7a52', hi: 1.15, exp: 1 }, evening: { sky: '#efb98c', sun: '#ffb070', i: 2.6, el: .36, hs: '#ffd2a8', hg: '#8c5a3a', hi: .95, exp: 1 }, night: { sky: '#0e1730', sun: '#8aa4ff', i: 1.1, el: .8, hs: '#4a5d9a', hg: '#243052', hi: .85, exp: 1 } };
  function setTod(theme) { const t = TOD[theme] || TOD.morning; night = theme === 'night'; sun.color.set(t.sun); sun.intensity = t.i; hemi.color.set(t.hs); hemi.groundColor.set(t.hg); hemi.intensity = t.hi; renderer.toneMappingExposure = t.exp; sun.userData.el = t.el; scene.fog.color.set(t.sky); scene.background.set(t.sky); fly.material.opacity = night ? .95 : 0; host.dataset.tod = theme; }
  setTod(document.documentElement.dataset.tod || 'morning');

  /* walking, collision, jumping */
  const blocked = (x, z, y) => { for (const [dx, dz] of [[0, 0], [.3, 0], [-.3, 0], [0, .3], [0, -.3]]) { const tx = Math.round(x + dx), tz = Math.round(z + dz); if (!inMap(tx, tz) || solid[ix(tx, tz)]) return true; if (topAt(tx, tz) - y > 1.05) return true; } return false; };
  const quest = buildQuest({ THREE, scene, host, hgt, solid, ix, topAt, blocked, live, mv, getRig: () => rig, say, play, FIRE, SPAWN, SWORD, LAIR, B, M, dragonUrl: martyUrl.replace(/marty\/marty\.glb.*$/, 'dragon/obsidian-voxel-dragon.obj') });
  /* the two log seats: press E beside one to sit, move (or jump) to stand */
  const SEATS = [[FIRE.x - 2.8, FIRE.z + .6], [FIRE.x - .6, FIRE.z - 3]].map(([x, z]) => ({ x, z, face: Math.atan2(FIRE.x - x, FIRE.z - z) }));
  const standUp = () => { const s = mv.seat; if (!s) return; mv.seat = null; mv.x = s.x + Math.sin(s.face) * 1.8; mv.z = s.z + Math.cos(s.face) * 1.8; mv.y = topAt(mv.x, mv.z); };
  let msgState = { moved: false, fire: false, water: false, peak: false };
  const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _c = new THREE.Vector3(), _r = new THREE.Vector3();
  function update(t, dt) {
    let ax = 0, az = 0; const f = FWD;
    let ix_ = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) + joy.x, iz_ = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0) - joy.y;
    if (ix_ || iz_) mv.goal = null; else if (mv.goal) { const dx = mv.goal.x - mv.x, dz = mv.goal.z - mv.z, d = Math.hypot(dx, dz); if (d < .5) { mv.goal = null; } else { const wx = dx / d, wz = dz / d; ix_ = wx * RIGHT.x + wz * RIGHT.z; iz_ = wx * f.x + wz * f.z; } }
    if (mv.seat) { if (ix_ || iz_) standUp(); else { const s = mv.seat; ix_ = iz_ = 0; mv.goal = null; mv.x += (s.x - mv.x) * Math.min(1, dt * 8); mv.z += (s.z - mv.z) * Math.min(1, dt * 8); mv.heading += Math.atan2(Math.sin(s.face - mv.heading), Math.cos(s.face - mv.heading)) * Math.min(1, dt * 8); } }
    mv.sit += ((mv.seat ? 1 : 0) - mv.sit) * Math.min(1, dt * 6);
    const len = Math.hypot(ix_, iz_); if (len > 1) { ix_ /= len; iz_ /= len; }
    ax = RIGHT.x * ix_ + f.x * iz_; az = RIGHT.z * ix_ + f.z * iz_; mv.dirX = ax; mv.dirZ = az; const amt = Math.min(1, Math.hypot(ix_, iz_));
    const running = keys.has('shift') && amt > .1, top_ = running ? 6.2 : 3.4;
    if (mv.seat) mv.vx = mv.vz = 0;
    { const tx = ax * top_, tz = az * top_, dx = tx - mv.vx, dz = tz - mv.vz, dl = Math.hypot(dx, dz), acc = (amt > .05 ? 36 : 50) * (mv.grounded ? 1 : .4), st_ = Math.min(dl, acc * dt); if (dl > 1e-4) { mv.vx += dx / dl * st_; mv.vz += dz / dl * st_; } }
    let stepX = mv.vx * dt, stepZ = mv.vz * dt;
    if (!blocked(mv.x + stepX, mv.z, mv.y)) mv.x += stepX; else { mv.vx = 0; stepX = 0; }
    if (!blocked(mv.x, mv.z + stepZ, mv.y)) mv.z += stepZ; else { mv.vz = 0; stepZ = 0; }
    const moved = Math.hypot(stepX, stepZ); if (amt > .05) { const want = Math.atan2(ax, az); let d = want - mv.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); mv.heading += d * Math.min(1, dt * 14); }
    mv.move += ((amt > .05 ? 1 : 0) - mv.move) * Math.min(1, dt * 9); mv.run += ((running ? 1 : 0) - mv.run) * Math.min(1, dt * 8); mv.stride += moved * 4.4 * (1 - mv.run * .4); mv.runStride += moved * 2.6;
    const top = topAt(mv.x, mv.z);
    if (mv.grounded) { if (top < mv.y - .25) mv.grounded = false; else mv.y += (top - mv.y) * Math.min(1, dt * 22); }
    if (!mv.grounded) { mv.vy -= 26 * dt; mv.y += mv.vy * dt; if (mv.y <= top && mv.vy <= 0) { mv.y = top; mv.vy = 0; mv.grounded = true; } }
    if (kind[ix(Math.round(mv.x), Math.round(mv.z))] === 3) { mv.x -= ax * .4; mv.z -= az * .4; }
    if (amt > .05 && !msgState.moved) { msgState.moved = true; say('There he goes.', 1800, true); }
    // landmarks: who is close?
    const nearSeat = !mv.seat && SEATS.find(s => Math.hypot(mv.x - s.x, mv.z - s.z) < 2.6);
    if (nearSeat && !msgState.seat) { msgState.seat = true; say('A log by the fire. Press E to sit.', 3000); }
    if (pressE) { pressE = false; if (mv.seat) standUp(); else if (nearSeat) { mv.seat = nearSeat; mv.goal = null; play('idle', .1); say('Ahh. This is the good part.', 2600, true); } else if (quest.interact()) {} else if (Math.hypot(mv.x - FIRE.x, mv.z - FIRE.z) < 4.5) { say('Marshmallows later. Dragon first.', 2600, true); play('celebrate', 1.6); } else say('Nothing to press here. Try the jungle.', 2400); }
    quest.update(t, dt);
    if (Math.hypot(mv.x - FIRE.x, mv.z - FIRE.z) < 3.4 && !msgState.fire) { msgState.fire = true; say('Campfire. Cozy. Suspiciously cozy.', 3000); }
    if (mv.y > 5 && !msgState.peak) { msgState.peak = true; say('Mountains. Great view. Zero signal.', 3200, true); }
    if (host._hint && msgState.moved) host._hint.classList.add('quiet');
  }
  setTimeout(() => { if (!msgState.moved && heroOn) say(coarse ? 'Use the stick. I will wait.' : 'WASD. I will wait.', 4200, true); }, 5200);

  /* frame */
  let last = performance.now(), run = false, T = 0; const sunDir = new THREE.Vector3();
  function frame(now) {
    if (!run) return; requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    update(T, dt); live.forEach(fn => fn(T, night));
    shadows.forEach((g, i) => { g.position.x += dt * (1.4 + i * .25); if (g.position.x > 40) g.position.x = -40; });
    if (night) { const fp = fly.geometry.attributes.position; flyBase.forEach(([x, y, z, ph], i) => fp.setXYZ(i, x + Math.sin(T * .5 + ph) * .8, y + Math.sin(T * .9 + ph) * .3, z + Math.cos(T * .4 + ph) * .8)); fp.needsUpdate = true; }
    const drop = window.__roomDropY || 0;
    if (rig) { const lift = poseMarty(T); rig.root.position.set(mv.x, mv.y + lift * MS + drop + mv.sit * .5, mv.z); quest.afterPose(); rig.root.rotation.order = 'YXZ'; rig.root.rotation.y = mv.heading; rig.root.scale.setScalar(MS);
      if (mv.roll) { const k = (performance.now() - mv.roll.t0) / mv.roll.dur; if (k >= 1) { mv.roll = null; rig.root.rotation.x = 0; } else { const e = k * k * (3 - 2 * k); rig.root.rotation.x = mv.roll.sign * e * Math.PI * 2;
          _c.set(0, 1.2, 0); _r.copy(_c).applyEuler(rig.root.rotation); rig.root.position.add(_c.sub(_r)); rig.root.position.y += Math.sin(Math.PI * k) * .3; } } else rig.root.rotation.x = 0; }
    // third-person camera: orbits Marty, never dips under the ground
    FWD.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw)); RIGHT.set(Math.cos(look.yaw), 0, -Math.sin(look.yaw));
    focus.lerp(_p.set(mv.x, mv.y + 1.6, mv.z), 1 - Math.exp(-dt * 8));
    // the camera sits behind Marty on a boom. If a hill or cliff is in the way it first tilts up and over it, then slides in along the boom; it eases back out slowly
    { const gAt = (x, z) => topAt(Math.max(-O + 1, Math.min(O - 2, Math.round(x))), Math.max(-O + 1, Math.min(O - 2, Math.round(z))));
      const boom = pitch => { const cp_ = Math.cos(pitch), dx = Math.sin(look.yaw) * cp_, dy = Math.sin(pitch), dz = Math.cos(look.yaw) * cp_; for (let i = 1; i <= 16; i++) { const d = look.dist * i / 16; if (focus.y + dy * d < gAt(focus.x + dx * d, focus.z + dz * d) + .9) return Math.max(1.6, d - look.dist / 16); } return look.dist; };
      let tp = look.pitch, fr = boom(tp); while (fr < look.dist * .8 && tp < 1.38) { tp += .1; fr = boom(tp); }
      camP += (tp - camP) * (1 - Math.exp(-dt * (tp > camP ? 9 : 2.2))); camD += (fr - camD) * (1 - Math.exp(-dt * (fr < camD ? 14 : 2.5))); }
    { const cp_ = Math.cos(camP); cam.position.set(focus.x + Math.sin(look.yaw) * cp_ * camD, focus.y + Math.sin(camP) * camD, focus.z + Math.cos(look.yaw) * cp_ * camD); }
    cam.lookAt(focus);
    const el = sun.userData.el ?? 1; sunDir.set(-.55, el, -.35).normalize(); sun.position.set(mv.x, 0, mv.z).addScaledVector(sunDir, 60); sun.target.position.set(mv.x, 0, mv.z);
    cam.updateMatrixWorld();
    // pins and the speech bubble ride on the picture
    const r = cv.getBoundingClientRect(), W = host.clientWidth, Hh = host.clientHeight;
    for (const m of quest.markers) { const on = m.on(); if (on) { _q.set(m.x, m.y, m.z).project(cam); if (_q.z > 1) { m.el.style.display = 'none'; continue; } m.el.style.transform = `translate(${((_q.x * .5 + .5) * W).toFixed(1)}px, ${((-_q.y * .5 + .5) * Hh).toFixed(1)}px) translate(-50%, -100%)`; } m.el.style.display = on ? '' : 'none'; }
    if (bubble.classList.contains('show') && rig) { if (performance.now() > bubbleUntil) bubble.classList.remove('show'); else { rig.head.getWorldPosition(_q); _q.y += 1.1 * MS; _q.project(cam); bubble.style.transform = `translate(${(r.left + (_q.x * .5 + .5) * r.width).toFixed(1)}px, ${(r.top + (-_q.y * .5 + .5) * r.height).toFixed(1)}px) translate(-50%, -100%)`; } }
    xray.uCamP.value.copy(cam.position); xray.uMP.value.set(mv.x, mv.y + 1.3, mv.z);
    renderer.render(scene, cam);
  }
  new IntersectionObserver(es => { heroOn = es[0].isIntersecting; host.classList.toggle('is-live', es[0].intersectionRatio > .25); if (heroOn && !run) { run = true; last = performance.now(); requestAnimationFrame(frame); } else if (!heroOn) { run = false; bubble.classList.remove('show'); keys.clear(); } }, { threshold: [.05, .25] }).observe(host);

  // handed to the rest of the page: where Marty is on screen (for the leap onto the page), show/hide, speech, theme
  const _f = new THREE.Vector3(), _h = new THREE.Vector3();
  window.__forest = {
    say, setTod, play, mv, look, cam, get rig() { return rig; },
    setVisible: on => { if (rig) rig.root.visible = on; },
    screen() { const r = cv.getBoundingClientRect(); _f.set(mv.x, mv.y, mv.z).project(cam); _h.set(mv.x, mv.y + 1.9 * MS, mv.z).project(cam);
      const x = r.left + (_f.x * .5 + .5) * r.width, y = r.top + (-_f.y * .5 + .5) * r.height, hy = r.top + (-_h.y * .5 + .5) * r.height; return { x, y, px: Math.max(30, y - hy), yaw: mv.heading - look.yaw }; },
  };
}
