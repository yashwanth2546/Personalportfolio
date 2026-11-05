// @ts-nocheck
// The hero's little adventure, built on the forest: a fox companion, a sword stuck in a shrine somewhere in the jungle,
// a sleeping dragon that will not let Marty near without it, and the chest the dragon guards (it opens the "Let's talk" form).
import * as THREE from 'three';
import { buildCrown } from './crown';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const cue = (name, detail) => window.dispatchEvent(new CustomEvent('forest:cue', { detail: { name, ...detail } }));   // hook for sound later
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, k) => a + (b - a) * k;
const angLerp = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
const BOXG = new THREE.BoxGeometry(1, 1, 1), rr = (a, b) => a + Math.random() * (b - a);

export function buildQuest(env) {
  const { scene, host, hgt, solid, ix, topAt, blocked, live, mv, getRig, say, play, FIRE, SWORD, LAIR, B, M } = env;
  const at = (x, z) => hgt[ix(Math.round(x), Math.round(z))];
  const toCamp = Math.atan2(FIRE.x - LAIR.x, FIRE.z - LAIR.z);   // the dragon starts out facing the campfire
  const st = { sword: false, hearts: 3, hp: 6, stage: 0, opened: false };
  const HP = 6, now = () => performance.now();

  /* ---- a little quest card (top left) ---- */
  const hud = document.createElement('div'); hud.className = 'fquest';
  hud.innerHTML = '<div class="fq-k">Quest</div><div class="fq-t"></div><div class="fq-h" aria-label="Hearts"><i>♥</i><i>♥</i><i>♥</i></div><div class="fq-d" hidden><span>Dragon</span><b><i></i></b></div><button class="fq-r" type="button" hidden>Play again</button>';
  host.appendChild(hud);
  const qT = hud.querySelector('.fq-t'), qH = [...hud.querySelectorAll('.fq-h i')], qD = hud.querySelector('.fq-d'), qDI = qD.querySelector('b i'), qR = hud.querySelector('.fq-r');
  const TXT = ['Explore the jungle. Somewhere in it, a sword.', 'Sword in hand. Something big sleeps in the jungle to the east.', 'Fight! Click to swing, F to roll, jump over the fire.', 'Dragon down. Open the treasure chest.', 'Crown claimed. Nathan Drake is available for hire.'];
  const paint = () => { qT.textContent = TXT[st.stage]; qH.forEach((h, i) => h.classList.toggle('off', i >= st.hearts)); qD.hidden = !(st.stage === 2); qDI.style.width = (st.hp / HP * 100) + '%'; qR.hidden = st.stage < 3; hud.dataset.stage = st.stage; };
  const setStage = n => { st.stage = n; paint(); };

  /* ---- weapons: one model for the shrine and for Marty's hand (blade points up, grip at the origin) ---- */
  const makeSword = s => { const g = new THREE.Group(); const m = (c, o) => M(c, { metalness: .55, roughness: .35, ...o });
    B(.06, .22, .06, '#5a3a22', 0, 0, 0, g); B(.11, .06, .11, '#d9a520', 0, -.14, 0, g, { metalness: .6, roughness: .35 }); B(.34, .06, .1, '#d9a520', 0, .14, 0, g, { metalness: .6, roughness: .35 });
    B(.12, .76, .04, '#e4edf5', 0, .55, 0, g, { metalness: .7, roughness: .25, emissive: '#7fd8ff', emissiveIntensity: .35 }); B(.08, .1, .035, '#e4edf5', 0, .98, 0, g, { metalness: .7, roughness: .25, emissive: '#7fd8ff', emissiveIntensity: .35 });
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g; };

  /* ---- the shrine in the jungle ---- */
  const sy = at(SWORD.x, SWORD.z), shrine = new THREE.Group(); shrine.position.set(SWORD.x, sy, SWORD.z); scene.add(shrine);
  B(3, .4, 3, '#6f7a68', 0, .2, 0, shrine); B(2, .6, 2, '#838b7e', 0, .7, 0, shrine); B(1.2, .5, 1.2, '#9aa194', 0, 1.25, 0, shrine);
  for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { B(.5, 1.6 + Math.abs(x) * .2, .5, '#6f7a68', x, .8, z, shrine); B(.3, .2, .3, '#4f9a45', x, 1.7, z, shrine); }   // mossy corner stones
  const prop = makeSword(2.1); prop.position.y = 2.7; shrine.add(prop);
  const beam = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: '#9be7ff', transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending })); beam.scale.set(.6, 9, .6); beam.position.y = 5; shrine.add(beam);
  const shLight = new THREE.PointLight('#9be7ff', 3, 8, 1.5); shLight.position.y = 3; shrine.add(shLight);
  live.push(t => { if (st.sword) return; prop.rotation.y = t * 1.4; prop.position.y = 2.7 + Math.sin(t * 2) * .18; beam.material.opacity = .12 + Math.sin(t * 3) * .04; shLight.intensity = 2.6 + Math.sin(t * 4) * .6; });

  /* ---- the dragon's lair ---- */
  const gy = at(LAIR.x, LAIR.z), DR = new THREE.Group(); DR.position.set(LAIR.x, gy, LAIR.z); DR.rotation.y = toCamp; scene.add(DR);
  const flashMats = [];
  const dB = (w, h, d, col, x, y, z, parent, o) => { const mat = new THREE.MeshStandardMaterial({ color: col, roughness: .8, ...o }), m = new THREE.Mesh(BOXG, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); if (!o || !o.emissive) flashMats.push(mat); return m; };
  let body = new THREE.Group(); DR.add(body);
  dB(2.4, 1.9, 3.8, '#3f9a45', 0, 2.3, 0, body); dB(1.9, .5, 3.4, '#ecd890', 0, 1.4, .1, body);
  for (let i = 0; i < 5; i++) dB(.3, .55, .35, '#efe6cf', 0, 3.4 - (i > 3 ? .15 : 0), -1.4 + i * .75, body);
  for (const [x, z] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) { dB(.8, 1.4, .9, '#2f7d3a', x, .7, z, DR); dB(.8, .2, .5, '#efe6cf', x, .1, z + .45, DR); }
  let neck = new THREE.Group(); neck.position.set(0, 2.8, 1.6); body.add(neck); dB(1.2, 1.2, 1.4, '#3f9a45', 0, .2, .3, neck); dB(1.05, 1.1, 1.2, '#3f9a45', 0, .9, .8, neck);
  let head = new THREE.Group(); head.position.set(0, 1.5, 1.5); neck.add(head);
  dB(1.6, 1.2, 1.6, '#46a84c', 0, 0, 0, head); dB(1.05, .65, 1.2, '#3a8f40', 0, -.2, 1.2, head); dB(.14, .14, .1, '#111', -.28, 0, 1.82, head); dB(.14, .14, .1, '#111', .28, 0, 1.82, head);
  let eyes = [-1, 1].map(s => dB(.3, .3, .14, '#ffd23f', s * .62, .28, .62, head, { emissive: '#ffb800', emissiveIntensity: 1.2 })); eyes.forEach(e => { e.castShadow = false; });
  for (const s of [-1, 1]) { dB(.22, .9, .22, '#efe6cf', s * .55, .85, -.35, head).rotation.x = -.5; dB(.12, .16, .1, '#fff', s * .3, -.55, 1.7, head); }
  let jaw = new THREE.Group(); jaw.position.set(0, -.5, .5); head.add(jaw); dB(1, .28, 1.2, '#a8332a', 0, 0, .65, jaw);
  let tail = []; { let par = body; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.position.set(0, i ? 0 : 2, i ? -1.15 : -1.9); par.add(g); const s = 1.6 - i * .22; dB(s * .9, s * .85, 1.3, i % 2 ? '#3a8f40' : '#3f9a45', 0, 0, -.6, g); if (i === 5) dB(.3, .3, .7, '#efe6cf', 0, 0, -1.4, g); par = g; tail.push(g); } }
  let wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 1.1, 3.1, -.3); body.add(w); dB(3.4, .2, .2, '#2f7d3a', s * 1.7, 0, 0, w); dB(3, .08, 2.4, '#c43c2f', s * 1.6, 0, -1.2, w); dB(.2, .2, 2.2, '#2f7d3a', s * 3, 0, -1.1, w); return w; });
  const fireG = new THREE.Group(); fireG.position.set(0, -.2, 1.9); head.add(fireG); fireG.visible = false;
  const flames = ['#ffe27a', '#ffb23f', '#ff6a1f', '#ff3b10'].map((c, i) => { const m = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .8 })); m.position.z = 1.2 + i * 2.1; m.scale.set(.8 + i * .9, .8 + i * .9, 2.4); fireG.add(m); return m; });
  const mouthL = new THREE.PointLight('#ff7a2a', 0, 18, 1.4); fireG.add(mouthL);
  const zs = [0, 1, 2].map(() => { const m = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.scale.set(.3, .3, .06); head.add(m); return m; });
  for (let dx = -1; dx <= 1; dx++) for (let dz = -2; dz <= 2; dz++) solid[ix(LAIR.x + dx, LAIR.z + dz)] = 1;
  const voxelKids = [...DR.children];   // the stand-in dragon, swapped for the model once it has loaded
  // a ring of scorched stones, fixed to the ground so they do not turn with the dragon
  const lair = new THREE.Group(); lair.position.set(LAIR.x, gy, LAIR.z); scene.add(lair);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .2, r = 5.6 + (i % 3) * .4; B(.7 + (i % 2) * .4, .5 + (i % 3) * .4, .7, ['#4a4744', '#5b5753', '#3d3a38'][i % 3], LAIR.x + Math.cos(a) * r - LAIR.x, at(LAIR.x + Math.cos(a) * r, LAIR.z + Math.sin(a) * r) - gy + .3, Math.sin(a) * r, lair); }

  const D = { mode: 'sleep', t: 0, yaw: toCamp, hurt: 0, dead: false, dieT: 0, flash: 0, dmg: false, warnAt: 0, tickAt: 0, sleepT: 0 };
  const wake = () => { cue('dragon-wake'); D.mode = 'wake'; D.t = 0; say('That is a very big dragon.', 2600, true); };
  const dragonDist = () => Math.hypot(mv.x - LAIR.x, mv.z - LAIR.z);

  /* ---- the chest it guards ---- */
  const cp = { x: LAIR.x + Math.sin(toCamp) * 5.2, z: LAIR.z + Math.cos(toCamp) * 5.2 }, chest = new THREE.Group(); chest.position.set(cp.x, at(cp.x, cp.z), cp.z); chest.visible = false; chest.rotation.y = toCamp + Math.PI; scene.add(chest);
  B(1.6, .9, 1.1, '#7a4f2b', 0, .45, 0, chest); B(1.7, .35, 1.2, '#d9a520', 0, 1.05, 0, chest, { metalness: .5, roughness: .4 }); B(.26, .4, .12, '#fff1a8', 0, .75, .58, chest, { emissive: '#ffd23f', emissiveIntensity: .8 });
  const cBeam = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending })); cBeam.scale.set(.8, 30, .8); cBeam.position.y = 15; chest.add(cBeam);
  const cLight = new THREE.PointLight('#ffd23f', 3, 9, 1.5); cLight.position.y = 1.6; chest.add(cLight);
  // the crown inside the chest: the same gold crown the page's Marty wears for his Joker card
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,90,1)'); g.addColorStop(.45, 'rgba(255,170,40,.35)'); g.addColorStop(1, 'rgba(255,150,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const makeCrown = lift => buildCrown(THREE, lift);
  const crownProp = makeCrown(.2); crownProp.visible = false; scene.add(crownProp); const cr = { t: -1 };
  const wearCrown = () => { const r = getRig(); if (!r || r.head.userData.crowned) return; const c = makeCrown(0); c.scale.setScalar(r.M.crown.s); c.position.copy(r.M.crown.p); c.rotation.z = -.12; r.head.add(c); r.head.userData.crowned = true; window.__crown = true; window.dispatchEvent(new Event('forest:crown')); };

  /* ---- the fox: a small companion that follows Marty around ---- */
  const FX = new THREE.Group(); scene.add(FX); const fox = { x: env.SPAWN.x - 1.4, z: env.SPAWN.z + 1.6, yaw: 0, hop: 0, vy: 0, y: 0, moving: 0, sit: 0 };
  const O1 = '#e8833a', W1 = '#fff4e0', K1 = '#2b1d16';
  const fb = new THREE.Group(); FX.add(fb); B(.62, .5, 1, O1, 0, .55, 0, fb); B(.52, .3, .3, W1, 0, .42, .42, fb);
  const fh = new THREE.Group(); fh.position.set(0, .88, .62); fb.add(fh); B(.7, .6, .58, O1, 0, 0, 0, fh); B(.34, .24, .3, W1, 0, -.12, .4, fh); B(.11, .09, .06, K1, 0, -.04, .56, fh);
  for (const s of [-1, 1]) { B(.1, .12, .05, K1, s * .18, .1, .3, fh); B(.16, .34, .12, O1, s * .22, .44, -.02, fh); B(.08, .16, .1, K1, s * .22, .54, -.02, fh); }
  const ft = new THREE.Group(); ft.position.set(0, .68, -.5); fb.add(ft); B(.3, .3, .75, O1, 0, .1, -.32, ft); B(.32, .32, .3, W1, 0, .12, -.78, ft);
  const fl = [[-.2, .36], [.2, .36], [-.2, -.34], [.2, -.34]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, .32, z); FX.add(g); B(.17, .36, .17, '#3a2a22', 0, -.16, 0, g); return g; });
  FX.scale.setScalar(1.15); FX.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const hearts = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: '#ff5d8f', transparent: true, opacity: 0 })); m.scale.setScalar(.22); scene.add(m); return { m, t: 9 }; });
  const foxFree = (x, z) => { const tx = Math.round(x), tz = Math.round(z); return !solid[ix(tx, tz)] && topAt(tx, tz) - fox.y < 1.15; };
  const cheer = () => { fox.vy = 5; hearts.forEach((h, i) => { h.t = -i * .18; }); };

  /* ---- markers: a label above whatever Marty should look for next ---- */
  const markers = [];
  const addMarker = (sym, label, x, y, z, on, goal) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'fpin fq-pin'; el.innerHTML = `<b>${sym}</b><span>${label}</span>`; el.setAttribute('aria-label', label + ': walk there');
    el.addEventListener('click', () => { mv.goal = { x: goal.x, z: goal.z }; host.focus({ preventScroll: true }); }); host.appendChild(el); markers.push({ el, x, y, z, on }); };
  addMarker('?', 'Something shiny', SWORD.x, sy + 5, SWORD.z, () => !st.sword && Math.hypot(mv.x - SWORD.x, mv.z - SWORD.z) < 13, { x: SWORD.x + 1.8, z: SWORD.z + 1.8 });
  addMarker('!', 'Dragon', LAIR.x, gy + 8, LAIR.z, () => st.sword && !D.dead && dragonDist() < 18, { x: LAIR.x + Math.sin(toCamp) * 8, z: LAIR.z + Math.cos(toCamp) * 8 });
  addMarker('★', 'Treasure', cp.x, at(cp.x, cp.z) + 3.4, cp.z, () => D.dead && !st.opened, { x: cp.x + Math.sin(toCamp) * 2, z: cp.z + Math.cos(toCamp) * 2 });

  /* ---- Marty's sword: hung on his right hand every frame after the pose is set ---- */
  let sword = null; const qLocal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, .45, 1).normalize());
  const equip = () => { const r = getRig(); if (!r || sword) return; const L = r.M.A + r.M.B; sword = makeSword(L * 1.15); r.torso.add(sword); r.cig.visible = false; };
  const afterPose = () => { const r = getRig(); if (!sword || !r) return; sword.position.copy(r.cig.position); sword.quaternion.copy(r.armR.fore.quaternion).multiply(qLocal); };

  /* ---- fighting ---- */
  const kick = { x: 0, z: 0 }; let invuln = 0, swingCd = 0, hitAt = 0, dodgeCd = 0;
  const hurtMarty = (fromX, fromZ) => { if (now() < invuln) return; invuln = now() + 1400; st.hearts--; const d = Math.hypot(mv.x - fromX, mv.z - fromZ) || 1; kick.x = (mv.x - fromX) / d * 9; kick.z = (mv.z - fromZ) / d * 9; paint();
    if (st.hearts <= 0) { say('Nathan is out cold. Back to camp.', 2800, true); setTimeout(() => { mv.x = env.SPAWN.x; mv.z = env.SPAWN.z; mv.y = topAt(mv.x, mv.z); st.hearts = 3; paint(); D.mode = 'sleep'; D.t = 0; }, 900); } else say(['Ow.', 'That was hot.', 'Rude.'][st.hearts % 3], 1400, true); };
  // the dragon is hit where it actually is: a few spheres on its body, neck, head and tail (measured from the sword, not from its middle)
  let HB = () => [[body, 0, 2.3, 0, 2.1], [neck, 0, .6, .5, 1.3], [head, 0, 0, .6, 1.4], [tail[1], 0, 0, -.6, 1.2], [tail[3], 0, 0, -.6, 1], [tail[5], 0, 0, -.6, .9]];
  const _hp = new THREE.Vector3();
  const hitboxes = () => { DR.updateMatrixWorld(true); const out = [], add = (o, x, y, z, r) => { o.localToWorld(_hp.set(x, y, z)); out.push({ x: _hp.x, y: _hp.y, z: _hp.z, r }); };
    for (const [o, x, y, z, r] of HB()) add(o, x, y, z, r * DR.scale.x); return out; };
  const reach = (fwd) => { const cx = mv.x + Math.sin(mv.heading) * fwd, cz = mv.z + Math.cos(mv.heading) * fwd, cy = mv.y + 1.3; let best = null, bd = 1e9; for (const b of hitboxes()) { const d = Math.hypot(b.x - cx, b.y - cy, b.z - cz) - b.r; if (d < bd) { bd = d; best = b; } } return { d: bd, box: best }; };
  const sparks = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0 })); m.scale.setScalar(.2); m.visible = false; scene.add(m); return { m, vx: 0, vy: 0, vz: 0, t: 9 }; });
  const burst = (x, y, z) => sparks.forEach(p => { p.m.position.set(x, y, z); p.vx = rr(-4, 4); p.vy = rr(2, 6); p.vz = rr(-4, 4); p.t = 0; p.m.visible = true; });
  const swing = () => { const t = now(); if (t < swingCd) return; swingCd = t + 800; const r = reach(0); if (r.d < 5.5) { mv.heading = Math.atan2(r.box.x - mv.x, r.box.z - mv.z); kick.x += Math.sin(mv.heading) * 5.5; kick.z += Math.cos(mv.heading) * 5.5; } play('attack', 1.1, 0); hitAt = t + 620; };
  const strike = () => { if (D.dead) return; const r = reach(1); if (r.d > 2.2) { if (dragonDist() < 16) say('Missed. Get closer.', 1000, true); return; } burst(mv.x + Math.sin(mv.heading) * 1.4, mv.y + 1.6, mv.z + Math.cos(mv.heading) * 1.4); st.hp--; D.hurt = .5; D.flash = 1; if (D.mode === 'sleep') D.mode = 'idle'; else if (D.mode !== 'wake') { D.mode = 'hurt'; D.t = 0; } paint();
    if (st.hp <= 0) { cue('dragon-dead'); D.dead = true; D.dieT = 0; D.mode = 'dead'; chest.visible = true; setStage(3); say('Dragon down!', 2600, true); play('celebrate', 3); } else say(st.hp > 3 ? 'Got him.' : 'Almost.', 1200, true); };
  const reset = () => { st.hp = HP; st.hearts = 3; st.opened = false; D.dead = false; D.mode = 'sleep'; D.t = 0; body.rotation.set(0, 0, 0); body.position.set(0, 0, 0); chest.visible = false; setStage(st.sword ? 1 : 0); };
  qR.addEventListener('click', reset);

  /* ---- left click swings; F rolls out of the way (a dash with a moment of invulnerability) ---- */
  const attack = () => { if (!st.sword || D.dead) return false; swing(); return true; };
  const dodge = () => { const t = now(); if (t < dodgeCd || !getRig()) return false; dodgeCd = t + 900; let dx = mv.dirX || 0, dz = mv.dirZ || 0; if (!dx && !dz) { dx = -Math.sin(mv.heading); dz = -Math.cos(mv.heading); } const l = Math.hypot(dx, dz) || 1;
    const moving = !!(mv.dirX || mv.dirZ); if (moving) mv.heading = Math.atan2(dx, dz);   // roll the way you are heading; with no input, back-flip away and keep facing the front
    kick.x = dx / l * 15; kick.z = dz / l * 15; mv.vx = mv.vz = 0; invuln = Math.max(invuln, t + 650); mv.roll = { t0: t, dur: 550, sign: moving ? 1 : -1 }; return true; };

  /* ---- pressing E ---- */
  const interact = () => {
    if (!st.sword && Math.hypot(mv.x - SWORD.x, mv.z - SWORD.z) < 3.6) { pickup(); return true; }
    if (st.sword && !D.dead) { if (reach(0).d < 5.5) { swing(); return true; } if (dragonDist() < 16) { say('Closer. The sword is not that long.', 1800, true); return true; } }
    if (D.dead && !st.opened && Math.hypot(mv.x - cp.x, mv.z - cp.z) < 3.6) { st.opened = true; cr.t = 0; crownProp.visible = true; cue('chest-open'); say('Something gold in there.', 1800, true); play('celebrate', 2.4); return true; }
    return false; };
  const pickup = () => { cue('sword'); st.sword = true; shrine.remove(prop); beam.visible = false; shLight.intensity = 0; equip(); setStage(1); play('celebrate', 2); say('A sword! Now, about that dragon.', 3200, true); };

  /* ---- every frame ---- */
  const dx_ = new THREE.Vector3();
  function update(t, dt) {
    const r = getRig(), tm = now(), dd = dragonDist();
    if (st.sword === false && Math.hypot(mv.x - SWORD.x, mv.z - SWORD.z) < 1.7) pickup();
    if (st.sword && !sword) equip();
    if (hitAt && tm > hitAt) { hitAt = 0; strike(); }
    if (kick.x || kick.z) { const nx = mv.x + kick.x * dt, nz = mv.z + kick.z * dt; if (!blocked(nx, mv.z, mv.y)) mv.x = nx; if (!blocked(mv.x, nz, mv.y)) mv.z = nz; const k = Math.pow(.01, dt); kick.x *= k; kick.z *= k; if (Math.hypot(kick.x, kick.z) < .2) kick.x = kick.z = 0; }
    if (st.stage === 1 && dd < 18 && !D.seen) { D.seen = true; cue('dragon-near', { distance: dd }); say('Something big is breathing over there.', 2800, true); }
    if (st.stage === 1 && st.sword && !D.dead && dd < 11 && D.mode !== 'sleep') setStage(2);
    // ---- the dragon ----
    sparks.forEach(p => { p.t += dt; if (p.t > .55) { p.m.visible = false; return; } p.vy -= 14 * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; p.m.material.opacity = 1 - p.t / .55; });
    D.t += dt; D.flash = Math.max(0, D.flash - dt * 3); D.hurt = Math.max(0, D.hurt - dt);
    let neckX = .9, jawX = 0, eyeS = .12, fire = false, wingFold = .8, bodyY = 0;
    if (D.dead) { D.dieT += dt; const k = Math.min(1, D.dieT / 1.4); body.rotation.z = k * 1.25; body.position.y = -k * .5; neckX = 1.1; wingFold = 1; eyeS = .05; D.flash = 0; fireG.visible = false; mouthL.intensity = 0; }
    else {
      const face = Math.atan2(mv.x - LAIR.x, mv.z - LAIR.z);
      if (D.mode === 'sleep') { if (dd < 9.5) wake(); else if (dd < 7.5) wake(); }
      else if (D.mode === 'wake') { D.yaw = angLerp(D.yaw, face, Math.min(1, dt * 3)); neckX = lerp(.9, -.15, clamp(D.t / 1)); eyeS = lerp(.12, 1, clamp(D.t / .6)); wingFold = lerp(.8, -.2, clamp(D.t / 1)); if (D.t > 1.1) { D.mode = 'idle'; D.t = -.4; } }
      else {
        D.yaw = angLerp(D.yaw, face, Math.min(1, dt * (D.mode === 'breathe' ? 1.1 : 3))); neckX = -.15; eyeS = 1; wingFold = -.2;
        if (D.mode === 'idle') { neckX = -.12 + Math.sin(t * 2) * .05; wingFold = -.2 + Math.sin(t * 3) * .08;
          if (dd > 26) { D.sleepT += dt; if (D.sleepT > 3) { D.mode = 'sleep'; D.sleepT = 0; } } else D.sleepT = 0;
          if (!st.sword) { if (dd < 7.5 && tm > D.warnAt) { D.warnAt = tm + 4500; D.mode = 'telegraph'; D.t = 0; D.dmg = false; say('Not without a sword. Go find one.', 3200, true); } }
          else if (dd < 15 && D.t > 2.6) { D.mode = 'telegraph'; D.t = 0; D.dmg = true; } }
        else if (D.mode === 'telegraph') { const k = clamp(D.t / 1.1); neckX = lerp(-.15, -.6, k); jawX = k * .45; eyes.forEach(e => { e.material.emissive.set('#ff2a10'); e.material.emissiveIntensity = 1.6; }); if (D.t > 1.1) { D.mode = 'breathe'; D.t = 0; D.done = false; } }
        else if (D.mode === 'breathe') { fire = true; neckX = .05; jawX = .6;
          // the cone in front of the mouth: you are hit if you are standing in it and not in the air
          if (!D.done && D.t > .25) { const fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), ox = mv.x - LAIR.x, oz = mv.z - LAIR.z, along = ox * fx + oz * fz, side = Math.abs(ox * fz - oz * fx), air = mv.y - topAt(mv.x, mv.z) > .8;
            if (along > 1.2 && along < 10 && side < .12 * along + 1.1) { D.done = true; if (D.dmg) { if (!air) hurtMarty(LAIR.x, LAIR.z); } else { kick.x = (mv.x - LAIR.x) / (dd || 1) * 11; kick.z = (mv.z - LAIR.z) / (dd || 1) * 11; } } }
          if (D.t > .95) { D.mode = 'idle'; D.t = -.3; } }
        else if (D.mode === 'hurt') { neckX = .5; jawX = .3; wingFold = .3; if (D.t > .55) { D.mode = 'idle'; D.t = -.5; } }
        if (D.mode !== 'telegraph') eyes.forEach(e => { e.material.emissive.set('#ffb800'); e.material.emissiveIntensity = 1.2; });
      }
      DR.rotation.y = D.yaw; mouthL.intensity = fire ? 14 + Math.sin(t * 40) * 3 : 0; fireG.visible = fire;
      if (fire) flames.forEach((m, i) => { const s = 1 + Math.sin(t * 22 + i * 1.7) * .12; m.scale.set((.8 + i * .9) * s, (.8 + i * .9) * s, 2.4); });
      body.rotation.z = 0; body.position.y = Math.sin(t * (D.mode === 'sleep' ? 1.1 : 2.2)) * (D.mode === 'sleep' ? .06 : .04);
    }
    neck.rotation.x = lerp(neck.rotation.x, neckX, Math.min(1, dt * 7)); jaw.rotation.x = lerp(jaw.rotation.x, jawX, Math.min(1, dt * 10));
    eyes.forEach(e => { e.scale.y = lerp(e.scale.y, (e.userData.sy || .3) * eyeS, Math.min(1, dt * 12)); });
    wings.forEach((w, i) => { const s = i ? 1 : -1, flap = (D.mode === 'telegraph' || D.mode === 'breathe') ? Math.sin(t * 8) * .35 : 0; w.rotation.z = s * (-wingFold * .8 + flap); });
    tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 1.6 - i * .6) * (D.mode === 'sleep' ? .08 : .22); });
    zs.forEach((m, i) => { const on = D.mode === 'sleep' && !D.dead, p = (t * .35 + i / 3) % 1; m.visible = on; m.position.set(.2 + p * .7, .9 + p * 1.8, .4 + i * .15); m.material.opacity = on ? Math.sin(p * Math.PI) * .9 : 0; });
    flashMats.forEach(m => { if (D.flash > 0) { m.emissive.set('#ffffff'); m.emissiveIntensity = D.flash * .8; } else { m.emissive.set(m.userData.e || '#000000'); m.emissiveIntensity = m.userData.ei || 0; } });
    // ---- chest and shrine glow ----
    if (cr.t >= 0) { cr.t += dt; const r = getRig(), bx_ = cp.x, bz_ = cp.z, by_ = at(cp.x, cp.z);
      if (cr.t < 1.2) { const k = cr.t / 1.2, e = 1 - (1 - k) * (1 - k); crownProp.position.set(bx_, by_ + .9 + e * 1.9, bz_); crownProp.scale.setScalar(1 + e * 1.2); crownProp.rotation.y = cr.t * 3; }
      else if (cr.t < 2.1 && r) { const k = (cr.t - 1.2) / .9, e = k * k * (3 - 2 * k); r.head.getWorldPosition(_hp); _hp.y += .75; crownProp.position.set(lerp(bx_, _hp.x, e), lerp(by_ + 2.8, _hp.y, e) + Math.sin(Math.PI * k) * .6, lerp(bz_, _hp.z, e)); crownProp.scale.setScalar(lerp(2.2, .8, e)); crownProp.rotation.y = cr.t * 3 + k * 4; }
      else { cr.t = -1; crownProp.visible = false; wearCrown(); cue('crown'); setStage(4); say('A crown. It suits him.', 2800, true); play('celebrate', 2.2); setTimeout(() => document.querySelector('[data-book]')?.click(), 2600); } }
    if (chest.visible) { const k = Math.min(1, (D.dieT - 1) / .6); chest.scale.setScalar(Math.max(.01, k * (1 + (1 - k) * .3))); cBeam.visible = !st.opened; cLight.intensity = st.opened ? 0 : 3 + Math.sin(t * 4) * .6; chest.children[1].rotation.x = st.opened ? -.9 : 0; }
    // ---- the fox ----
    const hx = Math.sin(mv.heading), hz = Math.cos(mv.heading), fighting = D.mode !== 'sleep' && !D.dead && dd < 20, back = fighting ? 5 : 2.3;
    const tx = mv.x - hx * back + hz * .9, tz = mv.z - hz * back - hx * .9, dxf = tx - fox.x, dzf = tz - fox.z, df = Math.hypot(dxf, dzf);
    if (df > 18) { fox.x = tx; fox.z = tz; }
    const spd = clamp(df * 3.2, 0, 7.8) * (df > .5 ? 1 : 0), sx = dxf / (df || 1) * spd * dt, sz = dzf / (df || 1) * spd * dt;
    if (spd > .1) { if (foxFree(fox.x + sx, fox.z)) fox.x += sx; if (foxFree(fox.x, fox.z + sz)) fox.z += sz; fox.yaw = angLerp(fox.yaw, Math.atan2(dxf, dzf), Math.min(1, dt * 10)); }
    else fox.yaw = angLerp(fox.yaw, Math.atan2(mv.x - fox.x, mv.z - fox.z), Math.min(1, dt * 3));
    fox.moving += ((spd > .6 ? 1 : 0) - fox.moving) * Math.min(1, dt * 10); fox.sit += ((spd < .1 && Math.hypot(mv.x - fox.x, mv.z - fox.z) < 4 ? 1 : 0) - fox.sit) * Math.min(1, dt * 4);
    const ground = topAt(fox.x, fox.z); fox.vy -= 24 * dt; fox.y += fox.vy * dt; if (fox.y <= ground) { fox.y = ground; fox.vy = Math.max(0, fox.vy < -1 ? 0 : fox.vy); }
    FX.position.set(fox.x, fox.y + Math.abs(Math.sin(t * 13)) * .1 * fox.moving, fox.z); FX.rotation.y = fox.yaw;
    fb.position.y = -fox.sit * .22; fb.rotation.x = -fox.sit * .5; fh.rotation.x = fox.sit * .5; ft.rotation.y = Math.sin(t * (fox.moving ? 14 : 7)) * .55; ft.rotation.x = fox.sit * .3;
    fl.forEach((g, i) => { g.rotation.x = Math.sin(t * 14 + (i === 0 || i === 3 ? 0 : Math.PI)) * .8 * fox.moving; });
    hearts.forEach(h => { h.t += dt; const p = h.t; h.m.visible = p > 0 && p < 1.3; h.m.position.set(fox.x + Math.sin(p * 5) * .2, fox.y + 1.4 + p * 1.2, fox.z); h.m.material.opacity = p > 0 ? Math.max(0, 1 - p / 1.3) : 0; h.m.rotation.y = p * 3; });
  }

  /* ---- the real dragon: an OBJ made of 158 cuboids, split into parts that move (neck + head, jaw, two wings, a four-part tail) ---- */
  const useModel = obj => {
    const metas = []; obj.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox, c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()); metas.push({ o, c, sz }); } });
    if (metas.length < 50) throw new Error('dragon model looks wrong');
    const nBody = new THREE.Group(), P = { neck: [0, 3.1, .5], head: [0, 4.8, 1.3], jaw: [0, 4.75, 1.1], tail: [[0, 1, -1.5], [0, .95, -2.7], [0, .85, -3.7], [0, .8, -4.4]] };
    const mk = (parent, w, prev) => { const g = new THREE.Group(); g.position.set(w[0] - (prev ? prev[0] : 0), w[1] - (prev ? prev[1] : 0), w[2] - (prev ? prev[2] : 0)); parent.add(g); return g; };
    const nNeck = mk(nBody, P.neck), nHead = mk(nNeck, P.head, P.neck), nJaw = mk(nNeck, P.jaw, P.neck);
    const nTail = []; P.tail.forEach((w, i) => nTail.push(mk(i ? nTail[i - 1] : nBody, w, i ? P.tail[i - 1] : null)));
    const nWings = [-1, 1].map(sd => ({ g: mk(nBody, [sd * 1, 3.05, .1]), piv: [sd * 1, 3.05, .1] })), nEyes = [], flash = [];
    // Most boxes are rebuilt out of many small cubes (surface only) so the dragon has the grain of a real voxel build: one InstancedMesh per part and shade
    const buckets = new Map(), V = .2, hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
    const SHADE = { dark: ['#2a2631', .55, 0, 0], mem: ['#8d8b9a', .35, '#5a2cc4', .1] };
    for (const m of metas) { const { o, c, sz } = m; o.geometry.translate(-c.x, -c.y, -c.z); let parent = nBody, piv = [0, 0, 0], cls = 'dark', col = null, extra = {};
      const wing = Math.abs(c.x) > 1.2 && c.y > 2.5 && Math.abs(c.z) < .7, jawb = !wing && c.y > 4.5 && c.y < 4.9 && c.z > 1.3 && Math.abs(c.x) < .4, eye = !wing && Math.abs(c.x) > .45 && c.y > 4.4 && c.y < 4.7 && sz.y < .25 && c.z > .6 && c.z < 1.0, spike = Math.abs(c.x) < .15 && sz.x < .25;
      if (wing) { const w = nWings[c.x < 0 ? 0 : 1]; parent = w.g; piv = w.piv; if (!(sz.z <= .38 && sz.x * sz.y > 1.4)) cls = 'dark'; else cls = 'mem'; }
      else if (eye) { parent = nNeck; piv = P.neck; cls = 'eye'; col = '#ffd23f'; extra = { emissive: '#ffb800', emissiveIntensity: 1.4 }; }
      else if (jawb) { parent = nJaw; piv = P.jaw; }
      else if (c.z < -1.6) { const k = c.z > -2.7 ? 0 : c.z > -3.7 ? 1 : c.z > -4.4 ? 2 : 3; parent = nTail[k]; piv = P.tail[k]; if (spike) { cls = 'box'; col = '#3a2820'; extra = { emissive: '#ff5a1f', emissiveIntensity: .5 }; } }
      else if (c.z > 0 && c.y > 3.2 && Math.abs(c.x) < 1.05) { parent = nNeck; piv = P.neck; if (c.y > 5.8 && sz.y > .4) { cls = 'box'; col = '#cfc6d8'; } else if (spike) { cls = 'box'; col = '#3a2820'; extra = { emissive: '#ff5a1f', emissiveIntensity: .5 }; } }
      else if (c.y < .3 && sz.y < .4) { cls = 'box'; col = '#e9e2d4'; } else if (spike) { cls = 'box'; col = '#3a2820'; extra = { emissive: '#ff5a1f', emissiveIntensity: .5 }; }
      if (cls === 'dark' || cls === 'mem') { const key = parent.uuid + cls; let bk = buckets.get(key); if (!bk) buckets.set(key, bk = { parent, piv, cls, cells: [] });
        const nx = Math.max(1, Math.round(sz.x / V)), ny = Math.max(1, Math.round(sz.y / V)), nz = Math.max(1, Math.round(sz.z / V)), cx = sz.x / nx, cy = sz.y / ny, cz = sz.z / nz;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) { if (i && i < nx - 1 && j && j < ny - 1 && k && k < nz - 1) continue; bk.cells.push([c.x - sz.x / 2 + (i + .5) * cx - piv[0], c.y - sz.y / 2 + (j + .5) * cy - piv[1], c.z - sz.z / 2 + (k + .5) * cz - piv[2], cx, cy, cz, c.x + (i + .5) * cx, c.y + (j + .5) * cy, c.z + (k + .5) * cz]); }
        o.parent?.remove(o); continue; }
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: .3, metalness: eye ? 0 : .5, ...extra }); if (extra.emissive) { mat.userData.e = extra.emissive; mat.userData.ei = extra.emissiveIntensity; }
      o.material = mat; o.castShadow = !eye; o.receiveShadow = true; o.position.set(c.x - piv[0], c.y - piv[1], c.z - piv[2]); o.parent?.remove(o); parent.add(o);
      if (eye) { o.userData.sy = 1; nEyes.push(o); } else if (!extra.emissive) flash.push(mat); }
    const tmpO = new THREE.Object3D(), tcol = new THREE.Color();
    for (const bk of buckets.values()) { const [base, metal, em, ei] = SHADE[bk.cls], mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .35, metalness: metal }); if (em) { mat.emissive.set(em); mat.emissiveIntensity = ei; mat.userData.e = em; mat.userData.ei = ei; }
      const im = new THREE.InstancedMesh(BOXG, mat, bk.cells.length); im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
      bk.cells.forEach((q, i) => { tmpO.position.set(q[0], q[1], q[2]); tmpO.scale.set(q[3] * 1.01, q[4] * 1.01, q[5] * 1.01); tmpO.updateMatrix(); im.setMatrixAt(i, tmpO.matrix); tcol.set(base).offsetHSL(0, 0, (hash(q[6], q[7], q[8]) - .5) * .09 + Math.min(.06, Math.max(0, (q[7] - 3) * .012))); im.setColorAt(i, tcol); });
      bk.parent.add(im); flash.push(mat); }
    nHead.add(fireG, ...zs); fireG.position.set(0, -.15, 1.1);
    voxelKids.forEach(k => DR.remove(k)); DR.add(nBody); DR.scale.setScalar(.85);
    flashMats.length = 0; flashMats.push(...flash);
    body = nBody; neck = nNeck; head = nHead; jaw = nJaw; eyes = nEyes; tail = nTail; wings = nWings.map(w => w.g);
    HB = () => [[body, 0, 2, -.2, 2.1], [neck, 0, .9, .3, 1.3], [head, 0, 0, .4, 1.3], [tail[0], 0, 0, -.5, 1.3], [tail[1], 0, 0, -.5, 1.1], [tail[3], 0, 0, -.5, .9]];
  };
  if (env.dragonUrl) new OBJLoader().loadAsync(env.dragonUrl).then(useModel).catch(e => console.warn('forest: dragon model not used', e));

  paint();
  return { update, afterPose, interact, attack, dodge, cheer, markers, state: st };
}
