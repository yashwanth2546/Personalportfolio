// @ts-nocheck — ported verbatim from the single-file prototype; add types as it is split into modules.
import * as THREE from 'three';
import Lenis from 'lenis';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FACES } from './data/faces';
import { PHOTOS } from './data/photos';
/* =========================================================
   Page: stage tracking, IST clock, headline weight hover, button fill
   ========================================================= */
const stageEl = document.getElementById('stage');
let STAGE = stageEl.getBoundingClientRect();
const inStage = e => window.__revealed && e.clientX >= STAGE.left && e.clientX <= STAGE.right && e.clientY >= STAGE.top && e.clientY <= STAGE.bottom;

// Smooth scroll like the reference (Lenis), only for mouse and trackpad; phones keep their native scroll.
// Overlays (case studies, engine pages, the phone menu) scroll on their own and pause it.
{ const fine = matchMedia('(pointer: fine)').matches, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !calm) {
    const lenis = new Lenis({ lerp: .085, wheelMultiplier: 1, smoothWheel: true }); window.__lenis = lenis;
    requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    new MutationObserver(() => { document.documentElement.style.overflow === 'hidden' ? lenis.stop() : lenis.start(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  }
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href'); if (id.length < 2 || id.startsWith('#case-')) return;
    const el = document.querySelector(id); if (!el) return; e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: 0, duration: 1.4 }); else el.scrollIntoView({ behavior: 'smooth' }); });
}

// IST clock + time-of-day label
// Theme by the time in Bangalore: 05–16 morning (light), 16–19 evening (golden), 19–05 night (the original look).
// To preview a theme, set FORCE_TOD to 'morning', 'evening' or 'night'. Leave it '' to follow the clock.
const FORCE_TOD = '';
const todTheme = h => FORCE_TOD || (h >= 5 && h < 16 ? 'morning' : h >= 16 && h < 19 ? 'evening' : 'night');
let todPick = '';   // set from the nav menu; '' = follow the clock
const TOD_NAME = { morning: 'Morning', evening: 'Evening', night: 'Night' };
function setTheme(theme) {
  if (document.documentElement.dataset.tod !== theme) { document.documentElement.dataset.tod = theme; window.__todLights?.(theme); }
  document.getElementById('todSelLbl').textContent = TOD_NAME[theme];
  document.getElementById('todSelIc').innerHTML = document.querySelector(`.tod-drop [data-tod="${theme}"] b`).innerHTML;
  document.querySelectorAll('.tod-drop [data-tod], .mnav [data-tod]').forEach(b => b.setAttribute('aria-checked', b.dataset.tod === theme));
}
const pickTod = t => {
  const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date()) % 24;
  todPick = t === todTheme(h) ? '' : t;   // picking the current real time goes back to automatic
  setTheme(todPick || todTheme(h));
};
document.querySelectorAll('.tod-drop [data-tod], .mnav [data-tod]').forEach(b => b.addEventListener('click', () => pickTod(b.dataset.tod)));
function tick() {
  const now = new Date();
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const h = +t.slice(0, 2);
  const tod = FORCE_TOD ? FORCE_TOD[0].toUpperCase() + FORCE_TOD.slice(1) : h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 16 ? 'Afternoon' : h >= 16 && h < 19 ? 'Evening' : 'Night';
  document.getElementById('pillTime').textContent = t;
  document.getElementById('pillTod').textContent = `${tod} in Bangalore, India`;
  setTheme(todPick || todTheme(h));
  document.getElementById('todIcon').innerHTML = tod === 'Night' ? '<path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z"/>' : '<circle cx="8" cy="8" r="3.2"/><g stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"/></g>';
}
tick(); setInterval(tick, 15000);

// Headline: split into letters; weight swells near the cursor
const headline = document.getElementById('headline');
headline.querySelectorAll('.in').forEach(el => { el.innerHTML = [...el.textContent].map(c => `<span class="ch">${c}</span>`).join(''); });
const chars = [...headline.querySelectorAll('.ch')];
let hlRaf = 0, hlX = -1e4, hlY = -1e4;
const paintHeadline = () => {
  hlRaf = 0;
  for (const c of chars) {
    const r = c.getBoundingClientRect(), d = Math.hypot(hlX - (r.left + r.width / 2), hlY - (r.top + r.height / 2));
    const k = Math.max(0, 1 - d / 230), w = 400 + Math.round(300 * k * k * (3 - 2 * k));
    c.style.fontWeight = w;
  }
};
addEventListener('pointermove', e => { hlX = e.clientX; hlY = e.clientY; if (!hlRaf) hlRaf = requestAnimationFrame(paintHeadline); }, { passive: true });
headline.addEventListener('pointerleave', () => { hlX = hlY = -1e4; if (!hlRaf) hlRaf = requestAnimationFrame(paintHeadline); });


// Magnetic buttons: drift toward the cursor, label leads slightly, spring back on leave
document.querySelectorAll('.btn.mag').forEach(b => {
  const lab = b.querySelector('.label'); let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, on = false;
  const step = () => { cx += (tx - cx) * .18; cy += (ty - cy) * .18;
    b.style.setProperty('--mx', cx.toFixed(2) + 'px'); b.style.setProperty('--my', cy.toFixed(2) + 'px'); b.style.setProperty('--ms', on ? 1.015 : 1);
    
    raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .05) ? requestAnimationFrame(step) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  b.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = b.getBoundingClientRect(); on = true; tx = (e.clientX - r.left - r.width / 2) * .06; ty = (e.clientY - r.top - r.height / 2) * .12; kick(); });
  b.addEventListener('pointerleave', () => { on = false; tx = ty = 0; kick(); });
});

// Apple-style liquid glass: displacement map that bends the backdrop only near the rounded edges (convex lens bezel)
function lensMap(w, h, r, bezel) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // signed distance to rounded rect edge + outward normal
    const qx = Math.abs(x + .5 - w / 2) - (w / 2 - r), qy = Math.abs(y + .5 - h / 2) - (h / 2 - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), len = Math.hypot(ox, oy);
    const dist = r - (len + Math.min(Math.max(qx, qy), 0)); // distance inside from edge
    let nx = 0, ny = 0;
    if (len > 0) { nx = ox / len; ny = oy / len; } else if (qx > qy) nx = 1; else ny = 1;
    nx *= Math.sign(x + .5 - w / 2) || 1; ny *= Math.sign(y + .5 - h / 2) || 1;
    const t = Math.max(0, Math.min(1, 1 - dist / bezel));      // 1 at edge → 0 past the bezel
    const m = Math.pow(t, 2.2);                                  // squircle-ish lens falloff
    const i = (y * w + x) * 4;
    img.data[i] = 128 + nx * m * 127; img.data[i + 1] = 128 + ny * m * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c.toDataURL();
}
document.querySelectorAll('.links > div, .tod-sel').forEach(item => {
  const d = item.querySelector('.drop'); if (!d) return;
  item._drop = d; d.classList.add('port'); document.body.appendChild(d);
  let t = 0;
  const place = () => { const r = item.getBoundingClientRect(), glass = document.querySelector('.nav').classList.contains('glass');
    d.style.left = `${(item.classList.contains('tod-sel') ? r.right - d.offsetWidth + 6 : r.left - 6).toFixed(1)}px`; d.style.top = `${(r.top + (glass ? 52 : 48)).toFixed(1)}px`; };
  const open = () => { clearTimeout(t); place();
    if (!d._map) { const w = Math.round(d.offsetWidth), h = Math.round(d.offsetHeight); d._map = lensMap(w, h, 20, 18); d._w = w; d._h = h; }
    const fe = document.getElementById('lgMap'); fe.setAttribute('href', d._map); fe.setAttribute('width', d._w); fe.setAttribute('height', d._h);
    const flt = document.getElementById('lg'); flt.setAttribute('width', d._w); flt.setAttribute('height', d._h);
    d.classList.add('lens'); document.querySelectorAll('.drop.open').forEach(o => o !== d && o.classList.remove('open')); d.classList.add('open'); };
  const close = () => { clearTimeout(t); t = setTimeout(() => d.classList.remove('open'), 140); };
  item.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') open(); }); item.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') close(); });
  d.addEventListener('pointerenter', () => clearTimeout(t)); d.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') close(); });
  d.addEventListener('click', e => { if (e.target.closest('a, button')) d.classList.remove('open'); });
  item.addEventListener('pointerup', e => { if (e.pointerType !== 'touch') return; e.preventDefault(); clearTimeout(t); if (d.classList.contains('open')) d.classList.remove('open'); else open(); });
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && d.classList.contains('open') && !d.contains(e.target) && !item.contains(e.target)) d.classList.remove('open'); }, { passive: true });
  addEventListener('scroll', () => { if (d.classList.contains('open')) place(); }, { passive: true });
});
// Phone / tablet menu: the burger opens a glass sheet (links, time-of-day theme, booking)
{
  const mnav = document.getElementById('mnav'), burger = document.querySelector('.burger');
  const set = on => { mnav.classList.toggle('open', on); burger.classList.toggle('x', on); burger.setAttribute('aria-expanded', on); mnav.setAttribute('aria-hidden', !on); };
  burger.setAttribute('aria-controls', 'mnav'); burger.setAttribute('aria-expanded', 'false');
  burger.addEventListener('click', () => set(!mnav.classList.contains('open')));
  mnav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  addEventListener('pointerdown', e => { if (mnav.classList.contains('open') && !mnav.contains(e.target) && !burger.contains(e.target)) set(false); }, { passive: true });
  addEventListener('resize', () => { if (innerWidth > 1100) set(false); });
}
// Nav: after the first scroll the whole bar becomes a floating liquid-glass bar that rides along
{
  const nav = document.querySelector('.nav'); document.body.appendChild(nav); // out of the hero so it can sit above every section
  let mapW = 0;
  const lens = () => { const w = Math.round(nav.offsetWidth), h = Math.round(nav.offsetHeight); if (!w || w === mapW) return; mapW = w;
    const fe = document.getElementById('lgNavMap'), f = document.getElementById('lgNav');
    fe.setAttribute('href', lensMap(w, h, 20, 18)); fe.setAttribute('width', w); fe.setAttribute('height', h); f.setAttribute('width', w); f.setAttribute('height', h); nav.classList.add('lens'); };
  const upd = () => { const g = scrollY > 8; if (g !== nav.classList.contains('glass')) { nav.classList.toggle('glass', g); if (g) requestAnimationFrame(lens); } };
  addEventListener('scroll', upd, { passive: true }); addEventListener('resize', () => { mapW = 0; if (nav.classList.contains('glass')) lens(); }); upd();
}
// Buttons: white circle grows from where the cursor enters
document.querySelectorAll('.btn').forEach(b => {
  const set = e => { const r = b.getBoundingClientRect(); b.style.setProperty('--x', `${e.clientX - r.left}px`); b.style.setProperty('--y', `${e.clientY - r.top}px`); b.style.setProperty('--d', `${Math.hypot(r.width, r.height) * 2.2}px`); };
  b.addEventListener('pointerenter', set); b.addEventListener('pointerleave', set);
  b.addEventListener('pointerdown', e => { set(e); b.classList.add('tap'); setTimeout(() => b.classList.remove('tap'), 650); });
});

/* =========================================================
   MARTY · built in code
   Marty's body is assets/marty/marty.glb (the original voxel Marty: pixel skin and joggers, black hoodie,
   voxel hair, chunky white sneakers). martyFromGLB() rigs it for walking, sitting and smoking:
   it adds knees, keeps the arm groups for IK and puts the glowing ember on the cigarette.
   If the file can't load, buildMartyBlocks() builds a look-alike in code so the page never breaks.

   Fallback, built in code: the blocky (voxel) Marty: pixel-textured skin and joggers, black hoodie, voxel hair,
   chunky white sneakers, cigarette in his right hand. The rig and joint positions are the
   ones every movement on the page is written for, so only the look lives here.
   Rig:  Buddy ─ Hips ─ Leg_L/R ─ Shin_L/R ─ Sneaker
              └ Torso ─ Neck ─ Head ─ Hair
                      ├ Arm_R ─ UpperArm_R, Forearm_R ─ Hand_R      (2-bone IK)
                      ├ Arm_L ─ UpperArm_L, Forearm_L ─ Hand_L
                      └ Cigarette (follows the right hand's fingertips)
   ========================================================= */
function buildMartyBlocks(THREE, RoundedBoxGeometry, mergeGeometries) { // fallback if marty.glb can't load
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
  // tiny pixel textures, nearest-filtered so they read as voxels
  const pix = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const TX = {
    skin: pix(8, 8, g => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = rnd() * 10 - 5; g.fillStyle = `rgb(${233 + v | 0},${196 + v | 0},${166 + v | 0})`; g.fillRect(x, y, 1, 1); } }),
    pants: pix(16, 32, (g, w, h) => { const t = ['#a9adb2', '#9ea2a7', '#b6babf', '#92969b', '#c0c4c8']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = t[(rnd() * (rnd() < .7 ? 2 : 5)) | 0]; g.fillRect(x, y, 1, 1); } }),
    hoodie: pix(16, 16, (g, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 20 + rnd() * 8 | 0; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(x, y, 1, 1); } }),
  };
  const MAT = {
    skin: new THREE.MeshStandardMaterial({ map: TX.skin, roughness: .75, envMapIntensity: .25 }),
    hoodie: new THREE.MeshPhysicalMaterial({ map: TX.hoodie, roughness: .95, sheen: .5, sheenRoughness: .9, sheenColor: '#3a3a40', envMapIntensity: .25 }),
    hoodieDark: new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 1, envMapIntensity: .2 }),
    pants: new THREE.MeshStandardMaterial({ map: TX.pants, roughness: .95, envMapIntensity: .25 }),
    leather: new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', roughness: .45, clearcoat: .25, envMapIntensity: .45 }),
    sole: new THREE.MeshStandardMaterial({ color: '#f6f5f1', roughness: .6, envMapIntensity: .3 }),
    stitch: new THREE.MeshStandardMaterial({ color: '#d9d8d3', roughness: .6 }),
    cord: new THREE.MeshStandardMaterial({ color: '#6d6d70', roughness: .8 }),
    eye: new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: .4 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#6b3b2c', roughness: .7 }),
    hair: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, envMapIntensity: .3 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: .7 }),
    filter: new THREE.MeshStandardMaterial({ color: '#d9a066', roughness: .7 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .6, .1), toneMapped: false }),
  };
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; };
  const grp = (name, parent) => { const g = new THREE.Group(); g.name = name; if (parent) parent.add(g); return g; };
  const at = (o, x, y, z, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
  const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
  const rbox = (w, h, d, r, m) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * .999), m);
  const cyl = (r0, r1, h, m, seg = 10) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m);

  const M = { HEIGHT: 1.86, hip: .93, shR: V(-.19, .53, 0), shL: V(.19, .53, 0), A: .285, B: .285,
    rest: V(-.15, .38, .2), puff: V(-.06, .58, .2), pocket: V(.08, .12, .15), poleR: V(-.8, -.5, -.3), poleL: V(.9, -.3, -.3), headY: 1.66, sitDrop: -.86 };
  const root = grp('Buddy');

  // ---------- legs: pixel joggers, chunky white sneakers (AF1-style, unbranded) ----------
  const hips = grp('Hips', root); hips.position.y = M.hip;
  hips.add(at(rbox(.36, .12, .21, .02, MAT.pants), 0, -.04, 0));
  function sneaker(side) {
    const g = grp('Sneaker_' + side);
    g.add(at(rbox(.135, .04, .32, .015, MAT.sole), 0, .02, .03));
    for (let i = 0; i < 6; i++) g.add(at(box(.137, .003, .3, MAT.stitch), 0, .006 + i * .0055, .03));       // sole ribbing
    g.add(at(rbox(.125, .075, .27, .035, MAT.leather), 0, .075, .015));
    g.add(at(rbox(.12, .045, .09, .022, MAT.leather), 0, .06, .135));                                      // toe box
    g.add(at(rbox(.118, .06, .085, .025, MAT.leather), 0, .115, -.085));                                   // collar
    g.add(at(rbox(.07, .03, .13, .012, MAT.leather), 0, .118, .04));                                       // tongue
    for (let i = 0; i < 4; i++) g.add(at(rbox(.075, .007, .012, .003, MAT.sole), 0, .121 + i * .002, .1 - i * .028));
    for (const x of [-1, 1]) g.add(at(rbox(.004, .03, .16, .002, MAT.stitch), x * .064, .07, .01));
    g.add(at(rbox(.05, .03, .006, .003, MAT.stitch), 0, .1, -.13));                                        // heel tab
    return g;
  }
  const legs = {};
  for (const side of ['L', 'R']) {
    const x = side === 'L' ? .095 : -.095, o = side === 'L' ? 1 : -1;
    const leg = grp('Leg_' + side, hips); leg.position.set(x, -.04, 0);
    leg.add(at(rbox(.175, .46, .2, .025, MAT.pants), 0, -.215, 0));
    const shin = grp('Shin_' + side, leg); shin.position.y = -.44;
    shin.add(at(rbox(.18, .3, .2, .025, MAT.pants), o * .003, -.13, .004));
    shin.add(at(rbox(.2, .1, .21, .03, MAT.pants), 0, -.3, .015));                                         // bunched hem
    for (let i = 0; i < 3; i++) shin.add(at(rbox(.2, .025, .16, .01, MAT.pants), rr(-.006, .006), -.2 - i * .035, rr(.03, .05), rr(-.1, .1), 0, rr(-.08, .08)));
    const sn = sneaker(side); sn.scale.setScalar(1.2); sn.position.set(0, -.49, .04); sn.rotation.y = side === 'L' ? -.06 : .08; shin.add(sn);
    legs[side] = { leg, shin };
  }

  // ---------- torso: oversized black hoodie ----------
  const torso = grp('Torso', root); torso.position.y = M.hip;
  torso.add(at(rbox(.38, .56, .23, .03, MAT.hoodie), 0, .27, 0));
  torso.add(at(rbox(.385, .06, .235, .02, MAT.hoodie), 0, -.02, 0));                          // ribbed hem
  torso.add(at(rbox(.25, .12, .02, .01, MAT.hoodie), 0, .12, .118));                          // kangaroo pocket
  torso.add(at(box(.24, .005, .004, MAT.hoodieDark), 0, .18, .129));
  for (const sx of [-1, 1]) torso.add(at(box(.004, .11, .004, MAT.hoodieDark), sx * .125, .12, .129, 0, 0, sx * .2));
  // hood resting on the back + collar
  torso.add(at(rbox(.3, .2, .09, .04, MAT.hoodie), 0, .48, -.14, -.18));
  torso.add(at(rbox(.2, .11, .035, .02, MAT.hoodieDark), 0, .48, -.19, -.18));
  torso.add(at(rbox(.26, .05, .2, .02, MAT.hoodie), 0, .56, 0));
  for (const sx of [-1, 1]) { torso.add(at(cyl(.005, .005, .12, MAT.cord, 8), sx * .045, .44, .119)); torso.add(at(cyl(.007, .007, .022, MAT.stitch, 8), sx * .045, .37, .119)); }

  // ---------- head: the voxel cube, face and hair ----------
  const neck = grp('Neck', torso); neck.position.y = .6;
  neck.add(at(box(.12, .1, .11, MAT.skin), 0, .02, 0));
  const head = grp('Head', neck); head.position.set(0, .085, .01);
  const face = grp('Face', head); face.scale.setScalar(.727); face.position.y = -.03;           // built in the original 0.44 units
  face.add(at(box(.44, .44, .44, MAT.skin), 0, .22, 0));
  for (const sx of [-1, 1]) face.add(at(box(.06, .085, .012, MAT.eye), sx * .095, .2, .222));
  face.add(at(box(.07, .012, .01, MAT.mouth), .01, .1, .221));
  { const VX = .058, geos = [], col = new THREE.Color(), palette = ['#24170f', '#1a110b', '#2e1e13', '#3a271a', '#6b4a2e', '#8a6440'];
    const addV = (x, y, z) => { const g = new THREE.BoxGeometry(VX * rr(.92, 1.1), VX * rr(.92, 1.15), VX * rr(.92, 1.1)); g.translate(x, y, z);
      const r = rnd(); col.set(palette[r < .5 ? 0 : r < .7 ? 1 : r < .82 ? 2 : r < .9 ? 3 : r < .96 ? 4 : 5]);
      const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < c.length; i += 3) { c[i] = col.r; c[i + 1] = col.g; c[i + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); geos.push(g); };
    const H = .44, half = .22, n = 9;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {            // top: messy 1–3 voxel stacks
      const x = -half - .02 + i * (H + .04) / (n - 1), z = -half - .02 + k * (H + .04) / (n - 1), stack = 1 + (rnd() < .55 ? 1 : 0) + (rnd() < .2 ? 1 : 0);
      for (let q = 0; q < stack; q++) addV(x + rr(-.012, .012), H + VX * .35 + q * VX * .8, z + rr(-.012, .012)); }
    for (let i = 0; i < n; i++) { const x = -half + i * H / (n - 1), drop = 1 + (rnd() * 2.6 | 0); for (let d = 0; d < drop; d++) addV(x, H - d * VX * .9, half + VX * .25 + rr(0, .01)); } // fringe
    for (const sx of [-1, 1]) for (let k = 0; k < n; k++) { const z = -half + k * H / (n - 1), drop = (k < 4 ? 5 : 3) + (rnd() * 2 | 0); for (let d = 0; d < drop; d++) addV(sx * (half + VX * .3), H - d * VX * .9, z); } // sides
    for (let i = 0; i < n; i++) { const x = -half + i * H / (n - 1), drop = 6 + (rnd() * 2 | 0); for (let d = 0; d < drop; d++) addV(x, H - d * VX * .9, -half - VX * .3 - (d > 4 ? .01 : 0)); } // back
    const hair = mesh(mergeGeometries(geos), MAT.hair); hair.name = 'Hair'; face.add(hair); }

  // ---------- arms: hoodie sleeves and cube hands. 2-bone IK places them each frame ----------
  function makeArm(side) {
    const arm = grp('Arm_' + side, torso);
    const upper = grp('UpperArm_' + side, arm); upper.add(at(rbox(.13, .3, .15, .03, MAT.hoodie), 0, -.14, 0));
    const fore = grp('Forearm_' + side, arm); fore.add(at(rbox(.125, .25, .145, .03, MAT.hoodie), 0, -.12, 0)); fore.add(at(rbox(.11, .045, .13, .015, MAT.hoodie), 0, -.255, 0));
    const hand = grp('Hand_' + side, fore); hand.position.y = -M.B; hand.add(at(box(.085, .085, .085, MAT.skin), 0, -.03, 0));
    return { arm, upper, fore, hand, A: M.A, B: M.B };
  }
  const armR = makeArm('R'), armL = makeArm('L');

  // ---------- cigarette (filter at the fingertips, lit end out) ----------
  const cig = grp('Cigarette', torso);
  cig.quaternion.setFromUnitVectors(V(0, 1, 0), V(-1, .3, .55).normalize());
  cig.add(at(cyl(.011, .011, .11, MAT.paper, 12), 0, .07, 0));
  cig.add(at(cyl(.0115, .0115, .03, MAT.filter, 12), 0, 0, 0));
  const ember = at(cyl(.0118, .0118, .012, MAT.ember, 12), 0, .131, 0); ember.castShadow = false; cig.add(ember);

  // fingertips of the right hand, in torso space (so the cigarette is always in his fist)
  const _d = V(), _down = V(0, -1, 0);
  const tipOf = (out) => { _d.copy(_down).applyQuaternion(armR.fore.quaternion); return out.copy(armR.fore.position).addScaledVector(_d, M.B + .06); };
  return { root, hips, torso, neck, head, legs, armR, armL, cig, ember, MAT, M, tipOf };
}

function martyFromGLB(THREE, gltf) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const src = gltf.scene.getObjectByName('Buddy'); src.removeFromParent(); src.position.set(0, 0, 0); src.quaternion.identity(); src.scale.set(1, 1, 1);
  const NODES = {}; src.traverse(o => { if (o.name && !NODES[o.name]) NODES[o.name] = o; }); const g = n => NODES[n];
  const MAT = { ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .6, .1), toneMapped: false }) };
  // his joints, in the units of the file (hips at 0.8, shoulders at ±0.36, a 0.63 arm)
  const S = .92;                                   // the file is a touch big for the room; this keeps him the size he always was
  const M = { HEIGHT: 2.04 * S, hip: .8, shR: V(-.36, .52, 0), shL: V(.36, .52, 0), A: .31, B: .32, tip: .03,
    rest: V(-.21, .63, .28), puff: V(-.12, .69, .27), pocket: V(.25, -.06, .07), poleR: V(-.7, -.6, -.4), poleL: V(.8, .1, -.6), headY: 1.52, sitDrop: -.74 };
  const root = new THREE.Group(); root.name = 'Buddy';
  const body = new THREE.Group(); body.name = 'Body'; body.scale.setScalar(S); root.add(body);
  const hips = g('Hips'), torso = g('Torso'), neck = g('Neck'), head = g('Head');
  body.add(hips, torso);
  torso.scale.set(1, 1, 1); head.quaternion.identity(); head.scale.setScalar(1.12);   // the file was saved mid-breath with his head tilted
  src.updateMatrixWorld(true); body.updateMatrixWorld(true);
  // knees: everything below the knee moves to a shin group so the walk and sit can bend it
  const legs = {};
  for (const side of ['L', 'R']) {
    const leg = g('Leg_' + side), shin = new THREE.Group(); shin.name = 'Shin_' + side; shin.position.set(0, -.3, 0); leg.add(shin); leg.updateMatrixWorld(true);
    const kneeY = new THREE.Vector3(0, 0, 0); shin.localToWorld(kneeY);
    [...leg.children].forEach(c => { if (c === shin) return; const b = new THREE.Box3().setFromObject(c); if (c.name.startsWith('Sneaker') || (b.min.y + b.max.y) / 2 < kneeY.y - .02 * S) shin.attach(c); });
    legs[side] = { leg, shin };
  }
  const arm = side => ({ arm: g('Arm_' + side), upper: g('UpperArm_' + side), fore: g('Forearm_' + side), hand: g('Hand_' + side), A: M.A, B: M.B });
  const armR = arm('R'), armL = arm('L');
  const cig = g('Cigarette'); let ember = null;
  cig.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial) { o.material = MAT.ember; ember = o; } });
  if (!ember) { ember = new THREE.Mesh(new THREE.CylinderGeometry(.0118, .0118, .012, 12), MAT.ember); ember.position.y = .131; cig.add(ember); }
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = o !== ember; if (o.material && 'envMapIntensity' in o.material && o.material !== MAT.ember) o.material.envMapIntensity = .3; } });
  const _d = V(), _down = V(0, -1, 0);
  const tipOf = (out) => { _d.copy(_down).applyQuaternion(armR.fore.quaternion); return out.copy(armR.fore.position).addScaledVector(_d, M.B + M.tip); };
  return { root, hips, torso, neck, head, legs, armR, armL, cig, ember, MAT, M, tipOf };
}
function buildMarty(THREE, RoundedBoxGeometry, mergeGeometries, gltf) {
  if (gltf) { try { return martyFromGLB(THREE, gltf); } catch (e) { console.warn('marty.glb could not be rigged, using the built-in Marty', e); } }
  const m = buildMartyBlocks(THREE, RoundedBoxGeometry, mergeGeometries); m.M.tip = .06; return m;
}

/* =========================================================
   HERO · Marty's room
   One WebGL canvas that lives inside the hero window, so the page scrolls it natively (no per-frame
   clipping, no full-screen canvas). Shadows are baked once and only redrawn when the light changes.
   The furniture is CC0 from Poly Haven (polyhaven.com): lounge chairs, coffee table, sideboard, shelves,
   plants, stools, lamps, bottles, his cigarette pack and lighter. The guitars, amp, gaming desk, bar,
   turntable, posters and neon are built here. Marty is built in code (buildMarty, above).
   ========================================================= */
const ASSETS = import.meta.env.BASE_URL + 'assets/';
const stageWin = stageEl.querySelector('.window');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
const DPR = Math.min(window.devicePixelRatio || 1, innerWidth < 768 ? 1.75 : 1.6);
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;                      // baked: redrawn only when the light changes
renderer.domElement.className = 'scene';
stageWin.appendChild(renderer.domElement);
RectAreaLightUniformsLib.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(10.5, 1, .5, 400);
const composer = null, bloom = null;
const bakeShadows = () => { renderer.shadowMap.needsUpdate = true; };

/* ---------- helpers ---------- */
let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + rand() * (b - a);
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t;
}
function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; }
const rbox = (w, h, d, r, mat, seg = 3) => mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat);
const box = (w, h, d, mat) => mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt, rb, h, mat, seg = 24, open = false) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
function at(o, x, y, z, ry = 0, rx = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }
function group(name, parent) { const g = new THREE.Group(); g.name = name; if (parent) parent.add(g); return g; }
const noiseFill = (g, w, h, base, amt, n) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = rand(); g.fillStyle = `rgba(${v > .5 ? '255,255,255' : '0,0,0'},${rr(.02, .06)})`; g.fillRect(rand() * w, rand() * h, rr(1, amt), rr(1, amt)); } };

/* ---------- loading: everything below is fetched while the loader is up ---------- */
const loadMgr = new THREE.LoadingManager();
window.__load = { p: 0, done: false };
loadMgr.onProgress = (u, a, b) => { window.__load.p = a / Math.max(1, b); };
loadMgr.onLoad = () => { window.__load.p = 1; window.__load.done = true; };
const gltfL = new GLTFLoader(loadMgr);
const texL = new THREE.TextureLoader(loadMgr);
const tex = (file, srgb, rx = 1, ry = 1) => { const t = texL.load(ASSETS + 'tex/' + file); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t; };

/* ---------- environment ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

/* ---------- materials ---------- */
const walnutTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4a2c1b'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${rand() > .5 ? '30,15,8' : '110,70,42'},${rr(.15, .4)})`; g.lineWidth = rr(.5, 3); g.beginPath(); let y = rand() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 16) { y += rr(-1.5, 1.5); g.lineTo(x, y); } g.stroke(); } });
const travTex = canvasTex(512, 256, (g, w, h) => { noiseFill(g, w, h, '#d8cbb4', 8, 900); for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(150,125,95,${rr(.08, .2)})`; g.lineWidth = rr(.5, 2); let y = rand() * h; g.beginPath(); g.moveTo(0, y); for (let x = 0; x < w; x += 24) { y += rr(-2, 2); g.lineTo(x, y); } g.stroke(); } });
const flutedTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3e2416'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.5, 'rgba(255,210,170,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } });
flutedTex.wrapS = flutedTex.wrapT = THREE.RepeatWrapping; flutedTex.repeat.set(6, 1);
const MT = {
  floor: new THREE.MeshStandardMaterial({ map: tex('herringbone_parquet_diff.webp', true, 2.6, 2.6), roughnessMap: tex('herringbone_parquet_rough.webp', false, 2.6, 2.6), normalMap: tex('herringbone_parquet_nor.webp', false, 2.6, 2.6), roughness: .85, envMapIntensity: .4 }),
  wall: new THREE.MeshStandardMaterial({ map: tex('plastered_wall_04_diff.webp', true, 2, 1), normalMap: tex('plastered_wall_04_nor.webp', false, 2, 1), color: '#8f9784', roughness: .95, envMapIntensity: .2 }),
  slab: new THREE.MeshStandardMaterial({ color: '#2c2f2b', roughness: .9, envMapIntensity: .3 }),
  slabTop: new THREE.MeshStandardMaterial({ color: '#46493f', roughness: .85 }),
  walnut: new THREE.MeshStandardMaterial({ map: walnutTex, roughness: .5, envMapIntensity: .4 }),
  fluted: new THREE.MeshStandardMaterial({ map: flutedTex, roughness: .6, envMapIntensity: .3 }),
  trav: new THREE.MeshStandardMaterial({ map: travTex, roughness: .4, envMapIntensity: .5 }),
  black: new THREE.MeshStandardMaterial({ color: '#0f1012', roughness: .45, metalness: .3, envMapIntensity: .5 }),
  steel: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: .35, metalness: .85, envMapIntensity: .8 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d7d9de', roughness: .15, metalness: 1, envMapIntensity: 1 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c99a45', roughness: .3, metalness: 1, envMapIntensity: .9 }),
  leather: new THREE.MeshPhysicalMaterial({ color: '#131212', roughness: .42, sheen: .4, sheenColor: '#555', envMapIntensity: .5 }),
  felt: new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 1, envMapIntensity: .1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#c9d6e3', roughness: .05, metalness: 0, transparent: true, opacity: .18, envMapIntensity: 1, depthWrite: false }),
  plasticW: new THREE.MeshPhysicalMaterial({ color: '#f1f1ef', roughness: .35, clearcoat: .5, envMapIntensity: .5 }),
  led: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 1.1), toneMapped: false }),
  ledOrange: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.0, .25), toneMapped: false }),
  blob: new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.7)'); r.addColorStop(.6, 'rgba(0,0,0,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false }),
};
const M = MT; // the page host reads M.blob

/* ---------- the room: a floating slab, two walls, a window ---------- */
const W = 7.6, D = 6.0, TH = .9, WALL_H = 3.0, WT = .14;
const island = group('Room', scene);
const F = .06;
const ZW = -D / 2 + WT, XW = -W / 2 + WT;            // inner faces of the back and left walls
island.add(at(box(W, TH, D, MT.slab), 0, -TH / 2, 0));
island.add(at(box(W, .012, D, MT.slabTop), 0, .006, 0));
{ const fl = mesh(new THREE.PlaneGeometry(W - .1, D - .1), MT.floor); fl.rotation.x = -Math.PI / 2; fl.position.y = F; fl.castShadow = false; island.add(fl); }
// back wall
island.add(at(box(W, WALL_H, WT, MT.wall), 0, F + WALL_H / 2, -D / 2 + WT / 2));
// left wall with a window opening (z from -1.75 to .55, sill .85 → top 2.55)
{ const z0 = -D / 2, z1 = D / 2, wz0 = -1.45, wz1 = .45, y0 = F + .85, y1 = F + 2.55, x = -W / 2 + WT / 2;
  island.add(at(box(WT, WALL_H, wz0 - z0, MT.wall), x, F + WALL_H / 2, (z0 + wz0) / 2));
  island.add(at(box(WT, WALL_H, z1 - wz1, MT.wall), x, F + WALL_H / 2, (wz1 + z1) / 2));
  island.add(at(box(WT, y0 - F, wz1 - wz0, MT.wall), x, (F + y0) / 2, (wz0 + wz1) / 2));
  island.add(at(box(WT, F + WALL_H - y1, wz1 - wz0, MT.wall), x, (y1 + F + WALL_H) / 2, (wz0 + wz1) / 2));
  const fr = (w, h, d, px, py, pz) => island.add(at(box(w, h, d, MT.steel), px, py, pz));
  fr(.06, .05, wz1 - wz0, x, y0, (wz0 + wz1) / 2); fr(.06, .05, wz1 - wz0, x, y1, (wz0 + wz1) / 2);
  fr(.06, y1 - y0, .05, x, (y0 + y1) / 2, wz0); fr(.06, y1 - y0, .05, x, (y0 + y1) / 2, wz1); fr(.05, y1 - y0, .035, x, (y0 + y1) / 2, (wz0 + wz1) / 2); fr(.05, .035, wz1 - wz0, x, y0 + (y1 - y0) * .62, (wz0 + wz1) / 2);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(wz1 - wz0, y1 - y0), MT.glass); pane.rotation.y = Math.PI / 2; pane.position.set(x, (y0 + y1) / 2, (wz0 + wz1) / 2); pane.renderOrder = 5; island.add(pane);
  island.add(at(box(.22, .04, wz1 - wz0 + .1, MT.trav), x + .1, y0 - .02, (wz0 + wz1) / 2)); }  // sill
// skirting + a warm LED cove along the top of both walls
island.add(at(box(W - WT, .07, .012, MT.black), WT / 2, F + .035, ZW + .006));
island.add(at(box(.012, .07, D - WT, MT.black), XW + .006, F + .035, WT / 2));
{ const c1 = box(W - WT, .016, .016, MT.led), c2 = box(.016, .016, D - WT, MT.led); c1.castShadow = c2.castShadow = false;
  island.add(at(c1, WT / 2, F + WALL_H - .03, ZW + .03)); island.add(at(c2, XW + .03, F + WALL_H - .03, WT / 2)); }

/* ---------- rug (Beni Ourain) ---------- */
{ const t = canvasTex(1024, 768, (g, w, h) => { noiseFill(g, w, h, '#e9e3d6', 6, 7000);
    g.strokeStyle = 'rgba(30,28,26,.82)'; g.lineWidth = 7; g.lineJoin = 'round';
    const cw = w / 6, ch = h / 4; for (let i = -1; i <= 6; i++) for (let j = -1; j <= 4; j++) { const x = i * cw + (j % 2 ? cw / 2 : 0), y = j * ch; g.beginPath(); g.moveTo(x, y + ch / 2); g.lineTo(x + cw / 2, y); g.lineTo(x + cw, y + ch / 2); g.lineTo(x + cw / 2, y + ch); g.closePath(); g.stroke(); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${rr(.03, .1)})`; g.fillRect(rand() * w, rand() * h, 2, 2); } });
  const r = rbox(3.0, .016, 2.2, .008, new THREE.MeshStandardMaterial({ map: t, roughness: 1, envMapIntensity: .1 })); r.castShadow = false; island.add(at(r, 1.0, F + .008, 1.2, -.06)); }

/* ---------- posters: his favourite artists, as typographic gig posters ---------- */
const POSTERS = [
  { bg: '#0e0e0e', fg: '#efe9dd', acc: '#c8302a', a: 'KANYE', b: 'WEST', c: 'LIVE · ONE NIGHT ONLY' },
  { bg: '#3a2414', fg: '#f2d8b3', acc: '#e07a2c', a: 'TRAVIS', b: 'SCOTT', c: 'HOUSTON · TOUR' },
  { bg: '#1f3a2c', fg: '#e6f0c8', acc: '#c9e34a', a: 'DON', b: 'TOLIVER', c: 'LATE NIGHT SESSIONS' },
  { bg: '#1a2238', fg: '#e8e4d8', acc: '#d8a84a', a: 'J.', b: 'COLE', c: 'NORTH CAROLINA · LIVE' },
];
const posterTex = P => canvasTex(600, 840, (g, w, h) => {
  g.fillStyle = P.bg; g.fillRect(0, 0, w, h);
  g.fillStyle = P.acc; g.beginPath(); g.arc(w * .62, h * .4, w * .34, 0, 7); g.fill();
  g.globalAlpha = .12; for (let i = 0; i < 2500; i++) { g.fillStyle = rand() > .5 ? '#fff' : '#000'; g.fillRect(rand() * w, rand() * h, 2, 2); } g.globalAlpha = 1;
  g.fillStyle = P.fg; g.textBaseline = 'alphabetic';
  g.font = '700 150px "Space Grotesk", Arial, sans-serif'; g.fillText(P.a, 36, h * .66);
  g.font = '700 128px "Space Grotesk", Arial, sans-serif'; g.fillText(P.b, 36, h * .66 + 120);
  g.font = '500 22px "JetBrains Mono", monospace'; g.fillText(P.c, 40, h - 46); g.fillRect(40, h - 92, w - 80, 3);
});
const posterMats = POSTERS.map(p => new THREE.MeshStandardMaterial({ map: posterTex(p), roughness: .7, envMapIntensity: .2 }));
document.fonts.ready.then(() => POSTERS.forEach((p, i) => { posterMats[i].map = posterTex(p); posterMats[i].needsUpdate = true; }));
function poster(i, w = .62) { const g = new THREE.Group(), h = w * 1.4;
  g.add(at(box(w + .04, h + .04, .03, MT.black), 0, 0, 0));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), posterMats[i]); art.position.z = .016; g.add(art);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: .08, transparent: true, opacity: .06, envMapIntensity: 1.2 })); gl.position.z = .019; g.add(gl);
  return g; }
island.add(at(poster(0), -1.15, F + 2.05, ZW + .02));
island.add(at(poster(1), 0, F + 2.05, ZW + .02));
island.add(at(poster(3, .52), XW + .02, F + 2.25, 1.2, Math.PI / 2));
island.add(at(poster(2, .52), XW + .02, F + 1.6, 2.3, Math.PI / 2));

/* ---------- the music corner: two electric guitars on the wall, an amp ---------- */
const music = group('Music', island);
function guitar(kind) {
  const g = new THREE.Group(), lp = kind === 'lp';
  const P = lp ? [[.045, .2], [.1, .225], [.145, .17], [.13, .08], [.185, -.06], [.16, -.2], [.06, -.265], [-.06, -.265], [-.16, -.2], [-.185, -.06], [-.155, .07], [-.165, .15], [-.11, .205], [-.045, .2]]
               : [[.045, .19], [.11, .27], [.16, .24], [.165, .11], [.12, .02], [.17, -.1], [.14, -.21], [.04, -.255], [-.06, -.25], [-.15, -.2], [-.17, -.08], [-.12, .0], [-.165, .09], [-.14, .19], [-.09, .2], [-.045, .17]];
  const shape = new THREE.Shape(new THREE.SplineCurve(P.map(([x, y]) => new THREE.Vector2(x, y)).concat([new THREE.Vector2(P[0][0], P[0][1])])).getPoints(90));
  const bodyG = new THREE.ExtrudeGeometry(shape, { depth: .04, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 3, curveSegments: 6 });
  const paint = new THREE.MeshPhysicalMaterial({ color: lp ? '#7d1712' : '#0d0d10', roughness: .22, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1 });
  g.add(mesh(bodyG, paint));
  if (!lp) { const pg = new THREE.Shape(new THREE.SplineCurve([[.04, .17], [.1, .14], [.11, .02], [.07, -.12], [-.02, -.15], [-.1, -.1], [-.09, .04], [-.04, .17], [.04, .17]].map(([x, y]) => new THREE.Vector2(x, y))).getPoints(60));
    const pm = mesh(new THREE.ShapeGeometry(pg), new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: .4 })); pm.position.z = .049; g.add(pm); }
  // neck, fretboard, headstock
  g.add(at(box(.048, .46, .022, MT.walnut), 0, .43, .03));
  g.add(at(box(.05, .44, .006, new THREE.MeshStandardMaterial({ color: '#1e120b', roughness: .6 })), 0, .43, .044));
  for (let i = 1; i < 20; i++) g.add(at(box(.05, .0018, .002, MT.chrome), 0, .215 + Math.pow(i / 20, .8) * .43, .048));
  g.add(at(rbox(.075, .17, .018, .015, lp ? paint : MT.walnut), lp ? 0 : .012, .74, .028));
  for (let i = 0; i < 6; i++) { g.add(at(cyl(.006, .006, .02, MT.chrome, 8), (lp ? (i < 3 ? -.04 : .04) : .04), .69 + (lp ? (i % 3) * .04 : i * .022), .03, 0, 0, Math.PI / 2)); }
  // strings
  for (let i = 0; i < 6; i++) g.add(at(box(.0012, .86, .0012, MT.chrome), -.018 + i * .0072, .3, .052));
  // pickups, bridge, knobs
  const pick = lp ? MT.chrome : new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: .4 });
  (lp ? [.1, -.03] : [.12, .04, -.05]).forEach(y => g.add(at(rbox(lp ? .075 : .07, lp ? .038 : .018, .01, .004, pick), 0, y, .052)));
  g.add(at(rbox(.08, .02, .01, .003, MT.chrome), 0, -.12, .052));
  (lp ? [[.1, -.08], [.13, -.15], [.06, -.15], [.09, -.2]] : [[.08, -.08], [.1, -.13], [.12, -.18]]).forEach(([x, y]) => g.add(at(cyl(.012, .012, .016, lp ? MT.gold : pick, 16), x, y, .056, 0, Math.PI / 2)));
  return g; }
{ const g1 = guitar('strat'), g2 = guitar('lp');
  music.add(at(g1, -3.05, F + 1.32, ZW + .05, 0, 0, .04)); music.add(at(g2, -2.25, F + 1.34, ZW + .05, 0, 0, -.05));
  [-3.05, -2.25].forEach(x => music.add(at(box(.08, .03, .06, MT.steel), x, F + 2.12, ZW + .03))); }
// amp
{ const amp = new THREE.Group();
  const grille = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2a2420'; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 4) { g.fillStyle = i % 8 ? 'rgba(200,170,120,.16)' : 'rgba(0,0,0,.4)'; g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); } });
  amp.add(at(rbox(.72, .56, .3, .025, new THREE.MeshStandardMaterial({ color: '#141414', roughness: .85 })), 0, .28, 0));
  amp.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.64, .36), new THREE.MeshStandardMaterial({ map: grille, roughness: 1 })), 0, .22, .151));
  amp.add(at(box(.66, .1, .01, MT.gold), 0, .48, .151));
  for (let i = 0; i < 6; i++) amp.add(at(cyl(.014, .014, .02, MT.black, 16), -.25 + i * .09, .48, .16, 0, Math.PI / 2));
  amp.add(at(rbox(.22, .03, .05, .012, MT.leather), 0, .575, 0));
  music.add(at(amp, -2.65, F, ZW + .32, .12)); }

/* ---------- the gaming desk ---------- */
const screenTex = kind => canvasTex(1024, 576, (g, w, h) => {
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, w, h);
  if (kind === 'edit') { // a video edit: program monitor + timeline
    const pv = g.createLinearGradient(0, 0, w, 0); pv.addColorStop(0, '#2b3a55'); pv.addColorStop(1, '#c2552b'); g.fillStyle = pv; g.fillRect(w * .3, 30, w * .4, h * .42);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(w * .5, h * .3, 60, 80, 0, 0, 7); g.fill(); g.fillRect(w * .5 - 95, h * .38, 190, 60);
    g.fillStyle = '#ffd400'; g.font = '700 26px Arial'; g.textAlign = 'center'; g.fillText('WAIT FOR IT', w * .5, h * .44);
    g.fillStyle = '#16181f'; g.fillRect(0, h * .55, w, h * .45);
    const cols = ['#ff6a2b', '#3b7bff', '#3dbb7a', '#b05cff', '#ffcc33'];
    for (let r = 0; r < 5; r++) { let x = 40; while (x < w - 40) { const cw = rr(50, 180); g.fillStyle = cols[(r + Math.floor(x / 97)) % 5]; g.globalAlpha = .85; g.fillRect(x, h * .58 + r * 42, cw - 6, 34); x += cw; } }
    g.globalAlpha = 1; g.fillStyle = '#ff3b30'; g.fillRect(w * .46, h * .55, 3, h * .45);
  } else { // a music app, his rotation
    g.fillStyle = '#121212'; g.fillRect(0, 0, w, h); const ag = g.createLinearGradient(60, 60, 330, 330); ag.addColorStop(0, '#ff4500'); ag.addColorStop(1, '#2a0e05'); g.fillStyle = ag; g.fillRect(60, 60, 270, 270);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 34px Arial'; g.fillText('Late night rotation', 370, 110); g.font = '400 20px Arial'; g.fillStyle = '#9a9a9a'; g.fillText('Marty · 4 songs on repeat', 370, 146);
    [['Runaway', 'Kanye West'], ['Sicko Mode', 'Travis Scott'], ['After Party', 'Don Toliver'], ['No Role Modelz', 'J. Cole']].forEach(([s, a], i) => { const y = 220 + i * 62; g.fillStyle = i === 0 ? '#ff4500' : '#fff'; g.font = '600 24px Arial'; g.fillText(s, 370, y); g.fillStyle = '#8a8a8a'; g.font = '400 19px Arial'; g.fillText(a, 370, y + 26); });
    g.fillStyle = '#333'; g.fillRect(60, h - 70, w - 120, 6); g.fillStyle = '#ff4500'; g.fillRect(60, h - 70, (w - 120) * .38, 6);
  } });
{ const desk = group('Desk', island); desk.position.set(-.55, F, ZW + .4);
  desk.add(at(rbox(2.1, .045, .78, .01, MT.walnut), 0, .745, 0));
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => desk.add(at(box(.04, .72, .04, MT.steel), a * 1.0, .36, b * .34)));
  [-1, 1].forEach(a => desk.add(at(box(.04, .04, .72, MT.steel), a * 1.0, .1, 0)));
  desk.add(at(rbox(1.1, .006, .42, .003, MT.felt), 0, .771, .12));
  const screenM = [new THREE.MeshBasicMaterial({ map: screenTex('edit'), toneMapped: false }), new THREE.MeshBasicMaterial({ map: screenTex('music'), toneMapped: false })];
  [[-.36, .16, screenM[0]], [.4, -.16, screenM[1]]].forEach(([x, ry, sm]) => { const mon = new THREE.Group();
    mon.add(at(rbox(.7, .41, .025, .008, MT.black), 0, 0, 0)); const sc = new THREE.Mesh(new THREE.PlaneGeometry(.676, .386), sm); sc.position.z = .0135; mon.add(sc);
    mon.add(at(box(.04, .26, .03, MT.steel), 0, -.28, -.04)); mon.add(at(rbox(.22, .012, .16, .006, MT.steel), 0, -.405, -.02));
    desk.add(at(mon, x, 1.18, -.14, ry)); });
  // monitor bias light washing the wall
  { const b = box(1.5, .02, .01, MT.led); b.castShadow = false; desk.add(at(b, 0, 1.2, -.38)); }
  // keyboard, mouse, mug, headphones
  const keysT = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#1a1b1e'; g.fillRect(0, 0, w, h); for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) { g.fillStyle = r === 0 && k > 12 ? '#ff4500' : '#2a2c31'; g.fillRect(8 + k * 33, 8 + r * 30, 29, 26); } });
  desk.add(at(rbox(.44, .022, .14, .008, new THREE.MeshStandardMaterial({ map: keysT, roughness: .6 })), -.05, .783, .14));
  desk.add(at(rbox(.06, .028, .1, .025, MT.black), .32, .785, .16));
  desk.add(at(cyl(.04, .036, .1, new THREE.MeshStandardMaterial({ color: '#e9e4da', roughness: .35 })), .72, .818, .1));
  { const hp = new THREE.Group(); hp.add(at(cyl(.008, .012, .26, MT.steel), 0, .13, 0)); hp.add(at(rbox(.12, .012, .1, .006, MT.steel), 0, .006, 0));
    const band = mesh(new THREE.TorusGeometry(.085, .012, 8, 24, Math.PI), MT.black); band.position.y = .27; hp.add(band);
    [-1, 1].forEach(s => hp.add(at(rbox(.04, .09, .08, .02, MT.leather), s * .085, .22, 0))); desk.add(at(hp, -.9, .768, .05, .3)); }
  // the tower: glass side, three glowing fans
  { const pc = new THREE.Group(); pc.add(at(rbox(.22, .48, .46, .01, MT.black), 0, .24, 0));
    const side = new THREE.Mesh(new THREE.PlaneGeometry(.44, .44), new THREE.MeshPhysicalMaterial({ color: '#111', roughness: .05, transparent: true, opacity: .55, envMapIntensity: 1.2 })); side.rotation.y = Math.PI / 2; side.position.set(.111, .24, 0); pc.add(side);
    for (let i = 0; i < 3; i++) { const f = mesh(new THREE.TorusGeometry(.055, .006, 8, 28), MT.ledOrange); f.castShadow = false; f.position.set(.0, .1 + i * .13, .232); pc.add(f); }
    { const s = box(.006, .3, .006, MT.led); s.castShadow = false; pc.add(at(s, .1, .26, -.1)); }
    desk.add(at(pc, 1.28, 0, .05)); }
  // gaming chair, turned toward the room a little
  { const ch = new THREE.Group(), lm = MT.leather, acc = new THREE.MeshStandardMaterial({ color: '#ff4500', roughness: .6 });
    ch.add(at(rbox(.52, .1, .5, .04, lm), 0, .5, 0)); ch.add(at(rbox(.52, .78, .1, .05, lm), 0, .95, -.22, 0, -.1)); ch.add(at(rbox(.3, .12, .06, .03, acc), 0, 1.24, -.17, 0, -.1));
    [-1, 1].forEach(s => { ch.add(at(rbox(.06, .03, .26, .015, MT.black), s * .3, .68, 0)); ch.add(at(box(.03, .14, .03, MT.steel), s * .3, .6, -.02)); });
    ch.add(at(cyl(.025, .025, .34, MT.chrome), 0, .3, 0));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ch.add(at(box(.3, .03, .04, MT.black), Math.cos(a) * .15, .08, Math.sin(a) * .15, -a)); ch.add(at(cyl(.025, .025, .03, MT.black, 12), Math.cos(a) * .29, .03, Math.sin(a) * .29, 0, 0, Math.PI / 2)); }
    desk.add(at(ch, .15, 0, .78, Math.PI + .5)); }
}

/* ---------- the bar: back bar with lit shelves, an island counter, two stools, a neon ---------- */
const BAR_X = 2.45;
{ const bar = group('Bar', island);
  // back bar cabinet with fluted doors + travertine top
  bar.add(at(box(2.6, .86, .5, MT.walnut), BAR_X, F + .43, ZW + .25));
  bar.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.56, .78), MT.fluted), BAR_X, F + .44, ZW + .505));
  bar.add(at(rbox(2.66, .04, .54, .01, MT.trav), BAR_X, F + .88, ZW + .27));
  // floating shelves with LED strips
  [1.45, 1.95].forEach(y => { bar.add(at(rbox(2.2, .04, .24, .008, MT.walnut), BAR_X, F + y, ZW + .12)); const s = box(2.1, .008, .012, MT.led); s.castShadow = false; bar.add(at(s, BAR_X, F + y - .025, ZW + .2)); });
  // bottles
  const bot = (x, y, h, col, label) => { const g = new THREE.Group(), r = .036 + rand() * .01;
    const pts = [[0, 0], [r, 0], [r, h * .62], [r * .55, h * .76], [r * .32, h * .82], [r * .32, h], [0, h]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshPhysicalMaterial({ color: col, roughness: .08, transmission: 0, transparent: true, opacity: .82, envMapIntensity: 1.2 })));
    if (label) g.add(at(cyl(r * 1.01, r * 1.01, h * .26, new THREE.MeshStandardMaterial({ color: label, roughness: .7 }), 20, true), 0, h * .34, 0));
    g.add(at(cyl(r * .34, r * .34, .03, MT.black, 12), 0, h + .012, 0));
    bar.add(at(g, x, y, ZW + .12)); };
  const cols = ['#5a2a0e', '#7b3b10', '#1f3b1a', '#c9a24a', '#2b1a10', '#d8d4c8', '#3b0f12', '#8a5a1c'];
  for (let i = 0; i < 9; i++) bot(BAR_X - .95 + i * .23, F + 1.47, rr(.24, .32), cols[i % cols.length], i % 3 ? '#efe6d2' : '#1a1a1a');
  for (let i = 0; i < 7; i++) bot(BAR_X - .8 + i * .26, F + 1.97, rr(.2, .27), cols[(i + 3) % cols.length], i % 2 ? '#e9d9b5' : null);
  // glasses on the counter
  for (let i = 0; i < 3; i++) { const gl = mesh(new THREE.CylinderGeometry(.035, .03, .085, 16, 1, true), MT.glass); bar.add(at(gl, BAR_X + .5 + i * .1, F + .945, ZW + .32)); }
  // neon
  { const t = canvasTex(1024, 256, (g, w, h) => { g.font = '600 150px "Space Grotesk", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff6a3d'; g.shadowBlur = 40; g.fillStyle = '#ffd2bd'; g.fillText('late nights', w / 2, h / 2); g.shadowBlur = 12; g.fillText('late nights', w / 2, h / 2); });
    const n = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .375), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    n.position.set(BAR_X, F + 2.55, ZW + .02); bar.add(n); window.__neon = n;
    document.fonts.ready.then(() => { n.material.map = canvasTex(1024, 256, (g, w, h) => { g.font = '600 150px "Space Grotesk", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff6a3d'; g.shadowBlur = 40; g.fillStyle = '#ffd2bd'; g.fillText('late nights', w / 2, h / 2); g.shadowBlur = 12; g.fillText('late nights', w / 2, h / 2); }); }); }
  // island counter
  const isl = new THREE.Group(); isl.add(at(box(1.9, 1.0, .55, MT.walnut), 0, .5, 0)); isl.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.86, .9), MT.fluted), 0, .48, .277));
  isl.add(at(rbox(2.0, .05, .66, .012, MT.trav), 0, 1.025, .02)); { const k = box(1.8, .012, .012, MT.led); k.castShadow = false; isl.add(at(k, 0, .03, .29)); }
  bar.add(at(isl, BAR_X - .1, F, -1.5));
}

/* ---------- the turntable on the sideboard under the window ---------- */
const turntable = new THREE.Group();
{ turntable.add(at(rbox(.46, .07, .36, .012, MT.walnut), 0, .035, 0));
  const plat = new THREE.Group(); plat.add(at(cyl(.15, .15, .02, MT.steel, 40), 0, 0, 0));
  const rec = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#0b0b0c'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.06)'; for (let r = 40; r < 126; r += 3) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); } g.fillStyle = '#ff4500'; g.beginPath(); g.arc(128, 128, 36, 0, 7); g.fill(); });
  const vinyl = new THREE.Mesh(new THREE.CircleGeometry(.145, 48), new THREE.MeshStandardMaterial({ map: rec, roughness: .3, envMapIntensity: .8 })); vinyl.rotation.x = -Math.PI / 2; vinyl.position.y = .012; plat.add(vinyl);
  turntable.add(at(plat, -.04, .08, 0)); turntable.userData.plat = plat;
  turntable.add(at(cyl(.008, .008, .2, MT.chrome, 8), .14, .1, .02, 0, Math.PI / 2 - .3, 0)); }

/* ---------- props: the CC0 models ---------- */
const PROPS = [
  // name, x, z, rotation, target height (m), y offset
  ['mid_century_lounge_chair', 2.05, 1.9, -2.35, .95],
  ['modern_arm_chair_01', -.15, 1.8, 2.35, .82],
  ['modern_coffee_table_01', 1.0, 1.15, Math.PI / 2 - .06, .4],
  ['throw_pillows_01', -.15, 1.85, 2.35, .38, .42],
  ['modern_wooden_cabinet', XW + .25, -.5, Math.PI / 2, .52],
  ['potted_plant_02', -3.2, -2.42, .4, 1.1],
  ['steel_frame_shelves_01', XW + .2, 1.2, Math.PI / 2, 1.5],
  ['metal_stool_02', BAR_X - .6, -.92, .3, .72],
  ['metal_stool_02', BAR_X + .4, -.92, -.2, .72],
  ['modern_ceiling_lamp_01', BAR_X - .1, -1.5, 0, 1.05, 1.95],
  ['desk_lamp_arm_01', -1.45, ZW + .45, .5, .55, .77],
  ['potted_plant_04', .25, ZW + .32, 0, .2, .77],
  ['boombox', XW + .22, 1.2, Math.PI / 2 + .1, .2, 1.51],
  ['cigarette_pack', .85, 1.0, .4, .075, .4],
  ['vintage_lighter', 1.0, .9, -.6, .055, .4],
  ['rubber_duck_toy', .1, ZW + .55, .5, .09, .77],
  ['wine_bottles_01', BAR_X + .65, ZW + .3, 0, .33, .9],
];
const propRoot = group('Props', island);
const loadProp = ([name, x, z, ry, h, y = 0]) => new Promise(res => gltfL.load(ASSETS + 'room/' + name + '.glb', g => {
  const o = g.scene; o.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; if (m.material) m.material.envMapIntensity = .55; } });
  const b = new THREE.Box3().setFromObject(o), s = h / Math.max(.0001, b.max.y - b.min.y); o.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(o), c = b2.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group(); o.position.set(-c.x, -b2.min.y, -c.z); wrap.add(o); wrap.position.set(x, F + y, z); wrap.rotation.y = ry; wrap.name = name;
  propRoot.add(wrap); res(wrap); }, undefined, () => res(null)));
const propsReady = Promise.all(PROPS.map(loadProp)).then(list => {
  const cab = list[4]; if (cab) { const b = new THREE.Box3().setFromObject(cab); island.add(at(turntable, XW + .3, b.max.y, -.85, Math.PI / 2)); }
  bakeShadows(); return list; });

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight('#3a4a6c', '#1a0d06', .3); scene.add(hemi);
// the key comes in through the window and draws its frame on the floor
const key = new THREE.DirectionalLight('#a9bfff', 3.2);
key.position.set(-12, 7.5, -1.2); key.target.position.set(0, 0, -.4);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 2, far: 30 });
key.shadow.bias = -.0003; key.shadow.normalBias = .03; key.shadow.radius = 5; key.shadow.blurSamples = 12;
scene.add(key, key.target);
const deskLamp = new THREE.SpotLight('#ffb27a', 9, 5, .7, .8, 1.4); deskLamp.position.set(-1.25, F + 1.35, ZW + .6); deskLamp.target.position.set(-.9, F + .7, ZW + .5); scene.add(deskLamp, deskLamp.target);
const barLamp = new THREE.PointLight('#ffb070', 6, 5, 1.6); barLamp.position.set(BAR_X - .1, F + 1.95, -1.5); scene.add(barLamp);
const neonLight = new THREE.PointLight('#ff6a3d', 3, 4, 1.8); neonLight.position.set(BAR_X, F + 2.5, ZW + .4); scene.add(neonLight);
const shelfWash = new THREE.RectAreaLight('#ffcf9e', 5, 2.2, .3); shelfWash.position.set(BAR_X, F + 1.4, ZW + .2); shelfWash.lookAt(BAR_X, 0, ZW + .2); scene.add(shelfWash);
const deskWash = new THREE.RectAreaLight('#ff9a5a', 4, 1.6, .25); deskWash.position.set(-.55, F + 1.25, ZW + .05); deskWash.lookAt(-.55, F + 1.25, ZW - 1); scene.add(deskWash);
const screenGlow = new THREE.RectAreaLight('#9ab8ff', 2.5, 1.4, .45); screenGlow.position.set(-.55, F + 1.18, ZW + .4); screenGlow.lookAt(-.55, F + 1.0, ZW + 1.6); scene.add(screenGlow);
const fill = new THREE.DirectionalLight('#ffb27a', .25); fill.position.set(8, 9, 7); scene.add(fill);
const rim = new THREE.DirectionalLight('#9fb4e6', .3); rim.position.set(4, 3, 20); scene.add(rim);
// time of day: the key light becomes the sun (warm, sharper) or the low evening sun; the practicals dim in daylight
const TOD_LIGHT = {
  night:   { hemi: ['#3a4a6c', '#1a0d06', .32], key: ['#9fb2e0', 1.7, -12, 6.2, -1.6], prac: 1,   fill: ['#ffb27a', .25], rim: ['#9fb4e6', .3], exp: 1.05 },
  morning: { hemi: ['#f4ead8', '#6e5238', .75], key: ['#ffe9c8', 6.5, -12, 9, 1.5],    prac: .35, fill: ['#ffd2a6', .45], rim: ['#cfe0ea', .35], exp: 1.0 },
  evening: { hemi: ['#ffd0a0', '#3a2416', .65], key: ['#ff9a55', 5.5, -13, 4.5, -2.5], prac: .75, fill: ['#ff9c6c', .45], rim: ['#d6a6c8', .3], exp: 1.05 },
};
window.__todLights = theme => { const c = TOD_LIGHT[theme] || TOD_LIGHT.night;
  hemi.color.set(c.hemi[0]); hemi.groundColor.set(c.hemi[1]); hemi.intensity = c.hemi[2];
  key.color.set(c.key[0]); key.intensity = c.key[1]; key.position.set(c.key[2], c.key[3], c.key[4]);
  deskLamp.intensity = 9 * c.prac; barLamp.intensity = 6 * c.prac; neonLight.intensity = 3 * c.prac; shelfWash.intensity = 5 * c.prac; deskWash.intensity = 4 * c.prac;
  fill.color.set(c.fill[0]); fill.intensity = c.fill[1]; rim.color.set(c.rim[0]); rim.intensity = c.rim[1];
  renderer.toneMappingExposure = c.exp; bakeShadows(); };
window.__todLights(document.documentElement.dataset.tod || 'night');
// soft contact shadows under the big pieces (the baked shadow map doesn't do ambient occlusion)
const blob = (w, d, x, z, o) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MT.blob.clone()); p.material.opacity = o; p.rotation.x = -Math.PI / 2; p.position.set(x, F + .012, z); island.add(p); };
blob(2.4, 1.0, -.55, ZW + .45, .45); blob(2.8, .8, BAR_X, ZW + .3, .5); blob(2.2, .9, BAR_X - .1, -1.5, .45); blob(.8, 2.2, XW + .3, -.5, .4); blob(.8, 1.1, XW + .22, 1.2, .4);

/* =========================================================
   MARTY in the room
   ========================================================= */
// his body is a file (assets/marty/marty.glb); wait for it, but never longer than 8s
const MARTY_GLTF = await Promise.race([new Promise(res => gltfL.load(ASSETS + 'marty/marty.glb', res, undefined, () => res(null))), new Promise(res => setTimeout(() => res(null), 8000))]);
const MARTY = buildMarty(THREE, RoundedBoxGeometry, mergeGeometries, MARTY_GLTF);
const buddy = MARTY.root; island.add(buddy);
const hips = MARTY.hips, torso = MARTY.torso, head = MARTY.head;
const BM = { ember: MARTY.MAT.ember };
const SMOKING = true, BUDDY_SCALE = 1;
const DOWN = new THREE.Vector3(0, -1, 0), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Vector3();
function solveArm(a, S, Hn, pole) {
  _d.subVectors(Hn, S); let d = Math.min(_d.length(), a.A + a.B - .002); _d.normalize();
  const cosA = THREE.MathUtils.clamp((a.A * a.A + d * d - a.B * a.B) / (2 * a.A * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _e.copy(S).addScaledVector(_d, a.A * cosA).addScaledVector(_p, a.A * sinA);
  a.upper.position.copy(S); a.upper.quaternion.setFromUnitVectors(DOWN, _e.clone().sub(S).normalize());
  a.fore.position.copy(_e); a.fore.quaternion.setFromUnitVectors(DOWN, Hn.clone().sub(_e).normalize());
}
const HAND_R_REST = MARTY.M.rest, HAND_R_PUFF = MARTY.M.puff;
// smoke rising off the cigarette (world-space sprites)
const smoke = [];
{ const st = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(220,220,225,.55)'); r.addColorStop(.5, 'rgba(200,200,210,.18)'); r.addColorStop(1, 'rgba(200,200,210,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  for (let i = 0; i < 36; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 })); sp.userData = { life: rand() * 4, max: 3.6 + rand() * 1.2, seed: rand() * 10, puff: false }; scene.add(sp); smoke.push(sp); } }

// ---------- thought bubble + name tag ----------
const bubble = document.getElementById('bubble'), nametag = document.getElementById('nametag');
const now = () => (window.__fakeNow ?? performance.now());
const DOTS = '<span class="dots"><i></i><i></i><i></i></span>';
let bubbleMode = 'off', bubbleUntil = 0;
function think(text, ms = 5200) { bubble.textContent = text; bubble.classList.add('show'); bubbleMode = 'line'; bubbleUntil = now() + ms; }
function dots() { bubble.innerHTML = DOTS; bubble.classList.add('show'); bubbleMode = 'dots'; }
const LINES = [
  "Daily reminder that Graduation is a perfect album.",
  "Left her on read to look busy. She didn't notice 💀",
  "What if we're all NPCs in someone else's side quest… lowkey.",
  "Client said 'quick tweak' at 2am. Pray for me 🙏",
  "Touched grass once. 2/10, wouldn't recommend.",
  "Me and the boys could 100% take a silverback. No cap.",
];

// ---------- routine: where he walks, what he looks at, what he thinks ----------
const P = (x, z) => new THREE.Vector2(x, z);
const SPOT = {
  start: P(-1.35, .55),
  guitar: P(-2.65, -1.75), guitarLook: P(-2.65, -3.2),
  via: P(-1.5, -.85),
  desk: P(-.55, -1.25), deskLook: P(-.55, -3.1),
  glass: P(-2.9, -.45), glassLook: P(-5, -.45),
  bar: P(1.55, -.35), barLook: P(2.3, -1.5),
};
const CAM_HEADING = Math.PI * .25;
const SCRIPT = [
  { path: [], face: null, line: 5, when: 'arrive', hold: 6 },
  { path: [SPOT.guitar], face: SPOT.guitarLook, line: 0, when: 'arrive', hold: 6 },
  { path: [SPOT.via, SPOT.desk], face: SPOT.deskLook, line: 3, when: 'arrive', hold: 6 },
  { path: [SPOT.glass], face: SPOT.glassLook, line: 1, when: 'start', hold: 4 },
  { path: [SPOT.bar], face: SPOT.barLook, line: 2, when: 'start', hold: 4 },
  { path: [SPOT.start], face: null, line: 4, when: 'start', hold: 3 },
];
const WALK_SPEED = .62, INTRO = 3.2;
let phase = 'intro', phaseT = INTRO, si = -1, route = [], heading = CAM_HEADING, walkAmt = 0, stride = 0, faceHeading = CAM_HEADING;
buddy.position.set(SPOT.start.x, F, SPOT.start.y); buddy.rotation.y = heading;
const headingTo = (from, to) => Math.atan2(to.x - from.x, to.y - from.y);
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
const pos2 = () => P(buddy.position.x, buddy.position.z);
function startStep(i) { si = i % SCRIPT.length; const s = SCRIPT[si]; route = s.path.map(p => p.clone()); if (s.when === 'start') think(LINES[s.line], 5600); if (route.length) phase = 'walk'; else arrive(); }
function arrive() { const s = SCRIPT[si]; phase = 'hold'; phaseT = s.hold; faceHeading = s.face ? headingTo(pos2(), s.face) : CAM_HEADING; if (s.when === 'arrive') think(LINES[s.line], 5600); }

// ---------- clicks: Marty, the desk, the guitars ----------
const CLICK_LINES = {
  marty: ["Wsg my boy 🤝", "Ayo, personal space?? jk, what's good bro", "Yo, you good? I'm just vibing fr"],
  desk: ["Claude does the heavy lifting, I just vibe ngl", "Lowkey Claude carries my whole workflow 🔒", "Don't touch my setup. Claude and I are locked in fr"],
  guitar: ["You fw Kanye too? Say less 🔥", "Bro you listen to Ye too? We're twins fr", "That axe is Ye-certified, don't even play"],
  bar: ["It's 5pm somewhere. Probably Bangalore.", "Top shelf is for clients. Bottom shelf is for me.", "Neon says late nights. Neon doesn't lie."],
};
const clickIdx = { marty: 0, desk: 0, guitar: 0, bar: 0 };
const next = k => CLICK_LINES[k][clickIdx[k]++ % CLICK_LINES[k].length];
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null, hop = 0;
const ancestor = (o, g) => { while (o) { if (o === g) return true; o = o.parent; } return false; };
const deskZone = island.getObjectByName('Desk'), barZone = island.getObjectByName('Bar');
const toNdc = e => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
renderer.domElement.addEventListener('pointerdown', e => downAt = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || !inStage(e) || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  toNdc(e); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([buddy, deskZone, music, barZone], true).find(h => h.object.isMesh); if (!hit) return;
  if (window.__martyOut && ancestor(hit.object, buddy)) return;
  if (ancestor(hit.object, buddy)) { hop = 1; think(next('marty'), 3400); }
  else if (ancestor(hit.object, deskZone)) think(next('desk'), 3800);
  else if (ancestor(hit.object, music)) think(next('guitar'), 3800);
  else if (ancestor(hit.object, barZone)) think(next('bar'), 3800);
});
const canHover = [deskZone, music, buddy, barZone];
renderer.domElement.addEventListener('pointermove', e => { if (!inStage(e)) { renderer.domElement.style.cursor = ''; return; } toNdc(e); ray.setFromCamera(ndc, camera); renderer.domElement.style.cursor = ray.intersectObjects(canHover, true).length ? 'pointer' : ''; });
let mouse = new THREE.Vector2();
// touch: one finger sideways orbits the room, two fingers pinch to zoom, double-tap resets. Vertical swipes still scroll.
let spinYaw = 0, spinning = false, zoomK = 1, zoomTo = 1;
{ const cv = renderer.domElement, pts = new Map(); let sx = 0, sy = 0, yaw0 = 0, pinch0 = 0, zoom0 = 1, lastTap = 0;
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' || !inStage(e)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { sx = e.clientX; sy = e.clientY; yaw0 = spinYaw; } if (pts.size === 2) { pinch0 = dist(); zoom0 = zoomTo; spinning = false; } });
  cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch0) { zoomTo = Math.min(1.35, Math.max(.55, zoom0 * pinch0 / dist())); return; }
    const dx = e.clientX - sx; if (!spinning && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy)) spinning = true;
    if (spinning) spinYaw = Math.max(-.9, Math.min(.9, yaw0 + dx / STAGE.width * 2.2)); });
  const up = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; if (!pts.size) spinning = false;
    if (e.type === 'pointerup' && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) { const n = performance.now(); if (n - lastTap < 300) { zoomTo = 1; spinYaw = 0; } lastTap = n; } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  if (matchMedia('(hover: none)').matches) document.getElementById('psst').innerHTML = '<b>Psst.</b> Tap Marty, his guitars or the bar. Swipe sideways to look around, pinch to zoom.'; }
addEventListener('pointermove', e => { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });

// moving contact shadow (Marty doesn't cast into the baked shadow map)
const martyShadow = new THREE.Mesh(new THREE.PlaneGeometry(.75, .75), MT.blob.clone()); martyShadow.material.opacity = .6; martyShadow.rotation.x = -Math.PI / 2; island.add(martyShadow);
buddy.traverse(o => { if (o.isMesh) o.castShadow = false; });

// ---------- per-frame animation ----------
const _hand = new THREE.Vector3(), _w = new THREE.Vector3(), _head = new THREE.Vector3(), _feet = new THREE.Vector3();
let puffT = 0, nextPuff = 2, exhale = 0;
function updateBuddy(t, dt) {
  if (phase === 'intro') { if (window.__revealed) phaseT -= dt; if (phaseT <= 0) startStep(0); }
  else if (phase === 'walk') {
    const target = route[0], p = pos2(), d = target.clone().sub(p), len = d.length();
    if (len < .04) { route.shift(); if (!route.length) arrive(); }
    else { const want = Math.atan2(d.x, d.y); heading = angLerp(heading, want, Math.min(1, dt * 5)); const facing = Math.cos(want - heading) > .7 ? 1 : .25;
      const step = Math.min(len, WALK_SPEED * dt * facing * Math.max(.3, walkAmt)); buddy.position.x += d.x / len * step; buddy.position.z += d.y / len * step; }
  } else if (phase === 'hold') { heading = angLerp(heading, faceHeading, Math.min(1, dt * 3)); phaseT -= dt; if (phaseT <= 0) startStep(si + 1); }
  buddy.rotation.y = heading;
  walkAmt += ((phase === 'walk' ? 1 : 0) - walkAmt) * Math.min(1, dt * 4); stride += dt * 6.4 * walkAmt;
  const sw = Math.sin(stride) * .42 * walkAmt;
  MARTY.legs.L.leg.rotation.x = sw; MARTY.legs.R.leg.rotation.x = -sw;
  MARTY.legs.L.shin.rotation.x = Math.max(0, sw) * .9 + .04; MARTY.legs.R.shin.rotation.x = Math.max(0, -sw) * .9 + .04;  // knees bend on the back swing
  const bob = Math.abs(Math.cos(stride)) * .022 * walkAmt;
  hips.position.y = MARTY.M.hip + bob; torso.position.y = MARTY.M.hip + bob;
  torso.rotation.y = Math.sin(stride) * .05 * walkAmt;
  const br = Math.sin(t * 1.6) * .5 + .5; torso.scale.set(1 + br * .006, 1 + br * .01, 1 + br * .008);
  torso.rotation.z = Math.sin(t * .35) * .012 * (1 - walkAmt) + Math.cos(stride) * .02 * walkAmt;
  let y = F + (window.__roomDropY || 0);
  if (hop > 0) { hop = Math.max(0, hop - dt * 2.2); const k = Math.sin((1 - hop) * Math.PI); y += k * .12; buddy.scale.set(1 + (1 - k) * hop * .05, 1 - hop * .04 + k * .03, 1); }
  buddy.position.y = y;
  martyShadow.position.set(buddy.position.x, F + .015, buddy.position.z); martyShadow.material.opacity = .6 * (1 - Math.min(1, (window.__roomDropY || 0) / 9));
  const still = 1 - walkAmt;
  const yaw = THREE.MathUtils.clamp(mouse.x * .4, -.4, .4) * still * .6, pitch = THREE.MathUtils.clamp(-mouse.y * .15, -.12, .15) * still;
  head.rotation.y += (yaw + Math.sin(t * .27) * .06 - head.rotation.y) * Math.min(1, dt * 3);
  head.rotation.x += (pitch + .03 - head.rotation.x) * Math.min(1, dt * 3);
  // smoking never stops (also while walking)
  if (t > nextPuff) { puffT = .001; nextPuff = t + rr(6, 9); }
  let k = 0;
  if (puffT > 0) { puffT += dt; const p = puffT / 2.4; k = p < .3 ? THREE.MathUtils.smoothstep(p, 0, .3) : p < .6 ? 1 : 1 - THREE.MathUtils.smoothstep(p, .6, 1); if (p >= 1) { puffT = 0; exhale = 1.6; } }
  _hand.lerpVectors(HAND_R_REST, HAND_R_PUFF, k);
  MARTY.ember.material.color.setRGB(2.2 + k * 3, .6 + k * .6, .1);
  solveArm(MARTY.armR, MARTY.M.shR, _hand, MARTY.M.poleR);
  const sl = Math.sin(stride) * walkAmt; solveArm(MARTY.armL, MARTY.M.shL, walkAmt > .3 ? _w.set(.24, -.02, sl * .18 + .04) : MARTY.M.pocket, MARTY.M.poleL);
  MARTY.tipOf(MARTY.cig.position);
  MARTY.ember.getWorldPosition(_w); head.localToWorld(_head.set(.01, .055, .12));
  exhale = Math.max(0, exhale - dt);
  for (const sp of smoke) { const u = sp.userData; u.life += dt;
    if (!u.init) { u.init = true; sp.position.copy(_w); sp.position.y += u.life * .16; }
    if (u.life > u.max) { u.life = 0; u.puff = exhale > 0 && rand() < .5; sp.position.copy(u.puff ? _head : _w); u.max = u.puff ? rr(1.6, 2.4) : rr(3.4, 4.6); }
    const p = u.life / u.max; sp.position.y += dt * (u.puff ? .12 : .16);
    sp.position.x += Math.sin(t * 1.3 + u.seed) * dt * .03 + (u.puff ? dt * .06 : 0); sp.position.z += Math.cos(t * 1.1 + u.seed) * dt * .03 + (u.puff ? dt * .08 : 0);
    const s = (u.puff ? .06 : .022) + p * (u.puff ? .28 : .2); sp.scale.set(s, s, s);
    sp.material.opacity = Math.sin(Math.min(p, 1) * Math.PI) * (u.puff ? .5 : .32) * Math.min(1, u.life * 4); sp.material.rotation = u.seed + t * .2; }
  if (bubbleMode === 'line' && now() > bubbleUntil) dots();
  // bubble above his head, name tag under his feet (canvas → page coordinates)
  const R = STAGE;
  head.localToWorld(_head.set(0, .3, 0)); _head.project(camera);
  bubble.style.transform = `translate(${(R.left + (_head.x * .5 + .5) * R.width).toFixed(1)}px, ${(R.top + (-_head.y * .5 + .5) * R.height).toFixed(1)}px) translate(-50%, -100%)`;
  buddy.localToWorld(_feet.set(0, 0, 0)); _feet.project(camera);
  nametag.style.transform = `translate(${(R.left + (_feet.x * .5 + .5) * R.width).toFixed(1)}px, ${(R.top + (-_feet.y * .5 + .5) * R.height).toFixed(1)}px) translate(-50%, 8px)`;
  if (turntable.userData.plat) turntable.userData.plat.rotation.y -= dt * 3.5;
}

/* =========================================================
   Camera: frame the room in the window, drift with the cursor, settle in on reveal
   ========================================================= */
const CAM_DIR = new THREE.Vector3(34, 15.2, 34).normalize();
const ROOM_T = new THREE.Vector3(0, .95, .15);
let parX = 0, parY = 0, camIn = 0, camT0 = 0, roomW = 0, roomH = 0;
const parEl = document.getElementById('par');
const _off = new THREE.Vector3(), _tgt = new THREE.Vector3();
function sizeRoom() {
  const r = stageWin.getBoundingClientRect(); roomW = Math.max(1, Math.round(r.width)); roomH = Math.max(1, Math.round(r.height));
  renderer.setSize(roomW, roomH, false); camera.aspect = roomW / roomH; camera.updateProjectionMatrix(); }
function frameCamera(dt) {
  // fit the room's bounds: whichever of width or height is tighter decides the distance
  const Rb = 5.25, vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
  let d = Math.max(Rb / Math.sin(vf), Rb / Math.sin(hf)) * (camera.aspect < .9 ? 1.02 : 1.16); // pulled back: the room sits small in the window with sky around it
  const intro = 1 + .18 * (1 - camIn);
  d *= intro / zoomK;
  const yawOff = spinYaw + mouse.x * .05 * camIn, pitOff = -mouse.y * .025 * camIn;
  _off.copy(CAM_DIR).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawOff); _off.y += pitOff;
  _tgt.copy(ROOM_T);
  camera.position.copy(_tgt).addScaledVector(_off.normalize(), d); camera.lookAt(_tgt);
}
addEventListener('resize', sizeRoom); sizeRoom();
new ResizeObserver(sizeRoom).observe(stageWin);

const clock = new THREE.Clock();
let lastT = 0, heroOn = true, firstFrame = true;
new IntersectionObserver(es => es.forEach(e => { heroOn = e.isIntersecting; }), { rootMargin: '10% 0px 10% 0px' }).observe(stageEl);
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime(), dt = Math.min(.05, t - lastT); lastT = t;
  STAGE = stageEl.getBoundingClientRect();
  const off = !heroOn;
  ['bubble', 'nametag'].forEach(id => { const el = document.getElementById(id); const v = (off || window.__martyOut) ? 'hidden' : ''; if (el.style.visibility !== v) el.style.visibility = v; });
  if (off && !firstFrame) return;                                                          // scrolled away: no 3D work at all
  if (!spinning) spinYaw += (0 - spinYaw) * Math.min(1, dt * 1.2);
  zoomK += (zoomTo - zoomK) * Math.min(1, dt * 8);
  if (window.__revealed) camIn = Math.min(1, camIn + dt / 1.8);
  const e = 1 - Math.pow(1 - camIn, 3); camIn = camIn;
  parX += (-mouse.x * 22 - parX) * Math.min(1, dt * 3); parY += (mouse.y * 14 - parY) * Math.min(1, dt * 3);
  parEl.style.transform = `translate3d(${parX.toFixed(2)}px, ${parY.toFixed(2)}px, 0)`;
  frameCamera(dt);
  updateBuddy(t, dt);
  renderer.render(scene, camera); firstFrame = false;
});

/* =========================================================
   Loader: real progress (models, textures, fonts), then the page wipes up
   ========================================================= */
const loaderEl = document.getElementById('loader');
const loadBar = document.getElementById('bar'), pct = document.getElementById('pct'), note = document.getElementById('loadNote');
const NOTES = ["Marty's lighting up", 'Tuning the guitars', 'Pouring something expensive', 'Dimming the lights'];
const MIN_MS = 1700, MAX_MS = 9000, t0 = performance.now();
let shown = 0, fontsOk = false; document.fonts.ready.then(() => fontsOk = true);
(function prog() {
  const el = performance.now() - t0, real = Math.min(window.__load.p, fontsOk ? 1 : .9), time = Math.min(1, el / MIN_MS);
  const target = Math.min(real, .15 + time * .85); shown += (target - shown) * .12;
  const ready = (window.__load.done && fontsOk && el > MIN_MS) || el > MAX_MS;
  if (ready) shown += (1 - shown) * .25;
  loadBar.style.setProperty('--p', shown.toFixed(3)); pct.textContent = `${Math.round(shown * 100)}%`; note.textContent = NOTES[Math.min(NOTES.length - 1, Math.floor(shown * NOTES.length))];
  if (window.__holdLoader) return requestAnimationFrame(prog);
  if (ready && shown > .985) { loadBar.style.setProperty('--p', 1); pct.textContent = '100%'; propsReady.then(() => { renderer.compile(scene, camera); reveal(); }); }
  else requestAnimationFrame(prog);
})();
function reveal() {
  if (window.__revealed) return;
  window.__revealed = true; bakeShadows();
  loaderEl.classList.add('up');
  setTimeout(() => document.body.classList.add('in'), 380);
  setTimeout(() => { document.body.classList.add('ready'); loaderEl.style.display = 'none'; }, 1250);
}

/* =========================================================
   SECTION 2 · Engines: marquee, highlight-wipe heading, cursor dots, bento, detail pages
   ========================================================= */
// marquee
{ const items = ['People-led growth', 'Founder videos', 'Team skits', 'B2B podcasts', 'Video outbound', 'LinkedIn & X', 'Thought Leader Ads', 'Clipping', 'Pre-sold calls', 'No more ghost founders'];
  const html = items.map(t => `<span>${t}</span>`).join(''); document.getElementById('mqTrack').innerHTML = html + html; }

// highlight-marker heading: split into visual lines, then wipe white + orange bars across each line
function buildHighlight(el) {
  if (!el._src) el._src = el.innerHTML;
  el.innerHTML = el._src;
  const words = [];
  const walk = (node, mute) => { [...node.childNodes].forEach(n => { if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(w => { if (w.trim()) words.push({ w, mute }); }); else walk(n, mute || n.classList.contains('mute')); }); };
  walk(el, false);
  el.innerHTML = words.map((o, i) => `<span class="w${o.mute ? ' mute' : ''}">${o.w}</span>`).join(' ');
  const spans = [...el.querySelectorAll('.w')], lines = [];
  spans.forEach(s => { const top = s.offsetTop; let ln = lines.find(l => Math.abs(l.top - top) < 4); if (!ln) lines.push(ln = { top, ws: [] }); ln.ws.push(s.outerHTML); });
  el.innerHTML = lines.map((l, i) => `<span class="hl-line" style="--i:${i}"><span class="t">${l.ws.join(' ')}</span><span class="hl-bar a"></span><span class="hl-bar b"></span></span>`).join('<br>');
}
const eh = document.getElementById('enginesTitle');
document.fonts.ready.then(() => { buildHighlight(eh); });
let ehW = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - ehW) > 40) { ehW = innerWidth; const go = eh.classList.contains('go'); buildHighlight(eh); if (go) eh.querySelectorAll('.t').forEach(t => t.style.visibility = 'visible'), eh.querySelectorAll('.hl-bar').forEach(b => b.style.display = 'none'); } });
// time-driven highlight wipe (bars grow in from the left, then retract to the right; text appears under them)
function playHighlight(el) {
  const lines = [...el.querySelectorAll('.hl-line')], t0 = performance.now(), D = 1050, ST = 110;
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  (function tick() {
    const now = performance.now(); let done = true;
    lines.forEach((ln, i) => {
      const bars = ln.querySelectorAll('.hl-bar'), t = ln.querySelector('.t');
      bars.forEach((b, j) => {
        const p = Math.min(1, Math.max(0, (now - t0 - i * ST - j * 70) / D)); if (p < 1) done = false;
        if (p < .5) { b.style.transformOrigin = 'left center'; b.style.transform = `scaleX(${ease(p / .5)})`; }
        else { b.style.transformOrigin = 'right center'; b.style.transform = `scaleX(${1 - ease((p - .5) / .5)})`; }
      });
      if (now - t0 - i * ST > D * .5) t.style.visibility = 'visible';
    });
    if (!done) requestAnimationFrame(tick);
  })();
}
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; if (e.target === eh) { eh.classList.add('go'); playHighlight(eh); } else e.target.classList.add('in'); io.unobserve(e.target); }), { threshold: [0, .15], rootMargin: '0px 0px -12% 0px' });
io.observe(eh);
document.querySelectorAll('.tile').forEach((t, i) => { const d = (i % 3) * 90; t.style.transitionDelay = `0ms, 0ms, 0ms, ${d}ms, ${d}ms`; /* transform, scale, box-shadow stay instant; only the reveal staggers */ io.observe(t); });

// tile visuals
{ const wave = document.getElementById('wave'); for (let i = 0; i < 44; i++) { const h = 18 + Math.abs(Math.sin(i * .55) * 52 + Math.sin(i * 1.7) * 16); wave.insertAdjacentHTML('beforeend', `<i style="--h:${h.toFixed(0)}px;--d:${(i % 9) / 9}"></i>`); }
  const cal = document.getElementById('cal'); const mt = [2, 4, 8, 10, 12, 15, 17, 19, 22, 25]; let k = 0; for (let i = 0; i < 28; i++) cal.insertAdjacentHTML('beforeend', `<i class="${mt.includes(i) ? 'm' : ''}" style="--d:${mt.includes(i) ? k++ : 0}"></i>`);
  const bars = document.getElementById('bars'); const a = [86, 80, 88, 74, 78, 70, 66], b = [86, 74, 64, 52, 44, 34, 24]; a.forEach((h, i) => bars.insertAdjacentHTML('beforeend', `<i style="--h:${h}%;--h2:${b[i]}%;--d:${i}"></i>`)); }

// tile tilt + depth parallax + spotlight (mouse only). One listener finds the tile under the cursor by geometry,
// so nothing layered above the grid can swallow the effect on some tiles.
{
  const tiles = [...document.querySelectorAll('.bento .tile, .work > .wk-cta')]; let cur = null, raf = 0, ex = 0, ey = 0;
  const reset = t => { t.classList.remove('hov'); ['--rx', '--ry'].forEach(v => t.style.setProperty(v, '0deg')); t.style.setProperty('--px', 0); t.style.setProperty('--py', 0); };
  const run = () => { raf = 0; let hit = null, r;
    for (const t of tiles) { r = t.getBoundingClientRect(); if (ex >= r.left && ex <= r.right && ey >= r.top && ey <= r.bottom) { hit = t; break; } }
    if (cur && cur !== hit) reset(cur); cur = hit; if (!hit) return; r = hit.getBoundingClientRect();
    const px = (ex - r.left) / r.width, py = (ey - r.top) / r.height; hit.classList.add('hov');
    hit.style.setProperty('--mx', `${px * 100}%`); hit.style.setProperty('--my', `${py * 100}%`);
    if (!hit.classList.contains('t-cta') && !hit.classList.contains('wk-cta')) { hit.style.setProperty('--ry', `${((px - .5) * 11).toFixed(2)}deg`); hit.style.setProperty('--rx', `${((.5 - py) * 9).toFixed(2)}deg`); } // the wide CTA card stays flat; only its insides move
    hit.style.setProperty('--px', (px - .5).toFixed(3)); hit.style.setProperty('--py', (py - .5).toFixed(3)); };
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; ex = e.clientX; ey = e.clientY; if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
  // touch: the card leans toward your finger while you press it, and every card drifts in depth as it scrolls past
  const touchAt = e => { if (e.pointerType !== 'touch') return; ex = e.clientX; ey = e.clientY; if (!raf) raf = requestAnimationFrame(run); };
  addEventListener('pointerdown', touchAt, { passive: true }); addEventListener('pointermove', touchAt, { passive: true });
  const lift = e => { if (e.pointerType === 'touch' && cur) { const t = cur; setTimeout(() => { if (cur === t) { reset(t); cur = null; scrollDepth(); } }, 120); } };
  addEventListener('pointerup', lift, { passive: true }); addEventListener('pointercancel', lift, { passive: true });
  const noHover = matchMedia('(hover: none)');
  let sd = 0; const scrollDepth = () => { sd = 0; if (!noHover.matches) return; const H = innerHeight;
    tiles.forEach(t => { if (t === cur) return; const r = t.getBoundingClientRect(); if (r.bottom < 0 || r.top > H) return;
      const py = Math.max(-1, Math.min(1, (r.top + r.height / 2 - H / 2) / (H * .6))) * .5;
      t.style.setProperty('--py', py.toFixed(3)); t.style.setProperty('--px', '0'); t.style.setProperty('--rx', `${(-py * 10).toFixed(2)}deg`); t.style.setProperty('--ry', '0deg'); }); };
  addEventListener('scroll', () => { if (!sd) sd = requestAnimationFrame(scrollDepth); }, { passive: true });
  addEventListener('scroll', () => { if (!raf && ex) raf = requestAnimationFrame(run); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (cur) reset(cur); cur = null; });
}

// cursor halftone dots (reference: dot-matrix glow trailing the cursor), only inside this section
function dotsFor(cv, sec) {
  const g = cv.getContext('2d');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio, 2); const pts = []; let raf = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const navEl = () => document.querySelector('.nav');
  if (fine) addEventListener('pointermove', e => { if (e.target.closest && e.target.closest('.nav, .drop')) return; pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (pts.length > 40) pts.shift(); if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
  const STEP = 11, SIG = 46, LIFE = 1100;
  function draw() {
    raf = 0; g.clearRect(0, 0, W, H);
    const now = performance.now(); while (pts.length && now - pts[0].t > LIFE) pts.shift();
    if (!pts.length) return;
    const r = sec.getBoundingClientRect(); const y0 = Math.max(0, r.top), y1 = Math.min(H, r.bottom); if (y1 <= y0) { raf = requestAnimationFrame(draw); return; }
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const pad = SIG * 2.6, gx0 = Math.max(0, Math.floor((minX - pad) / STEP)), gx1 = Math.min(Math.ceil(W / STEP), Math.ceil((maxX + pad) / STEP)), gy0 = Math.max(Math.floor(y0 / STEP), Math.floor((minY - pad) / STEP)), gy1 = Math.min(Math.ceil(y1 / STEP), Math.ceil((maxY + pad) / STEP));
    const w = pts.map(p => Math.pow(1 - (now - p.t) / LIFE, 1.6));
    const nv = navEl(), nr = nv ? nv.getBoundingClientRect() : null, NP = 6; // keep the glow off the nav bar and any open menu
    const dr = [...document.querySelectorAll('.drop.open')].map(d => d.getBoundingClientRect());
    const blocked = (x, y) => (nr && x > nr.left - NP && x < nr.right + NP && y > nr.top - NP && y < nr.bottom + NP) || dr.some(q => x > q.left - NP && x < q.right + NP && y > q.top - NP && y < q.bottom + NP);
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const x = gx * STEP + (gy % 2 ? STEP / 2 : 0), y = gy * STEP; let v = 0;
      for (let i = 0; i < pts.length; i++) { const dx = x - pts[i].x, dy = y - pts[i].y; v += w[i] * Math.exp(-(dx * dx + dy * dy) / (2 * SIG * SIG)) * .22; }
      if (v < .06 || blocked(x, y)) continue; v = Math.min(1, v);
      const jitter = ((gx * 73856093 ^ gy * 19349663) >>> 0) % 100 / 100;
      g.beginPath(); g.arc(x, y, 1 + v * 2.1, 0, 6.283);
      if (v < .22) { g.fillStyle = `rgba(160,160,155,${v * 1.6})`; g.fill(); }
      else if (v < .55 || jitter > .82) { g.strokeStyle = `rgba(214,52,32,${.4 + v * .6})`; g.lineWidth = 1.1; g.stroke(); }
      else { g.strokeStyle = jitter > .5 ? `rgba(255,170,90,${v})` : `rgba(240,226,200,${v})`; g.lineWidth = 1.2; g.stroke(); }
    }
    raf = requestAnimationFrame(draw);
  }
}

dotsFor(document.getElementById('dots'), document.getElementById('engines'));

// ---------- offer detail pages ----------
const STEPS = a => `<div class="d-steps">${a.map(([b, s]) => `<div class="d-step"><b>${b}</b><span>${s}</span></div>`).join('')}</div>`;
const LIST = a => `<ul class="d-list">${a.map(([t, e]) => `<li>${t} <em>${e}</em></li>`).join('')}</ul>`;
const OFFERS = {
  content: { num: '01', crumb: '01 · Organic', kicker: 'People-Led Content Engine', title: 'You, but<br><em>everywhere.</em>',
    promise: 'You and your team become the most visible voices in your category within 90 days, without anyone writing, editing or posting a thing. Ghost founder era: over.',
    stats: [['$5.6–9.4k', 'per month, by tier'], ['< 10 hrs', 'of your time a month'], ['90 days', 'to the most-watched in your category']],
    show: `<div class="sc-h"><h4>The cast</h4><span>Your people, not your logo</span></div>
      <div class="sc-cast">
        <div class="card cast" style="--c:#ff4500;--t:5s"><span class="live">● Posting</span><q>Why we said no to our biggest customer</q><div class="meta"><b>The founder</b><small>The why, the hot takes</small><div class="pb"><i></i></div></div></div>
        <div class="card cast" style="--c:#182113;--t:7s"><span class="live">● Posting</span><q>The objection I hear every single week</q><div class="meta"><b>The sales lead</b><small>Objections, wins, deal stories</small><div class="pb"><i></i></div></div></div>
        <div class="card cast" style="--c:#8a6a3f;--t:6s"><span class="live">● Posting</span><q>How it's built vs. how it's sold</q><div class="meta"><b>The engineer</b><small>How it actually works</small><div class="pb"><i></i></div></div></div>
        <div class="card cast" style="--c:#c2410c;--t:8s"><span class="live">● Posting</span><q>Reading our weirdest support tickets</q><div class="meta"><b>The customer crew</b><small>Real tickets, real fixes</small><div class="pb"><i></i></div></div></div>
      </div>
      <div class="reach"><div class="card"><b>1.6%</b><span>of followers is roughly what a company page post reaches.</span><div class="meter"><i style="--w:1.6%"></i></div></div><div class="card"><b>~5 a week</b><span>posts for every voice on LinkedIn and X, written and scheduled for them.</span><div class="meter"><i style="--w:100%"></i></div></div></div>`,
    secs: [
      ['What it is', `<p>Content that runs on your company's people, not its logo. You, plus your sales lead, engineers and the customer-facing crew. Company pages now reach roughly 1.6% of their followers; <strong>people reach everyone else.</strong></p><p>Founder videos, team expert clips, recurring funny-but-informative skits, posts for every voice, carousels and a newsletter.</p>`],
      ['Skits that sell without selling', `<div class="d-chips"><span>Sales rep vs. the objection</span><span>Engineer explains it to sales</span><span>Myth vs. reality in our industry</span><span>Support reads real tickets</span><span>Day one at the company</span><span>How it's built vs. how it's sold</span></div>`],
      ['Choose your level', `<div class="d-tiers">
        <div class="d-tier"><h5>Remote</h5><div class="pr">$5,625<small> /mo</small></div><ul><li>We work from clips you send; the AI clone fills the gaps</li><li>15 short-form videos + 4 skits a month, 19 in total</li><li>1 YouTube long-form a month</li><li>Founder + 2 people posting</li></ul></div>
        <div class="d-tier rec"><span class="tag-r">Recommended</span><h5>Hybrid</h5><div class="pr">$7,500<small> /mo + 1 trip</small></div><ul><li>Our crew flies in for 3 shoot days per term, remote after</li><li>20 short-form videos + 6 skits a month, 26 in total</li><li>2 YouTube long-forms a month</li><li>Founder + 4 people posting</li></ul></div>
        <div class="d-tier"><h5>On-site</h5><div class="pr">$9,375<small> /mo + travel</small></div><ul><li>We shoot on location every month</li><li>25 short-form videos + 8 skits a month, 33 in total</li><li>4 YouTube long-forms a month</li><li>Founder + 5 people posting</li></ul></div></div>
        <p class="d-note" style="margin-top:14px">Every tier: LinkedIn and X posts for each person (about 5 a week each), 4 carousels and 4 newsletter issues a month.<br>Pay upfront and save: a 3-month term, 5% off; the full 4 months, 10% off. Work starts within 72 hours of signing.</p>`],
      ['How it works', STEPS([['Days 1–3', 'Kickoff within 72 hours: positioning, pillars, story bank, cast, voice capture and your AI clone.'], ['Week 2', 'The shoot, on-site or remote. Founder videos, team clips, skits and a B-roll library. First posts go live the same week.'], ['Every week', 'One batch of drafts, one 30-minute async approval, then scheduled posting across every account.'], ['Every month', "A 45-minute strategy call and a one-page report: ICP reach, engaged accounts, next month's plan."]])],
      ['The guarantee', `<div class="d-guar"><b>Love it or leave</b>If you don't love month one, we redo it free. Still not in love? You leave with nothing more owed. Miss the agreed volume and we work free until it's delivered.</div>`]
    ] },
  podcast: { num: '02', crumb: '02 · Podcast', kicker: 'Podcast Engine', title: 'The show is<br>the <em>excuse.</em>',
    promise: '16+ recorded conversations with the customers, partners and investors you actually want, in your first four months. The relationships are the pipeline.',
    stats: [['$6,000', 'per month'], ['4+', 'episodes a month'], ['~5 hrs', 'of your time a month']],
    show: `<div class="sc-h"><h4>On air</h4><span>Your target list, recorded</span></div>
      <div class="sc-pod">
        <div class="card onair"><div class="top"><span class="lamp">● On air</span><span class="tc" data-tc>00:00:00</span></div><div class="bigwave" data-wave></div><div class="who"><span>You, the host</span><span>A guest from your target list</span></div></div>
        <div class="guests">
          <div class="card guest"><span class="ep">Ep 01</span><div><b>The dream buyer</b><small>A VP at an account you'd love to close</small></div></div>
          <div class="card guest"><span class="ep">Ep 02</span><div><b>The partner</b><small>Someone whose audience is your pipeline</small></div></div>
          <div class="card guest"><span class="ep">Ep 03</span><div><b>The investor</b><small>The fund you want on your next round</small></div></div>
          <div class="card guest"><span class="ep">Ep 04</span><div><b>The customer</b><small>A happy one. Quietly, a proof video.</small></div></div>
        </div>
      </div>
      <div class="flow"><span class="k">1 episode</span><i>→</i><span>~5 clips</span><i>→</i><span>Thumbnails + show notes</span><i>→</i><span>YouTube, Spotify, Apple</span><i>→</i><span>Guest highlight + your follow-up</span></div>`,
    secs: [
      ['What it is', `<p>A done-for-you video podcast with you as host. Guests come straight from your target-account list, so every episode is a <strong>warm, recorded conversation</strong> with someone you want to sell to, partner with or raise from.</p><p>Customers appear too, which quietly gives you proof videos. Meanwhile I book you onto other people's shows to borrow their audiences.</p>`],
      ['Every month', LIST([['Video episodes, recorded remotely or in person', '4+'], ['Guest research, booking and prep packs from your target list', '4+ guests'], ["Interview questions built from each guest's work and your goals", 'Every episode'], ['Full audio and video edit with intro and outro', '4+'], ['Short clips, thumbnails and show notes', '~22 clips'], ['Publishing to YouTube, Spotify and Apple', 'Every episode'], ['Guest thank-you, highlight clip and suggested follow-up', 'Every guest'], ['You, booked as a guest on other shows', '2']])],
      ['How it works', STEPS([['Week 1', 'Kickoff within 72 hours. Show concept, name, cover art and trailer. Recording kit list. First four guests booked from your target list.'], ['Week 3', 'Episode one goes live. Then weekly: record for about an hour, approve, publish.'], ['After every episode', "Clips go out across your channels and the guest's. They get a highlight clip; you get a follow-up script."]])],
      ['The guarantee', `<div class="d-guar"><b>Live in 21 days</b>Live within 21 days of kickoff, or the setup fee is refunded. Four or more target-list guests booked every month, or we keep working free until they are.</div><p class="d-note" style="margin-top:14px">Studio hire and travel for in-person episodes are billed at cost. Remote recording avoids both.<br>Pay upfront and save: a 3-month term, 5% off; the full 4 months, 10% off. Work starts within 72 hours of signing.</p>`]
    ],
    init(root) {
      const w = root.querySelector('[data-wave]'); for (let i = 0; i < 64; i++) { const h = 14 + Math.abs(Math.sin(i * .41) * 70 + Math.sin(i * 1.3) * 30); w.insertAdjacentHTML('beforeend', `<i style="--h:${Math.min(100, h).toFixed(0)}%;--d:${(i % 11) / 11}"></i>`); }
      const tc = root.querySelector('[data-tc]'), t0 = performance.now();
      return setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000) + 1532; tc.textContent = [s / 3600, s / 60 % 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); }, 250);
    } },
  revenue: { num: '03', crumb: '03 · Outbound', kicker: 'Revenue Engine', title: 'Meetings,<br>not <em>mysteries.</em>',
    promise: "Video outreach to accounts that already know your people, so sales calls start warm instead of cold. Beyond a flat base, you pay only when a meeting turns into a customer.",
    stats: [['$3,000', 'base per month'], ['$400', 'per closed customer, nothing per meeting'], ['~1 hr', 'of your time a week']],
    show: `<div class="sc-h"><h4>A ramped month of warm meetings</h4><span>Illustrative month</span></div>
      <div class="sc-rev">
        <div class="card mcal"><div class="count"><b data-mtg>0</b><span>held, qualified<br>meetings this month</span></div><div class="grid" data-cal></div></div>
        <div class="card calc" data-calc><h5>Run your own maths</h5>
          <label>Average deal size <output data-o="deal"></output><input type="range" min="10000" max="100000" step="5000" value="30000" data-i="deal"></label>
          <label>Meetings a month <output data-o="mtg"></output><input type="range" min="6" max="20" step="1" value="10" data-i="mtg"></label>
          <label>Your close rate <output data-o="rate"></output><input type="range" min="5" max="40" step="1" value="20" data-i="rate"></label>
          <div class="res"><div><b data-r="cust"></b><span>new customers a month</span></div><div><b data-r="acv"></b><span>annual contract value added</span></div><div><b data-r="fee"></b><span>in fees that month</span></div><div class="x"><b data-r="x"></b><span>return on fees</span></div></div>
        </div>
      </div>`,
    secs: [
      ["What's in it", LIST([['500 target accounts a quarter, researched account by account against your ICP', 'Built for you'], ['AI-driven personalisation: every message written around that company\'s own news, hires and posts', 'Per account'], ['Video-led sequences from you or your sales lead, with short personal videos recorded in a weekly batch', 'Email + LinkedIn'], ['Warm-signal follow-up: anyone who engages with your content or ads jumps the queue', 'Always on'], ['Sales video kit: a customer-story video and objection-handling clips', 'Each quarter'], ['Meetings booked straight onto your calendar, with a weekly report', 'Weekly']])],
      ['Per new customer, honestly', `<div class="vs"><div class="row"><span>In-house SDR, labour only</span><div class="track"><i style="--a:45%;--w:45%">$2,250–4,500</i></div></div><div class="row"><span>Revenue Engine</span><div class="track"><i class="hot" style="--w:14%">$400, only when they sign</i></div></div></div><p class="d-note" style="margin-top:16px">An SDR costs $450–900 per meeting; at a 1-in-5 close rate that's $2,250–4,500 per customer. Plus our $3,000 base. The calculator above uses your numbers; we'll use your real close rate on the call.<br>Pay upfront and save: a 3-month term, 5% off; the full 4 months, 10% off. Work starts within 72 hours of signing.</p>`],
      ['How it works', STEPS([['Week 1', 'Kickoff within 72 hours. Define "qualified" in writing, research the list, set up separate warmed sending domains. Never from your main domain.'], ['Weeks 2–6', 'First sequences go out in week two; then we test angles. Honest note: outbound still takes 60–90 days to hit full speed.'], ['Month 3 on', 'Scale the winning angles and add retargeting of the target list.']])],
      ['The guarantee', `<div class="d-guar"><b>Meetings or month four is free</b>If fewer than 6 held, qualified meetings land in month three, the month-four base fee is waived.</div><p class="d-note" style="margin-top:14px">Conditions: you record the weekly videos and reply to leads within 24 hours.</p>`]
    ],
    init(root) {
      const cal = root.querySelector('[data-cal]'), T = ['VP Sales · intro', 'Head of RevOps', 'CTO · demo', 'Founder · intro', 'VP Eng · demo', 'CRO · intro', 'Dir. Growth', 'COO · demo', 'VP Mktg · intro', 'Head of Data'];
      const M = [1, 3, 4, 7, 9, 11, 12, 15, 17, 18]; let k = 0;
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(d => cal.insertAdjacentHTML('beforeend', `<span class="dow">${d}</span>`));
      for (let i = 0; i < 20; i++) { const m = M.includes(i); cal.insertAdjacentHTML('beforeend', `<span class="d${m ? ' m' : ''}" ${m ? `data-t="${T[k]}" style="--i:${k++}"` : ''}>${i + 1}</span>`); }
      const n = root.querySelector('[data-mtg]'); let c = 0; const iv = setInterval(() => { if (c < 10 && detail.classList.contains('open')) n.textContent = ++c; if (c >= 10) clearInterval(iv); }, 140);
      const el = root.querySelector('[data-calc]'), $ = s => el.querySelector(s), money = v => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v).toLocaleString('en-US')}`;
      const run = () => {
        const deal = +$('[data-i=deal]').value, mtg = +$('[data-i=mtg]').value, rate = +$('[data-i=rate]').value / 100;
        el.querySelectorAll('input').forEach(i => i.style.setProperty('--p', `${(i.value - i.min) / (i.max - i.min) * 100}%`));
        $('[data-o=deal]').textContent = money(deal); $('[data-o=mtg]').textContent = mtg; $('[data-o=rate]').textContent = Math.round(rate * 100) + '%';
        const cust = mtg * rate, acv = cust * deal, fee = 3000 + 400 * cust;
        $('[data-r=cust]').textContent = cust % 1 ? cust.toFixed(1) : cust; $('[data-r=acv]').textContent = money(acv); $('[data-r=fee]').textContent = money(fee); $('[data-r=x]').textContent = (acv / fee).toFixed(1) + '×';
      };
      el.addEventListener('input', run); run(); return iv;
    } },
  paid: { num: '04', crumb: '04 · Paid', kicker: 'Paid Video Engine', title: 'Pour fuel on<br>what <em>burns.</em>',
    promise: "Turn the content that's already winning into ads and clipping campaigns that bring in demos at a lower cost than you pay today.",
    stats: [['$3,750', 'per month + ad spend'], ['10', 'new video ads a month'], ['Per view', 'clipping, billed on results']],
    show: `<div class="sc-h"><h4>Cost per demo, going the right way</h4><span>Illustrative. Your baseline is measured in week one.</span></div>
      <div class="sc-paid">
        <div class="card chart"><div class="kpi"><div><b>Cost per demo <em>↓</em></b></div><span>Beat your baseline by day 60, or the fee is waived until you do.</span></div><svg viewBox="0 0 620 280" aria-hidden="true"><defs><linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3245ff" stop-opacity=".28"/><stop offset="1" stop-color="#3245ff" stop-opacity="0"/></linearGradient></defs>
          <line class="gl" x1="10" x2="610" y1="250" y2="250"/><line class="gl" x1="10" x2="610" y1="170" y2="170"/>
          <line class="base" x1="10" x2="610" y1="70" y2="70"/><text x="12" y="58">YOUR BASELINE</text>
          <path class="area" d="M10 70 L85 82 L160 66 L235 98 L310 116 L385 132 L460 154 L535 172 L610 188 L610 250 L10 250Z"/>
          <path class="ln" d="M10 70 L85 82 L160 66 L235 98 L310 116 L385 132 L460 154 L535 172 L610 188"/>
          <g class="flag"><line x1="460" x2="460" y1="154" y2="250" stroke="#3245ff" stroke-dasharray="3 4"/><circle cx="460" cy="154" r="6" fill="#3245ff"/><rect x="418" y="112" width="84" height="26" rx="13"/><text x="460" y="129" text-anchor="middle">DAY 60</text></g>
          <text x="12" y="272">DAY 0</text><text x="235" y="272" text-anchor="middle">DAY 30</text><text x="460" y="272" text-anchor="middle">DAY 60</text><text x="608" y="272" text-anchor="end">DAY 90</text></svg></div>
        <div class="ads">
          <div class="card ad" style="--c:#3245ff"><span class="win">Winner</span><span class="pl"></span><small>Skit cut</small><b>Sales rep vs. the objection</b></div>
          <div class="card ad" style="--c:#0f1338"><span class="pl"></span><small>Founder hook</small><b>The 15-second why</b></div>
          <div class="card ad" style="--c:#ff4500"><span class="pl"></span><small>Customer proof</small><b>"We cut onboarding in half"</b></div>
          <div class="card ad" style="--c:#5b6bff"><span class="pl"></span><small>Thought Leader Ad</small><b>Your best post, boosted</b></div>
          <div class="card ad" style="--c:#1d2470"><span class="pl"></span><small>Retargeting</small><b>For people who watched</b></div>
          <div class="card ad" style="--c:#8fa0ff"><span class="pl"></span><small>Clipping</small><b>Paid per verified view</b></div>
        </div>
      </div>`,
    secs: [
      ["What's in it", LIST([['Video ad creative cut from skits, founder videos and customer proof, tested head-to-head', '10 a month'], ["Thought Leader Ads: your team's best posts boosted to target titles and accounts", 'LinkedIn'], ['Retargeting people who watched, visited, or sit on your target list', 'Always on'], ['Conversion campaigns aimed at a demo or call, managed weekly', 'LinkedIn + Meta'], ['Clipping: long-form cut into clips by a paid clipper network; you pay only for verified views', 'Per 1,000 views']])],
      ['Pricing', `<div class="d-tiers">
        <div class="d-tier rec"><span class="tag-r">The engine</span><h5>Management + creative</h5><div class="pr">$3,750<small> /mo</small></div><ul><li>10 new video ads a month</li><li>Weekly campaign management</li><li>Thought Leader Ads + retargeting</li></ul></div>
        <div class="d-tier"><h5>Clipping, broad</h5><div class="pr">$3<small> per 1,000 views</small></div><ul><li>Big audiences, hiring, fundraising buzz</li><li>Verified views only</li></ul></div>
        <div class="d-tier"><h5>Clipping, niche B2B</h5><div class="pr">$4<small> per 1,000 views</small></div><ul><li>Tighter, more relevant audiences</li><li>Verified views only</li></ul></div></div>
        <p class="d-note" style="margin-top:14px">Ad spend goes on your own card, at cost. LinkedIn needs roughly $3–6k a month to learn.<br>Pay upfront and save: a 3-month term, 5% off; the full 4 months, 10% off. Work starts within 72 hours of signing.</p>`],
      ['The guarantee', `<div class="d-guar"><b>Beat your baseline</b>If cost per demo isn't better than your pre-engagement baseline by day 60, the management fee is waived until it is.</div><p class="d-note" style="margin-top:14px">Honest limits: clipping buys reach, not targeting. It's brilliant for awareness, hiring and fundraising; it is not a precision sales tool.</p>`]
    ] },
  full: { num: '360', crumb: '360 · Everything', kicker: 'The Full 360', title: 'One partner.<br><em>Four engines.</em>',
    promise: "A full marketing department's output for less than the cost of one team, with exactly one person accountable for all of it. That person is me.",
    stats: [['from $15,620', 'per month (Remote tier)'], ['Up to 10%', 'more off when you pay upfront'], ['Up to 80%', 'cheaper than building it yourself']],
    show: `<div class="sc-h"><h4>Build it yourself, or don't</h4><span>Monthly</span></div>
      <div class="cmp">
        <div class="row"><span>Four vendors or five hires, all managed by you</span><div class="bar"><i class="them" style="--w:100%">$33,650 – $88,000</i></div></div>
        <div class="row"><span>The Full 360, one accountable human</span><div class="bar"><i class="us" style="--w:19%">from $15,620</i></div></div>
      </div>
      <div class="eng4">
        <button class="card" data-go="content"><small>01</small><b>People-Led Content</b></button>
        <button class="card" data-go="podcast"><small>02</small><b>Podcast</b></button>
        <button class="card" data-go="revenue"><small>03</small><b>Revenue</b></button>
        <button class="card" data-go="paid"><small>04</small><b>Paid Video</b></button>
      </div>`,
    secs: [
      ['What it replaces', LIST([['People-led content: a 4-person content team', '$23,000–35,000'], ['A podcast with booked guests: a B2B podcast agency', '$2,000–20,000+'], ['Booked sales meetings: an appointment-setting retainer', '$3,000–15,000'], ['Video ads that convert: creative agency + LinkedIn ads management', '$5,650–18,000']])],
      ['The bonus stack', `<div class="bonus">${[['AI Clone Kit', 'Your likeness and voice, so content continues while you travel', '$2,500 value'], ['Profile Rebuild', 'For every on-camera person', '$1,500 value'], ['Category Gap Report', "You vs. three competitors' founders", '$1,500 value'], ['Hiring Magnet Series', '3 culture videos a quarter', '$3,000 / qtr'], ['Investor Update Series', 'A monthly founder update', '$1,000 / mo'], ['Sales Asset Pack', '3 clips a month for your sales team', '$1,500 / mo'], ['The 15-Minute Playbook', 'The daily routine only you can do', '$500 value'], ['Direct line to Yohith', 'WhatsApp or Slack, answered by me, not a manager', 'Every engine']].map(([b, s, e]) => `<div class="card"><div><b>${b}</b><small>${s}</small></div><em>${e}</em></div>`).join('')}</div>`],
      ['Monthly, by content tier', `<div class="d-tiers"><div class="d-tier"><h5>Remote</h5><div class="pr">$15,620<small> /mo</small></div></div><div class="d-tier rec"><span class="tag-r">Recommended</span><h5>Hybrid</h5><div class="pr">$17,210<small> /mo</small></div></div><div class="d-tier"><h5>On-site</h5><div class="pr">$18,810<small> /mo</small></div></div></div><p class="d-note" style="margin-top:14px">Already 15% under the four engines bought separately. Plus $400 per closed customer from outbound. Every bonus included, setup waived. Ad spend, clipping budgets and travel are at cost and never discounted.</p>`],
      ['The terms', `<p>3- or 4-month terms, then month-to-month with 30 days' notice. Billed monthly in advance, in USD. The bigger the upfront, the bigger the discount: pay a 3-month term upfront and take 5% off; pay the full 4 months and take 10% off. Work starts within 72 hours of signing, and you get a direct line to me from day one. <strong>Every engine carries its own guarantee.</strong></p>`]
    ],
    init(root) { root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => goTo(b.dataset.go)); } },
};

const ORDER = ['content', 'podcast', 'revenue', 'paid', 'full'];
const detail = document.getElementById('detail'), dBody = document.getElementById('dBody');
let openKey = null, fromTile = null, dTimer = 0;
function renderDetail(k) {
  const o = OFFERS[k]; clearInterval(dTimer); dTimer = 0;
  detail.dataset.theme = k; document.getElementById('dCrumb').textContent = o.crumb;
  const nk = ORDER[(ORDER.indexOf(k) + 1) % ORDER.length];
  dBody.innerHTML = `<div class="d-hero"><span class="d-num" aria-hidden="true">${o.num}</span><div><div class="d-kicker">${o.kicker}</div><h2 class="d-title" id="dTitle">${o.title}</h2></div><p class="d-promise">${o.promise}</p></div>
    <div class="d-stats">${o.stats.map(([b, s]) => `<div class="d-stat"><b>${b}</b><span>${s}</span></div>`).join('')}</div>
    ${o.show ? `<div class="d-show">${o.show}</div>` : ''}
    ${o.secs.map(([h, c]) => `<div class="d-sec"><h4>${h}</h4><div>${c}</div></div>`).join('')}
    <div class="d-cta"><h4>Let's see if your team<br>is the next media channel.</h4><div class="ctas" style="margin:0"><a class="btn primary" data-book href="#"><span class="label">Book a free call →</span></a></div></div>
    <div class="d-next"><button data-next="${nk}">Next: ${OFFERS[nk].kicker} →</button></div>`;
  dBody.querySelector('[data-next]').onclick = () => goTo(nk);
  window.applyBook?.(dBody);
  if (o.init) dTimer = o.init(dBody) || 0;
}
function goTo(k) {
  // swap engines inside the open page: quick fade, re-run entrance animations
  dBody.style.transition = 'opacity .25s'; dBody.style.opacity = 0;
  setTimeout(() => { detail.scrollTop = 0; detail.classList.remove('open'); detail.style.transition = 'none'; detail.style.clipPath = 'inset(0 0 0 0 round 0)'; detail.style.visibility = 'visible';
    renderDetail(k); history.replaceState(null, '', '#engine-' + k); openKey = k; detail.offsetWidth;
    requestAnimationFrame(() => { detail.classList.add('open'); dBody.style.opacity = 1; requestAnimationFrame(() => { detail.style.transition = ''; detail.style.clipPath = ''; detail.style.visibility = ''; }); }); }, 260);
}
function setClipFrom(el) { const r = el.getBoundingClientRect(); detail.style.setProperty('--t', r.top + 'px'); detail.style.setProperty('--l', r.left + 'px'); detail.style.setProperty('--r', (innerWidth - r.right) + 'px'); detail.style.setProperty('--b', (innerHeight - r.bottom) + 'px'); }
function openOffer(k, tile, push = true) {
  if (!OFFERS[k]) return; renderDetail(k); openKey = k; fromTile = tile || document.querySelector(`.tile[data-offer="${k}"]`);
  detail.classList.remove('open', 'closing'); detail.style.transition = 'none'; setClipFrom(fromTile); detail.scrollTop = 0; detail.offsetWidth; detail.style.transition = '';
  requestAnimationFrame(() => requestAnimationFrame(() => { if (openKey === k) detail.classList.add('open'); }));
  document.documentElement.style.overflow = 'hidden';
  if (push) history.pushState({ engine: k }, '', '#engine-' + k);
}
function closeOffer(pop = false) {
  if (!openKey) return; const t = document.querySelector(`.tile[data-offer="${openKey}"]`) || fromTile; setClipFrom(t);
  detail.classList.add('closing'); detail.classList.remove('open'); openKey = null; clearInterval(dTimer);
  setTimeout(() => { if (!openKey) { detail.classList.remove('closing'); document.documentElement.style.overflow = ''; } }, 800);
  if (!pop && location.hash.startsWith('#engine-')) history.back();
}
document.querySelectorAll('.tile').forEach(t => t.addEventListener('click', () => openOffer(t.dataset.offer, t)));
document.getElementById('dBack').onclick = () => closeOffer();
addEventListener('keydown', e => { if (e.key === 'Escape' && openKey) closeOffer(); });
addEventListener('popstate', () => { const m = location.hash.match(/^#engine-(\w+)/); if (m) openOffer(m[1], null, false); else closeOffer(true); });
document.querySelectorAll('.drop a').forEach((a, i) => { if (i < 4) a.addEventListener('click', e => { e.preventDefault(); document.getElementById('engines').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => openOffer(ORDER[i]), 700); }); });
{ const m = location.hash.match(/^#engine-(\w+)/); if (m) setTimeout(() => openOffer(m[1], null, false), 400); }
window.__open = k => openOffer(k);


/* =========================================================
   SECTION 3 · AI Lab: a premium deck dealt by scroll
   ========================================================= */
{
const lab = document.getElementById('lab'), table = document.getElementById('table'), ro = document.getElementById('ro'), roBody = document.getElementById('roBody'), deckLbl = document.getElementById('deckLbl'), engines = document.getElementById('engines');
const RED = '#a8182b', INK = '#141310', STOCK = '#fbf8f1', GOLD = 'url(#pc-gold)', BLUE = '#1d3557';
const CARDS = [
  { r: 'A', s: 'spade', art: 'ace', name: 'The Clone', what: 'Your face and voice on a month of videos, while you close a round from a plane.', ai: 'Renders the video from an approved script, in your face and voice.', you: 'Write or approve every word. Every clone video is labelled as one.', tag: 'Film once, show up all month' },
  { r: 'K', s: 'diamond', art: 'king', name: 'The Strategist', what: 'The competitor teardown a junior team needs a fortnight for.', ai: 'Reads 90 to 120 days of your category and three rival founders, and scores hooks, consistency and gaps.', you: 'I pick the angle that only you can own.', tag: 'Weeks of research in one afternoon' },
  { r: 'Q', s: 'heart', art: 'queen', name: 'The Voice', what: 'One voice memo becomes a month of posts that sound like you, not a LinkedIn bro.', ai: 'Turns a 60-minute memo into a story bank and drafts posts in your voice.', you: 'You edit. Nothing ships in a voice you would not use.', tag: '60 minutes in, a month out' },
  { r: 'J', s: 'club', art: 'jack', name: 'The Editor', what: 'Long-form in, short clips out, before the coffee goes cold.', ai: 'Finds the moments worth clipping, cuts, captions and drafts thumbnails.', you: 'Taste. A human makes the final cut on every clip.', tag: 'Clips the same week you record' },
  { r: '10', s: 'spade', art: 'pips', name: 'The List', what: 'Outbound that knows exactly which founder it is talking to.', ai: 'Enriches leads across 150+ data sources, scores fit and drafts a personal gap report.', you: 'Record the short video and press send. Replies are always human.', tag: 'Thousands of leads, sorted by fit' },
  { r: '9', s: 'diamond', art: 'pips', name: 'The Booker', what: 'Your dream customer shows up to your podcast feeling understood.', ai: "Builds a prep pack and questions from each guest's own work.", you: 'The conversation. That part is never automated.', tag: 'Guest prep in minutes, not evenings' },
  { r: '8', s: 'heart', art: 'pips', name: 'The Tester', what: 'More ad experiments from the same budget. Losers die fast.', ai: 'Spins variants of the hooks that already work and reads the numbers weekly.', you: 'I decide what scales and what gets killed.', tag: 'More tests, same spend' },
  { r: '7', s: 'club', art: 'pips', name: 'The Clerk', what: 'The admin you were never going to do anyway.', ai: 'Schedules every account and assembles the one-page monthly report.', you: 'The 45-minute strategy call, where the real decisions happen.', tag: 'Admin on autopilot' },
  { r: '', s: '', art: 'joker', name: 'House Rules', what: 'The wild card is taste. AI drafts; people decide.', ai: 'Never posts on its own and never pretends to be you without a label.', you: 'A human edit on everything before it leaves the building.', tag: 'Faster, never faceless' },
];
const isRed = s => s === 'heart' || s === 'diamond';

// guilloche: layered epitrochoids, the engraved rosettes on banknotes and premium card backs
function guilloche(cx, cy, R, r, d, turns = 1, n = 720) {
  let p = ''; const k = (R + r) / r;
  for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2 * turns; const x = cx + (R + r) * Math.cos(t) - d * Math.cos(k * t), y = cy + (R + r) * Math.sin(t) - d * Math.sin(k * t); p += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
  return p;
}
const rosette = (cx, cy, s, op = 1) => [[34, 4, 16, .7], [30, 5, 22, .5], [40, 4, 12, .45], [26, 2, 30, .35]].map(([R, r, d, w]) => `<path d="${guilloche(cx, cy, R * s, r * s, d * s)}" fill="none" stroke="${GOLD}" stroke-width="${w}" opacity="${op}"/>`).join('');

const medal = (cx, cy, r, n, w, op = 1) => Array.from({ length: n }, (_, i) => `<use href="#pc-scroll" x="${cx - w / 2}" y="${cy - r - w * .33}" width="${w}" height="${w * .66}" opacity="${op}" transform="rotate(${i * 360 / n} ${cx} ${cy})"/>`).join('');
const crest = (x, y, a) => `<g transform="rotate(${a} ${x} ${y})"><use href="#pc-scroll" x="${x}" y="${y - 12}" width="36" height="24"/><use href="#pc-scroll" x="${x}" y="${y - 12}" width="36" height="24" transform="scale(-1 1) translate(${-2 * x} 0)"/><path d="M${x} ${y - 9}l4 6-4 6-4-6z" fill="url(#pc-gold)"/></g>`;
const DEFS = `<defs>
  <linearGradient id="pc-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5a22"/><stop offset=".28" stop-color="#e8cc86"/><stop offset=".45" stop-color="#fff3c9"/><stop offset=".62" stop-color="#b8913f"/><stop offset="1" stop-color="#6b4e1d"/></linearGradient>
  <pattern id="pc-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V3.2" stroke="#7a5a22" stroke-width=".75"/></pattern>
  <pattern id="pc-ink" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#15130f"/><circle cx="3.5" cy="3.5" r="1.1" fill="url(#pc-gold)"/></pattern>
  <pattern id="pc-xhatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3M0 0H3" stroke="${INK}" stroke-width=".45"/></pattern>
  <pattern id="pc-red" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="${RED}"/><path d="M4.5 1.6l2.2 2.9-2.2 2.9-2.2-2.9z" fill="url(#pc-gold)"/></pattern>
  <pattern id="pc-blue" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${BLUE}"/><circle cx="4" cy="4" r="1.2" fill="#e8cc86"/></pattern>
  <pattern id="pc-goldcloth" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="url(#pc-gold)"/><path d="M0 6L6 0" stroke="${INK}" stroke-width=".5" opacity=".55"/></pattern>
  <pattern id="pc-backlat" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M5 0L10 5L5 10L0 5Z" fill="none" stroke="#c9a65a" stroke-width=".35" opacity=".55"/></pattern>
  <symbol id="s-spade" viewBox="0 0 100 100"><path d="M50 3C66 22 95 38 95 60c0 15-11 24-23 24-9 0-16-4-20-11 1 11 6 18 14 25H34c8-7 13-14 14-25-4 7-11 11-20 11C16 84 5 75 5 60 5 38 34 22 50 3z"/></symbol>
  <symbol id="s-heart" viewBox="0 0 100 100"><path d="M50 94C24 72 4 55 4 32 4 16 16 6 29 6c10 0 17 6 21 15 4-9 11-15 21-15 13 0 25 10 25 26 0 23-20 40-46 62z"/></symbol>
  <symbol id="s-diamond" viewBox="0 0 100 100"><path d="M50 2C60 20 74 36 88 50 74 64 60 80 50 98 40 80 26 64 12 50 26 36 40 20 50 2z"/></symbol>
  <symbol id="s-club" viewBox="0 0 100 100"><circle cx="50" cy="27" r="20"/><circle cx="26" cy="57" r="20"/><circle cx="74" cy="57" r="20"/><path d="M45 48h10c0 24 4 37 15 48H30c11-11 15-24 15-48z"/></symbol>
  <symbol id="pc-scroll" viewBox="0 0 60 40"><path d="M3 31C9 11 31 3 45 11c10 6 8 20-2 20-8 0-9-9-3-11 4-1 6 3 3 5" fill="none" stroke="url(#pc-gold)" stroke-width="2.4" stroke-linecap="round"/><path d="M15 23c4-10 14-14 20-12-8 4-14 8-20 12zM8 30c2-6 6-9 10-10-3 3-6 6-10 10z" fill="url(#pc-gold)"/><path d="M3 31c-2 5 3 8 7 5" fill="none" stroke="url(#pc-gold)" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <filter id="pc-wear" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 1.75" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
  <pattern id="pc-backpat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45 125 175)"><path d="M5 1.1c1.5 1.7 1.5 2.4 0 3.9-1.5-1.5-1.5-2.2 0-3.9zM5 8.9c1.5-1.7 1.5-2.4 0-3.9-1.5 1.5-1.5 2.2 0 3.9zM1.1 5c1.7-1.5 2.4-1.5 3.9 0-1.5 1.5-2.2 1.5-3.9 0zM8.9 5c-1.7-1.5-2.4-1.5-3.9 0 1.5 1.5 2.2 1.5 3.9 0z" fill="#f3e5cc" opacity=".82"/><path d="M0 0L10 10M10 0L0 10" stroke="#f3e5cc" stroke-width=".22" opacity=".45"/></pattern>
  <radialGradient id="pc-backglow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#a8262b"/><stop offset="1" stop-color="#6d1216"/></radialGradient>
  <symbol id="pc-backart" viewBox="0 0 250 350">
    <rect width="250" height="350" fill="#fbf8f0"/>
    <rect x="11" y="11" width="228" height="328" rx="6" fill="url(#pc-backglow)"/><rect x="11" y="11" width="228" height="328" rx="6" fill="url(#pc-backpat)"/>
    <rect x="15.5" y="15.5" width="219" height="319" rx="4" fill="none" stroke="#f3e5cc" stroke-width=".9"/><rect x="19" y="19" width="212" height="312" rx="3" fill="none" stroke="#f3e5cc" stroke-width=".35"/>
    <ellipse cx="125" cy="175" rx="66" ry="92" fill="#7d151a" stroke="#f3e5cc" stroke-width="1.4"/><ellipse cx="125" cy="175" rx="61" ry="87" fill="none" stroke="#f3e5cc" stroke-width=".45"/>
    ${[[34, 4, 16, .55], [30, 5, 22, .4], [40, 4, 12, .35], [26, 2, 30, .3]].map(([R, r, d, w]) => `<path d="${guilloche(125, 175, R * 1.45, r * 1.45, d * 1.45)}" fill="none" stroke="#f3e5cc" stroke-width="${w}" transform="translate(125 175) scale(1 1.32) translate(-125 -175)"/>`).join('')}
    <circle cx="125" cy="175" r="26" fill="#7d151a" stroke="#f3e5cc" stroke-width="1.1"/><circle cx="125" cy="175" r="22.5" fill="none" stroke="#f3e5cc" stroke-width=".35"/>
    <text x="125" y="183.5" text-anchor="middle" font-size="23" fill="#f3e5cc" style="font-family:Georgia,'Times New Roman',serif;font-style:italic;letter-spacing:-1px">YY</text>
    ${[[125, 52, 0], [125, 298, 180]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})"><path d="${guilloche(x, y, 9, 3, 7)}" fill="none" stroke="#f3e5cc" stroke-width=".45"/><circle cx="${x}" cy="${y}" r="5" fill="#7d151a" stroke="#f3e5cc" stroke-width=".7"/><use href="#s-spade" x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="#f3e5cc"/></g>`).join('')}
    ${[[30, 30, 0], [220, 30, 90], [220, 320, 180], [30, 320, 270]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})" fill="none" stroke="#f3e5cc"><path d="M${x - 4} ${y + 22}C${x - 4} ${y + 6} ${x + 6} ${y - 4} ${x + 22} ${y - 4}" stroke-width=".8"/><path d="M${x + 2} ${y + 16}C${x + 2} ${y + 8} ${x + 8} ${y + 2} ${x + 16} ${y + 2}" stroke-width=".5"/><circle cx="${x + 3}" cy="${y + 3}" r="2.2" fill="#f3e5cc" stroke="none"/></g>`).join('')}
  </symbol>
  <symbol id="pc-ring" viewBox="0 0 250 350">${medal(125, 172, 80, 14, 28, .9)}${rosette(125, 172, 1.3, .35)}</symbol>
</defs>`;
document.querySelector('#lab svg').insertAdjacentHTML('beforeend', DEFS);

const pip = (s, x, y, w, rot) => { const red = isRed(s), k = w * .7; return `<g${rot ? ` transform="rotate(180 ${x} ${y})"` : ''}><use href="#s-${s}" x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}" fill="${red ? RED : GOLD}"/><use href="#s-${s}" x="${x - k / 2}" y="${y - k / 2 + (s === 'heart' ? -1 : 0)}" width="${k}" height="${k}" fill="none" stroke="${red ? '#f1d48a' : '#5a4214'}" stroke-width="${red ? 1.6 : 1.2}" stroke-dasharray="${red ? '1.2 1.6' : '0'}" opacity="${red ? .9 : .55}"/></g>`; };
const use = (s, x, y, w, rot, fill) => `<use href="#s-${s}" x="${(x - w / 2).toFixed(1)}" y="${(y - w / 2).toFixed(1)}" width="${w}" height="${w}" fill="${fill}"${rot ? ` transform="rotate(180 ${x} ${y})"` : ''}/>`;
const corner = c => { const col = isRed(c.s) ? RED : GOLD; const g = `<text transform="translate(24 41) scale(.8 1)" text-anchor="middle" font-size="${c.r.length > 1 ? 29 : 32}" font-weight="700" letter-spacing="${c.r.length > 1 ? -2.5 : 0}" fill="${col}">${c.r}</text>${use(c.s, 24, 56, 17, 0, col)}`; return g + `<g transform="rotate(180 125 175)">${g}</g>`; };
const caption = (t, col = '#7a5a22') => `<text x="125" y="313" text-anchor="middle" font-size="7.5" font-weight="600" letter-spacing="2.4" fill="${col}" opacity=".55">${t.toUpperCase()}</text>`;
const gilt = `<rect x="6" y="6" width="238" height="338" rx="9" fill="none" stroke="url(#pc-gold)" stroke-width="7" opacity=".55" filter="url(#pc-wear)"/><rect x="10.5" y="10.5" width="229" height="329" rx="6" fill="none" stroke="url(#pc-gold)" stroke-width=".9"/>${crest(125, 16, 0)}${crest(125, 334, 180)}`;
const svg = inner => `<svg viewBox="0 0 250 350" aria-hidden="true">${gilt}${inner}</svg>`;
const PIPS = { '7': [[78, 82], [172, 82], [125, 128], [78, 175], [172, 175], [78, 268], [172, 268]], '8': [[78, 82], [172, 82], [125, 128], [78, 175], [172, 175], [125, 222], [78, 268], [172, 268]], '9': [[78, 82], [172, 82], [78, 144], [172, 144], [125, 175], [78, 206], [172, 206], [78, 268], [172, 268]], '10': [[78, 82], [172, 82], [125, 113], [78, 144], [172, 144], [78, 206], [172, 206], [125, 237], [78, 268], [172, 268]] };

// engraved court figures: top half only, mirrored for the classic double-ended card
const S = `stroke="#4a3510" stroke-width=".9" stroke-linejoin="round"`;
const face = (beard, lips) => `<ellipse cx="125" cy="99" rx="15.5" ry="18.5" fill="#fbf1df" ${S}/>
  <path d="M115 95q3.5-2.2 7 0M128 95q3.5-2.2 7 0" fill="none" ${S}/><circle cx="118.6" cy="96.4" r="1.1" fill="${INK}"/><circle cx="131.4" cy="96.4" r="1.1" fill="${INK}"/>
  <path d="M114 91q4-3 8-1M128 90q4-2 8 1" fill="none" stroke="${INK}" stroke-width="1.1"/><path d="M125 96q-2.6 6 .6 9" fill="none" ${S}/>
  ${beard ? `<path d="M110 104c1 18 8 31 15 36 7-5 14-18 15-36-5 6-25 6-30 0z" fill="url(#pc-hatch)" ${S}/><path d="M116 108q4.5-3.6 9-.8 4.5-2.8 9 .8" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` : `<path d="M121 109q4 2.4 8 0" fill="none" stroke="${lips || INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M114.5 103q2 1 3.6 0M132 103q2 1 3.6 0" stroke="${RED}" stroke-width=".7" opacity=".5"/>`}`;
const robe = (fill, collar) => `<path d="M48 186C54 154 80 140 100 136h50c20 4 46 18 52 50z" fill="${fill}" ${S}/>
  <path d="M100 136l25 44 25-44" fill="${collar}" ${S}/><path d="M113 136l12 22 12-22" fill="none" stroke="url(#pc-gold)" stroke-width="1.6"/>
  <path d="M90 138c11 11 59 11 70 0l4 9c-16 14-62 14-78 0z" fill="#fbf7ee" ${S}/>${[96, 108, 125, 142, 154].map((x, i) => `<path d="M${x} ${145 + (i % 2) * 2}l-1.4 3.4h2.8z" fill="${INK}"/>`).join('')}
  <path d="M60 186c4-16 12-28 26-36M190 186c-4-16-12-28-26-36" fill="none" stroke="url(#pc-gold)" stroke-width="2.2"/>`;
const COURT = {
  king: () => `<path d="M171 186L184 76" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/><path d="M171 186L184 76" stroke="url(#pc-gold)" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="185" cy="70" r="7" fill="url(#pc-gold)" ${S}/><path d="M185 57v7M181.5 60.5h7" stroke="${INK}" stroke-width="1.6"/>
    ${robe('url(#pc-red)', 'url(#pc-goldcloth)')}<path d="M104 86c-8 8-9 26-2 40l7-22zM146 86c8 8 9 26 2 40l-7-22z" fill="url(#pc-hatch)" ${S}/>${face(true)}
    <path d="M106 80l-2.5-21 10.5 10.5 6-15.5 5 11 5-11 6 15.5 10.5-10.5-2.5 21z" fill="url(#pc-gold)" ${S}/><rect x="105" y="78" width="40" height="7.5" rx="1.5" fill="url(#pc-gold)" ${S}/>
    <circle cx="103.5" cy="58" r="2.4" fill="url(#pc-gold)" ${S}/><circle cx="120" cy="53.5" r="2.4" fill="url(#pc-gold)" ${S}/><circle cx="130" cy="53.5" r="2.4" fill="url(#pc-gold)" ${S}/><circle cx="146.5" cy="58" r="2.4" fill="url(#pc-gold)" ${S}/>
    <ellipse cx="125" cy="81.8" rx="3" ry="2.3" fill="${RED}"/><circle cx="113" cy="81.8" r="1.5" fill="${BLUE}"/><circle cx="137" cy="81.8" r="1.5" fill="${BLUE}"/>`,
  queen: () => `<path d="M168 186L176 112" stroke="${INK}" stroke-width="1.6"/><path d="M172 150c8-4 12 0 10 6-6 2-10-1-10-6z" fill="#5a6b3a" ${S}/>
    ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${176 + 6 * Math.sin(a * Math.PI / 180)}" cy="${104 - 6 * Math.cos(a * Math.PI / 180)}" rx="4.4" ry="6.4" transform="rotate(${a} ${176 + 6 * Math.sin(a * Math.PI / 180)} ${104 - 6 * Math.cos(a * Math.PI / 180)})" fill="${RED}" ${S}/>`).join('')}<circle cx="176" cy="104" r="3" fill="url(#pc-gold)" ${S}/>
    ${robe('url(#pc-goldcloth)', 'url(#pc-red)')}<path d="M108 82c-14 10-16 40-8 62 6-2 10-10 12-18l-2-26zM142 82c14 10 16 40 8 62-6-2-10-10-12-18l2-26z" fill="url(#pc-hatch)" ${S}/>
    <path d="M106 88c4-14 34-14 38 0-6-6-32-6-38 0z" fill="url(#pc-hatch)" ${S}/>${face(false, RED)}
    <path d="M107 80c2-9 6-14 9-16 2 6 5 7 9 2 4 5 7 4 9-2 3 2 7 7 9 16z" fill="url(#pc-gold)" ${S}/><path d="M107 80h36" stroke="${INK}" stroke-width="1"/>
    ${[110, 117.5, 125, 132.5, 140].map((x, i) => `<circle cx="${x}" cy="${i === 2 ? 62 : i % 2 ? 66 : 72}" r="2" fill="#fbf7ee" ${S}/>`).join('')}<path d="M121 75l4-5 4 5-4 4z" fill="${RED}" ${S}/>`,
  jack: () => `<path d="M64 182L80 104" stroke="${INK}" stroke-width="1.4"/><path d="M80 104c-6-14-2-30 8-38 2 14-1 28-8 38z" fill="url(#pc-hatch)" ${S}/>
    ${robe('url(#pc-ink)', 'url(#pc-goldcloth)')}<path d="M109 88c-8 6-10 24-6 34h8zM141 88c8 6 10 24 6 34h-8z" fill="${INK}"/>${face(false)}
    <path d="M102 86c0-18 46-22 48-2-14-6-34-6-48 2z" fill="url(#pc-red)" ${S}/><path d="M100 87c16-7 34-7 52-2l-1 5c-17-5-34-5-50 2z" fill="url(#pc-gold)" ${S}/>
    <path d="M146 76c12-20 34-26 46-18-14 1-30 8-42 22z" fill="url(#pc-xhatch)" ${S}/><path d="M150 77c14-12 28-17 40-18" fill="none" stroke="url(#pc-gold)" stroke-width="1.2"/>`,
};
function court(c) {
  const col = isRed(c.s) ? RED : INK, id = 'cl-' + c.art;
  return svg(`${corner(c)}<defs><clipPath id="${id}"><path d="M48 60H202V172L48 178Z"/></clipPath></defs>
    <rect x="46" y="58" width="158" height="234" rx="3" fill="#fffdf7" stroke="url(#pc-gold)" stroke-width="1.6"/>
    <g clip-path="url(#${id})">${COURT[c.art]()}</g><g transform="rotate(180 125 175)"><g clip-path="url(#${id})">${COURT[c.art]()}</g></g>
    <path d="M48 178L202 172" stroke="url(#pc-gold)" stroke-width="1.2"/><rect x="49.5" y="61.5" width="151" height="227" rx="2" fill="none" stroke="url(#pc-gold)" stroke-width="1.3"/>
    ${pip(c.s, 64, 78, 15, 0)}${pip(c.s, 186, 272, 15, 1)}${caption(c.name)}`);
}
const FACE_KEY = c => ({ K: 'K', Q: 'Q', J: 'J', '10': 'T', '9': '9', '8': '8', '7': '7' }[c.r] || '') + ({ spade: 'S', heart: 'H', diamond: 'D', club: 'C' }[c.s] || '');
const SERIF = "font-family:Georgia,'Times New Roman',serif";
function art(c) {
  const fk = FACE_KEY(c);
  if (FACES[fk]) return `<img class="pc-img" src="${FACES[fk]}" alt="" draggable="false">`;
  if (c.art === 'ace') {
    const ix = `<text x="17" y="36" text-anchor="middle" font-size="27" font-weight="700" fill="#151310" style="${SERIF}">A</text><use href="#s-spade" x="9.5" y="40" width="15" height="15" fill="#151310"/>`;
    return `<svg viewBox="0 0 250 350" aria-hidden="true"><rect width="250" height="350" fill="#fbf8f0"/>${ix}<g transform="rotate(180 125 175)">${ix}</g>
      <ellipse cx="125" cy="170" rx="74" ry="96" fill="none" stroke="#151310" stroke-width=".6" opacity=".55"/><ellipse cx="125" cy="170" rx="70" ry="92" fill="none" stroke="#151310" stroke-width="1.6" stroke-dasharray=".1 4.2" stroke-linecap="round" opacity=".7"/>
      ${[[34, 4, 16, .5], [30, 5, 22, .35], [40, 4, 12, .3]].map(([R, r, d, w]) => `<path d="${guilloche(125, 168, R * 1.5, r * 1.5, d * 1.5)}" fill="none" stroke="#151310" stroke-width="${w}" opacity=".32"/>`).join('')}
      <use href="#s-spade" x="57" y="96" width="136" height="136" fill="#151310"/>
      <use href="#s-spade" x="83" y="122" width="84" height="84" fill="none" stroke="#fbf8f0" stroke-width="1.2"/><use href="#s-spade" x="91" y="130" width="68" height="68" fill="none" stroke="#fbf8f0" stroke-width=".5" stroke-dasharray="1.5 2"/>
      <path d="${guilloche(125, 158, 9, 2.5, 8)}" fill="none" stroke="#d4a548" stroke-width=".7"/><circle cx="125" cy="158" r="5" fill="#b01e22" stroke="#fbf8f0" stroke-width=".8"/>
      <path d="M78 262h94" stroke="#151310" stroke-width=".6"/><text x="125" y="276" text-anchor="middle" font-size="8" letter-spacing="3.2" fill="#151310" style="${SERIF}">YOHITH YADAV</text>
      <text x="125" y="287" text-anchor="middle" font-size="5.6" letter-spacing="2.6" fill="#151310" opacity=".6" style="${SERIF}">FOUNDER-LED GROWTH · No. 001</text><path d="M78 293h94" stroke="#151310" stroke-width=".6"/></svg>`;
  }
  if (c.art === 'joker') {
    const col = (ch, i) => `<text x="17" y="${34 + i * 15}" text-anchor="middle" font-size="14" font-weight="700" fill="${i % 2 ? '#151310' : '#b01e22'}" style="${SERIF}">${ch}</text>`;
    const L = [...'JOKER'].map(col).join('');
    return `<svg viewBox="0 0 250 350" aria-hidden="true"><defs><clipPath id="pc-jk"><ellipse cx="125" cy="168" rx="70" ry="94"/></clipPath><radialGradient id="pc-jkbg" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#f06a3c"/><stop offset=".6" stop-color="#a3201c"/><stop offset="1" stop-color="#4a0b0d"/></radialGradient></defs>
      <rect width="250" height="350" fill="#fbf8f0"/>${L}<g transform="rotate(180 125 175)">${L}</g>
      <ellipse cx="125" cy="168" rx="70" ry="94" fill="url(#pc-jkbg)"/><g clip-path="url(#pc-jk)" opacity=".28">${Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, b = a + .09; return `<path d="M125 168L${(125 + Math.cos(a) * 140).toFixed(1)} ${(168 + Math.sin(a) * 140).toFixed(1)}L${(125 + Math.cos(b) * 140).toFixed(1)} ${(168 + Math.sin(b) * 140).toFixed(1)}Z" fill="#ffd27a"/>`; }).join('')}</g>
      <image class="pc-joker-img" clip-path="url(#pc-jk)" x="45" y="64" width="160" height="200" preserveAspectRatio="xMidYMid slice" href=""/>
      <ellipse cx="125" cy="168" rx="70" ry="94" fill="none" stroke="#d4a548" stroke-width="2.2"/><ellipse cx="125" cy="168" rx="75" ry="99" fill="none" stroke="#151310" stroke-width=".7"/>
      <ellipse cx="125" cy="168" rx="79" ry="103" fill="none" stroke="#151310" stroke-width="1.4" stroke-dasharray=".1 4" stroke-linecap="round" opacity=".6"/>
      ${[[125, 62], [125, 274], [46, 168], [204, 168]].map(([x, y]) => `<use href="#s-diamond" x="${x - 5}" y="${y - 5}" width="10" height="10" fill="#b01e22"/>`).join('')}
      <text x="125" y="296" text-anchor="middle" font-size="7.5" letter-spacing="3.4" fill="#151310" style="${SERIF}">THE WILD CARD</text></svg>`;
  }
  if (c.art !== 'pips') return court(c);
  const col = isRed(c.s) ? RED : INK, P = PIPS[c.r];
  return svg(`${corner(c)}${P.map(([x, y]) => pip(c.s, x, y, 37, y > 175)).join('')}${caption(c.name)}`);
}

const idx = c => c.r ? `${c.r}${{ spade: '♠', heart: '♥', diamond: '♦', club: '♣' }[c.s]}` : '★';
const els = CARDS.map((c, i) => {
  const d = document.createElement('div'); d.className = 'pc'; d.tabIndex = 0; d.style.setProperty('--k', i);
  d.setAttribute('aria-label', `${c.name}: ${c.what} AI does: ${c.ai} Human does: ${c.you}`);
  d.innerHTML = `<i class="pc-sh"></i><div class="pc-in"><div class="pc-face pc-front">${art(c)}<i class="pc-gl"></i><i class="pc-foil"></i></div><div class="pc-face pc-back"><svg viewBox="0 0 250 350" aria-hidden="true"><use href="#pc-backart" width="250" height="350"/></svg><i class="pc-gl"></i></div></div>
    <div class="pc-txt"><b>${c.name}</b><p>${c.what}<span><em>AI does:</em> ${c.ai}</span><span><em>You do:</em> ${c.you}</span></p><div class="t">⚡ ${c.tag}</div></div>`;
  table.appendChild(d); return d;
});
document.querySelectorAll('.pc svg text').forEach(t => { if (!t.style.fontFamily) t.style.fontFamily = 'var(--sf)'; });

// readout
let shown = -2;
function showCard(i) {
  if (i === shown) return; shown = i; ro.classList.add('swap');
  setTimeout(() => {
    if (i < 0) roBody.innerHTML = `<p class="ro-intro"><b>Nine cards, one deck.</b><br>Keep scrolling. Each card is a job a junior used to do in a week, now done in minutes, plus the part a human still owns.</p>`;
    else { const c = CARDS[i]; roBody.innerHTML = `<div class="ro-top"><span class="ro-idx${isRed(c.s) ? ' red' : ''}">${idx(c)}</span><span class="ro-name">${c.name}</span><span class="ro-count">${i + 1} of 9</span></div><p class="ro-what">${c.what}</p><div class="ro-split"><div><small>AI does</small><p>${c.ai}</p></div><div><small>You do</small><p>${c.you}</p></div></div><div class="ro-tag">${c.tag}</div>`; }
    ro.classList.remove('swap');
  }, 180);
}

// heading wipe
const labTitle = document.getElementById('labTitle');
document.fonts.ready.then(() => buildHighlight(labTitle));
new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { playHighlight(labTitle); o.disconnect(); } }), { threshold: .6 }).observe(labTitle);

const flat = () => matchMedia('(max-width: 900px), (hover: none)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eback = x => { const c = 1.25; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }; // lands with a tiny settle
const N = CARDS.length, S0 = .07, STEP = .082, DUR = .12;
let cur = 0, hover = -1, L = null, running = false, tableR = null;
const st = CARDS.map(() => ({ h: 0, sx: 0, tx: 0, ty: 0, k: {} }));
const parts = els.map(el => ({ el, sh: el.querySelector('.pc-sh'), inn: el.querySelector('.pc-in'), gl: [...el.querySelectorAll('.pc-gl')] }));
const put = (k, o, prop, v) => { if (k[prop] !== v) { k[prop] = v; o.style[prop === 'z' ? 'zIndex' : prop === 'op' ? 'opacity' : 'transform'] = v; } };
// hover by fan geometry, not DOM hit-testing: overlapping, moving cards made pointerenter flicker
let pX = -1e4, pY = -1e4, tiltU = 0, tiltV = 0, focusIdx = -1, dealtN = 0;
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { pX = e.clientX; pY = e.clientY; } }, { passive: true });
document.addEventListener('pointerleave', () => { pX = pY = -1e4; });
els.forEach((el, i) => { el.addEventListener('focus', () => { focusIdx = i; }); el.addEventListener('blur', () => { if (focusIdx === i) focusIdx = -1; }); });
function pick() {
  if (focusIdx >= 0) return focusIdx;
  const tr = tableR || table.getBoundingClientRect(), x = pX - tr.left, y = pY - tr.top;
  const cx = L.fx, cy = L.fy + L.R, ang = Math.atan2(x - cx, cy - y), dist = Math.hypot(x - cx, y - cy);
  const i = Math.round(ang / L.step + (N - 1) / 2), lifted = hover >= 0 ? L.cw * .45 : 0;
  if (i < 0 || i >= N || i >= dealtN || dist < L.R - L.ch * .55 || dist > L.R + L.ch * .55 + lifted) return -1;
  tiltU = clamp(ang / L.step - (i - (N - 1) / 2), -.5, .5); tiltV = clamp((L.R - dist) / L.ch, -.5, .5);
  return i;
}
function layout() {
  const W = table.clientWidth, H = table.clientHeight, pin = table.getBoundingClientRect();
  const headB = Math.max(document.querySelector('.lab-head').getBoundingClientRect().bottom, ro.getBoundingClientRect().bottom) - pin.top;
  const cw = Math.round(Math.max(130, Math.min(206, W * .13, (H - headB) * .62 / 1.4))), ch = cw * 1.4;
  const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 40;
  const R = cw * 4.4, step = 5.4 * Math.PI / 180, a4 = step * (N - 1) / 2;
  const drop = R * (1 - Math.cos(a4)) + ch / 2 * Math.cos(a4) + cw / 2 * Math.sin(a4);
  const span = ch / 2 + drop + 14, room = H - headB;
  const fy = headB + Math.max(ch / 2 + 22, (room - span) * .42 + ch / 2);
  const deckX = pad + cw * .62, deckY = fy + drop * .35;
  const fx = (deckX + cw * .9 + W - pad) / 2;
  els.forEach(el => el.style.setProperty('--w', cw + 'px')); st.forEach(s => { s.k = {}; });
  deckLbl.style.left = deckX + 'px'; deckLbl.style.top = (deckY + ch / 2 + 22) + 'px';
  L = { cw, ch, deckX, deckY, fx, fy, R, step };
}
let lastCover = '', lastLbl = '';
function frame3() {
  if (!running) return; requestAnimationFrame(frame3);
  if (!L) layout();
  const r = lab.getBoundingClientRect(), H = innerHeight; tableR = table.getBoundingClientRect();
  const q = clamp(1 - r.top / (H * .55)), cv = q.toFixed(3);
  if (cv !== lastCover) { lastCover = cv; engines.style.setProperty('--cover-y', (q * H * .32).toFixed(1) + 'px'); engines.style.setProperty('--cover-dim', (q * .5).toFixed(3)); }
  if (flat()) return;
  const target = reduce ? 1 : clamp(-r.top / (r.height - H));
  cur += (target - cur) * .16; if (Math.abs(target - cur) < .0004 || window.__labSnap) cur = target;
  hover = pick(); lab.style.cursor = hover >= 0 ? 'pointer' : '';
  let dealt = 0, last = -1;
  parts.forEach(({ el, sh, inn, gl }, i) => {
    const t = clamp((cur - S0 - i * STEP) / DUR), e = eio(t), eb = eback(t), s = st[i], k = s.k;
    if (t >= 1) dealt++; if (t > .55) last = i;
    const ang = (i - (N - 1) / 2) * L.step;
    const tx = L.fx + L.R * Math.sin(ang), ty = L.fy + L.R * (1 - Math.cos(ang));
    const left = N - 1 - i;
    const dx = L.deckX + left * .7 - 3, dy = L.deckY - left * 1.2 + 5, dr = -6 + ((i * 37) % 9 - 4) * .5;
    const on = hover === i && t >= 1;
    s.h += ((on ? 1 : 0) - s.h) * .24;
    s.tx += ((on ? tiltV * 16 : 0) - s.tx) * .2; s.ty += ((on ? tiltU * 22 : 0) - s.ty) * .2;
    const spread = hover >= 0 && hover !== i && t >= 1 ? Math.sign(i - hover) * L.cw * .17 / Math.max(1, Math.abs(i - hover)) : 0; s.sx += (spread - s.sx) * .22;
    const arc = Math.sin(Math.PI * e);
    const x = dx + (tx - dx) * eb + s.sx, y = dy + (ty - dy) * eb - arc * L.cw * .9 - s.h * L.cw * .4;
    let rot = dr + (ang * 180 / Math.PI - dr) * eb; rot *= 1 - s.h * .75; rot += arc * -9;
    const sc = 1 + arc * .12 + s.h * .14;
    const flip = 180 * (1 - eio(clamp((t - .1) / .72)));
    const lift = Math.max(arc, s.h * .8);
    put(k, el, 'tf', `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`);
    put(k, inn, 'ti', `rotateX(${s.tx.toFixed(1)}deg) rotateY(${(flip + s.ty).toFixed(1)}deg)`);
    put(k, sh, 'ts', `translate3d(${(lift * 6).toFixed(1)}px,${(3 + lift * L.cw * .14).toFixed(1)}px,0) scale(${(1 + lift * .06).toFixed(3)})`);
    if (k.so !== (v => v)((.55 - lift * .25).toFixed(2))) { k.so = (.55 - lift * .25).toFixed(2); sh.style.opacity = k.so; }
    const g = `translate3d(${(-30 + rot * 2.4 + s.ty * 1.6 + (flip > 90 ? 180 - flip : flip) * .3).toFixed(1)}%,0,0)`;
    if (k.g !== g) { k.g = g; gl.forEach(n => n.style.transform = g); }
    put(k, el, 'z', String(s.h > .05 ? 400 : t > 0 && t < 1 ? 300 : t >= 1 ? 100 + i : 100 - i));
  });
  dealtN = dealt;
  showCard(hover >= 0 ? hover : last);
  const lbl = dealt === N ? '<b>Full house.</b> Hover any card' : `Dealt <b>${dealt}</b> of ${N}`; if (lbl !== lastLbl) { lastLbl = lbl; deckLbl.innerHTML = lbl; }
  lab.classList.toggle('finale', dealt === N);
}
addEventListener('resize', () => { L = null; });
// re-measure the AI Lab and Work headings when the window size changes (they were only measured once, at load,
// so a page opened in a narrow panel kept one-word lines, and the tall heading squeezed the cards smaller)
{ let hw = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - hw) < 40) return; hw = innerWidth;
  [document.getElementById('labTitle'), document.getElementById('wkTitle'), document.getElementById('prTitle')].forEach(h => { if (!h || !h._src) return; const played = h.querySelector('.t') && getComputedStyle(h.querySelector('.t')).visibility === 'visible';
    buildHighlight(h); if (played) { h.querySelectorAll('.t').forEach(t => t.style.visibility = 'visible'); h.querySelectorAll('.hl-bar').forEach(b => b.style.display = 'none'); } });
  L = null; }); }
document.fonts.ready.then(() => { L = null; });
new IntersectionObserver(es => es.forEach(e => { const was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(frame3); }), { rootMargin: '100px 0px 100px 0px' }).observe(lab);
// phones / touch: deal each card into view as you reach it
const mio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && flat()) { e.target.classList.add('dealt'); mio.unobserve(e.target); } }), { threshold: .35 });
els.forEach(el => mio.observe(el));
window.__lab = { get cur() { return cur; }, get L() { return L; }, get hover() { return hover; }, get dealt() { return dealtN; }, els, table, lab, flat, S0, STEP, DUR, N }; window.__cardArt = art; window.__CARDS = CARDS; // read by the page-host Marty
// Phones and tablets: the deck becomes a swipeable hand. Cards flip in as they slide into view
// and fan out (tilt, drop, shrink) the further they sit from the centre.
{
  const ui = document.createElement('div'); ui.className = 'deck-ui'; ui.innerHTML = '<span class="deck-n"><b>1</b> / 9</span><span class="deck-h">Swipe the deck <i>→</i></span>';
  table.after(ui); const nEl = ui.querySelector('b');
  let fr = 0;
  const fan = () => { fr = 0; if (!flat()) return; const tr = table.getBoundingClientRect(), mid = tr.left + tr.width / 2; let best = 0, bd = 1e9;
    els.forEach((el, i) => { const r = el.getBoundingClientRect(), o = (r.left + r.width / 2 - mid) / r.width, a = Math.min(1.6, Math.abs(o));
      if (Math.abs(o) < bd) { bd = Math.abs(o); best = i; }
      el.style.setProperty('--fr', `${(o * 7).toFixed(2)}deg`); el.style.setProperty('--fy', `${(a * a * 16).toFixed(1)}px`); el.style.setProperty('--fs', (1 - a * .07).toFixed(3)); });
    nEl.textContent = best + 1; };
  table.addEventListener('scroll', () => { if (!fr) fr = requestAnimationFrame(fan); }, { passive: true });
  addEventListener('resize', () => { if (!fr) fr = requestAnimationFrame(fan); });
  fan();
  // once a card has flipped in, it follows the swipe directly (no transition lag)
  els.forEach(el => el.querySelector('.pc-in').addEventListener('transitionend', () => { if (el.classList.contains('dealt')) el.classList.add('live'); }));
  // tap a side card to bring it to the middle
  els.forEach(el => el.addEventListener('click', () => { if (flat()) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }));
}
}

/* =========================================================
   SECTION 4 · Work: five case studies + in-place case pages
   ========================================================= */
{
const labPin = document.querySelector('.lab-pin');
const SAMPLE = true; // flip to false once real client cases replace these
const BOOK_URL = '#'; // ← paste your booking link (Calendly, Cal.com…) here and every "Book a free call" uses it
const REEL_SRC = ''; // ← optional: a showreel video URL (mp4). Empty = the built-in reel of case mock-ups
const applyBook = (root = document) => root.querySelectorAll('[data-book]').forEach(a => { a.href = BOOK_URL; if (BOOK_URL !== '#') { a.target = '_blank'; a.rel = 'noopener'; } else a.addEventListener('click', e => e.preventDefault()); });
const CASES = [
  { k: 'ledgerline', name: 'Ledgerline', sector: 'Fintech AI · Series A', engine: 'People-Led Content', year: 2026, pc: '#ff4500', tags: ['Founder videos', 'Team skits', 'LinkedIn + X'],
    res: 'The founder and two teammates now post every week. The company page stopped doing the heavy lifting.',
    sum: 'A finance AI with a brilliant product and a founder nobody outside the building had heard of. We turned three of their people into the most recognisable voices in their category.',
    stats: [['4.2', 'M', 'impressions across the team in the first 90 days'], ['31', '', 'inbound demo requests that mentioned a post'], ['6', ' hrs', 'founder time a month, all in'],],
    brief: ["Ledgerline sold to CFOs, a crowd that ignores ads and trusts people. Their LinkedIn page had 4,000 followers and the reach of a whisper.", 'The ask: make the founder visible without turning him into a full-time creator.'],
    did: ['One shoot week on site: founder videos, two recurring skits and a B-roll library.', 'Voice capture and an AI clone for weeks the founder was travelling.', 'Five posts a week per person on LinkedIn and X, approved in one 30-minute session.', 'A monthly one-page report: buyer reach, engaged accounts, next month.'] },
  { k: 'kiln', name: 'Kiln', sector: 'Developer tools · Seed', engine: 'Podcast Engine', year: 2026, pc: '#3b2335', tags: ['Video podcast', 'Guest booking', 'Clips'],
    res: 'A podcast whose guest list was their target-account list. Every episode was a warm sales conversation.',
    sum: 'Kiln needed meetings with heads of platform at companies that never answer cold email. So we gave those people a microphone instead.',
    stats: [['16', '', 'target-account guests recorded in four months'], ['5', '', 'guests who became pipeline'], ['~5', ' hrs', 'founder time a month']],
    brief: ['Seed-stage, two founders, and a buyer persona that guards their inbox like a vault.', 'The ask: a reason for senior engineers to spend an hour with the founder that did not feel like a pitch.'],
    did: ['Show concept, name, cover art and trailer in three weeks.', 'Guests booked straight from the target list, each with a prep pack.', 'Four episodes a month, cut into about 22 clips.', 'A highlight clip for every guest, plus a follow-up script for the founder.'] },
  { k: 'northstack', name: 'Northstack', sector: 'Data infrastructure · Series B', engine: 'Revenue Engine', year: 2025, pc: '#c9d6b8', tags: ['Video outbound', 'AI research', 'Booked meetings'],
    res: 'Outbound with a face. Short personal videos did what forty templated emails could not.',
    sum: 'Northstack had an SDR team, a sequence tool and a reply rate to match. We rebuilt outbound around who to talk to and a 40-second video from the founder.',
    stats: [['11', '', 'held, qualified meetings in month three'], ['$400', '', 'per closed customer, paid only when they sign'], ['24', 'h', 'reply rule the client kept']],
    brief: ['Plenty of activity, very little that turned into a calendar invite.', 'The ask: fewer, better meetings, with someone accountable for every one.'],
    did: ['A written definition of "qualified" before a single email went out.', '500 ideal accounts a quarter, enriched and scored.', 'Video-led sequences recorded in one weekly batch.', 'Warm signals from content and ads jumped the queue.'] },
  { k: 'parcel', name: 'Parcel AI', sector: 'Logistics AI · Series A', engine: 'Paid Video Engine', year: 2025, pc: '#3245ff', tags: ['Video ads', 'Thought Leader Ads', 'Retargeting'],
    res: 'Their best organic videos became ads. The worst ads quietly stopped getting money.',
    sum: 'Parcel was spending on polished brand ads nobody finished watching. We cut their best organic moments into ads and let the numbers pick the winners.',
    stats: [['−38', '%', 'cost per demo against their baseline by day 60'], ['10', '', 'new video ads tested every month'], ['3', '', 'winning hooks scaled into always-on']],
    brief: ['A healthy ad budget and a cost per demo heading the wrong way.', 'The ask: beat the baseline, or stop paying for management until we did.'],
    did: ['Ten new video ads a month, cut from founder clips and customer proof.', 'Thought Leader Ads boosting the team’s best posts to target titles.', 'Retargeting everyone who watched, visited or sat on the target list.', 'Weekly read-outs; losers paused the same day.'] },
  { k: 'overcast', name: 'Overcast Labs', sector: 'Climate SaaS · Series B', engine: 'The Full 360', year: 2026, pc: '#e9e2d3', tags: ['All four engines', 'One report'],
    res: 'Content, podcast, outbound and paid under one roof, with one person to call when something matters.',
    sum: 'Overcast had four vendors, four reports and nobody joining the dots. We replaced the lot with one partner and one monthly page.',
    stats: [['4', '', 'engines running from one plan'], ['1', '', 'person accountable for all of it'], ['70', '%', 'below their build-it-yourself cost']],
    brief: ['A Series B marketing stack held together by status calls.', 'The ask: the output of a full department, without hiring one.'],
    did: ['People-led content for the founder and the head of sales.', 'A podcast whose guests were the top 40 target accounts.', 'Outbound that followed up on everyone who engaged.', 'Paid video pouring budget on whatever was already working.'] },
];

const mock = (k, v = 'a') => {
  if (k === 'ledgerline') {
    const ph = (c, cap, who) => `<div class="ph" style="--sc:${c}"><i><span class="face"></span><span class="ui"><b></b><b></b><b></b></span><span class="cap">${cap}</span><span class="who">${who}</span></i></div>`;
    if (v === 'b') return `<div class="mk mk-content">${ph('linear-gradient(170deg,#3a2a20,#0e0b09)', 'Why our CFO <em>said no</em> to our biggest customer', 'Founder · Ledgerline')}</div>`;
    return `<div class="mk mk-content">${ph('linear-gradient(170deg,#2b3a44,#0b1114)', 'Sales rep vs. <em>the objection</em>', 'Sales lead')}${ph('linear-gradient(170deg,#3a2a20,#0e0b09)', 'We almost <em>ran out of runway.</em> Here’s what changed.', 'Founder · Ledgerline')}${ph('linear-gradient(170deg,#24302a,#0a0f0c)', 'How it’s <em>built</em> vs. how it’s sold', 'Engineering')}</div>`;
  }
  if (k === 'kiln') {
    const wv = Array.from({ length: 46 }, (_, i) => `<i class="${i < 19 ? 'p' : ''}" style="--h:${(22 + Math.abs(Math.sin(i * .6) * 60 + Math.sin(i * 1.9) * 18)).toFixed(0)}%"></i>`).join('');
    const cover = `<div class="pod-cover" style="position:relative"><small>Episode 07 · The platform layer</small><b>Shipping<br>in<br>public</b><small>A Kiln podcast</small></div>`;
    if (v === 'b') return `<div class="mk"><div class="pod" style="width:52%">${cover}</div></div>`;
    return `<div class="mk"><div class="pod" style="grid-template-columns:1fr 1fr;align-items:end;width:82%">${cover}<div class="pod-play"><div class="row"><span>Now playing</span><span>23:14 / 51:02</span></div><div class="wv">${wv}</div><div class="row"><span>Head of Platform, guest</span><span>Ep 07</span></div></div></div></div>`;
  }
  if (k === 'northstack') {
    const days = [['Mon', [['VP Data · intro', 0]]], ['Tue', [['Head of Platform', 1], ['CTO · demo', 0]]], ['Wed', [['Dir. Analytics', 0]]], ['Thu', [['VP Eng · demo', 0], ['CDO · intro', 1]]], ['Fri', [['Head of Data', 0]]]];
    const mail = `<div class="mail"${v === 'b' ? ' style="position:static;width:48%"' : ''}><b>Re: the 40-second video</b>Saw the clip about your migration, that is exactly our mess. Tuesday works.<div class="vid"></div><b>Reply received · 2 min ago</b></div>`;
    if (v === 'b') return `<div class="mk">${mail}</div>`;
    return `<div class="mk"><div class="cal2" style="width:74%;margin:0 14% 6% 0"><div class="hd">Week 11 <span>7 held meetings</span></div><div class="g">${days.map(([d, ev]) => `<div class="d"><small>${d}</small>${ev.map(([t, b]) => `<div class="ev${b ? ' b' : ''}">${t}</div>`).join('')}</div>`).join('')}</div></div>${mail}</div>`;
  }
  if (k === 'parcel') {
    const chart = `<div class="chartc"${v === 'b' ? ' style="position:static;width:56%"' : ''}>Cost per demo<svg viewBox="0 0 100 46"><path d="M2 8 L18 12 L32 9 L46 20 L60 25 L74 31 L88 36 L98 40" fill="none" stroke="#3245ff" stroke-width="2.4" stroke-linecap="round"/><path d="M2 8 H98" stroke="#0f1338" stroke-opacity=".3" stroke-dasharray="2 2"/></svg></div>`;
    if (v === 'b') return `<div class="mk">${chart}</div>`;
    return `<div class="mk mk-paid"><div class="adc"><div class="top"><span><b>Parcel AI</b>Promoted</span></div><div class="vid"><span>Your warehouse already knows. Ask it.</span></div><div class="cta"><span>parcel.ai</span><i>Book a demo</i></div></div>${chart}</div>`;
  }
  const bars = [40, 52, 48, 61, 58, 70, 66, 78, 74, 86, 82, 94].map(h => `<i style="--h:${h}%"></i>`).join('');
  if (v === 'b') return `<div class="mk"><div class="dash" style="width:62%;grid-template-columns:1fr"><div class="eng"><span>People-led content</span><span>Podcast</span><span>Revenue</span><span>Paid video</span></div></div></div>`;
  return `<div class="mk"><div class="dash"><div class="k">ICP reach<b>2.8M<em>↑</em></b></div><div class="k">Engaged accounts<b>412<em>↑</em></b></div><div class="k">Held meetings<b>14<em>↑</em></b></div><div class="k">Cost per demo<b>−31%</b></div><div class="dbars">${bars}</div><div class="eng"><span>Content</span><span>Podcast</span><span>Revenue</span><span>Paid</span></div></div></div>`;
};

// render cards
const grid = document.getElementById('wkGrid');
grid.innerHTML = CASES.map(c => `<article class="case" data-case="${c.k}" style="--pc:${c.pc}"><div class="rv-wrap">
  <a class="cm" href="#case-${c.k}" aria-label="Open case study: ${c.name}"><div class="mock">${mock(c.k)}</div><span class="vc-chip" aria-hidden="true">View case ↗</span>${SAMPLE ? '<span class="smp">Sample case</span>' : ''}<span class="tags">${c.tags.map(t => `<span>${t}</span>`).join('')}</span></a>
  <h3>${c.name}</h3><p class="meta"><b>${c.engine}</b> · ${c.sector} · ${c.year}</p><p class="res">${c.res}</p></div></article>`).join('');
if (SAMPLE) document.getElementById('wkNote').textContent = 'Sample cases: names and figures are placeholders until real client work takes their place.';

applyBook(); window.applyBook = applyBook;
// ---- showreel: the reel window grows from a small card to the full screen as you scroll
{
  const reel = document.getElementById('reel'), media = document.getElementById('reelMedia'), mq = document.getElementById('reelMq'), play = document.getElementById('reelPlay'), cap = document.getElementById('reelCap'), slides = document.getElementById('reelSlides');
  if (REEL_SRC) slides.innerHTML = `<video src="${REEL_SRC}" autoplay muted loop playsinline></video>`;
  else {
    const ink = h => { const n = parseInt(h.slice(1), 16), l = .2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255); return l > 150 ? '#182113' : '#fff'; };
    slides.innerHTML = CASES.map(c => `<div class="reel-slide" style="--pc:${c.pc};--rk:${ink(c.pc)}"><p class="reel-name"><b>${c.name}</b><span>${c.engine} · ${c.sector}</span></p><div class="mock">${mock(c.k)}</div></div>`).join('');
    const sl = [...slides.children]; let i = 0; sl[0].classList.add('on');
    setInterval(() => { if (!reelOn) return; sl[i].classList.remove('on'); i = (i + 1) % sl.length; sl[i].classList.add('on'); }, 1900);
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  let reelOn = false, last = '';
  function rf() {
    if (!reelOn) return; requestAnimationFrame(rf);
    const r = reel.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const p = clamp(-r.top / (r.height - H)), e = eio(clamp((p - .04) / .72));
    const w0 = Math.min(W * .32, 480), h0 = Math.min(w0 * .62, H * .4);
    const w = w0 + (W - w0) * e, h = h0 + (H - h0) * e, rad = 18 * (1 - e);
    const key = `${w.toFixed(1)}|${h.toFixed(1)}|${p.toFixed(3)}`; if (key === last) return; last = key;
    media.style.clipPath = `inset(${((H - h) / 2).toFixed(1)}px ${((W - w) / 2).toFixed(1)}px round ${rad.toFixed(1)}px)`;
    mq.style.opacity = (1 - e * 1.1).toFixed(3); mq.style.transform = `scale(${(1 + e * .25).toFixed(3)})`;
    play.style.opacity = clamp(1 - e * 4).toFixed(3); cap.style.opacity = clamp((e - .75) * 4).toFixed(3);
    // once the pin releases, the full-screen reel scrolls up with the page and the Work section rises in behind it
  }
  new IntersectionObserver(es => es.forEach(en => { const was = reelOn; reelOn = en.isIntersecting; if (reelOn && !was) requestAnimationFrame(rf); }), { rootMargin: '50% 0px 50% 0px' }).observe(reel);
}
// heading wipe + reveals
const wkTitle = document.getElementById('wkTitle');
document.fonts.ready.then(() => buildHighlight(wkTitle));
new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { playHighlight(wkTitle); o.disconnect(); } }), { threshold: .6 }).observe(wkTitle);
const cases = [...grid.children];
const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
cases.forEach(c => rio.observe(c));

// dot-matrix cursor trail on this black section too
dotsFor(document.getElementById('wkDots'), document.getElementById('work'));

// parallax drift + page-up cover over the AI Lab
const work = document.getElementById('work');
const SPD = [0, .1, -.05, .14, .04], wide = () => innerWidth > 900;
let wkRun = false, lastC2 = '', wkSY = null;
function wkFrame() {
  if (!wkRun) return; requestAnimationFrame(wkFrame);
  if (scrollY === wkSY) return; wkSY = scrollY;
  const H = innerHeight, on = wide();
  const ys = cases.map((c, i) => { if (!on) return 0; const b = c.getBoundingClientRect(), d = (b.top - (+c._y || 0) + b.height / 2 - H / 2); return (-d * SPD[i] / (1 + SPD[i])).toFixed(1); }); // same resting offset the old per-frame version settled on
  cases.forEach((c, i) => { if (c._y !== ys[i]) { c._y = ys[i]; c.style.transform = `translate3d(0,${ys[i]}px,0)`; } });
}
addEventListener('resize', () => { wkSY = null; });
new IntersectionObserver(es => es.forEach(e => { const was = wkRun; wkRun = e.isIntersecting; if (wkRun && !was) requestAnimationFrame(wkFrame); }), { rootMargin: '100% 0px 100% 0px' }).observe(work);

// "View case" cursor badge
const vc = document.getElementById('vcur'); let vraf = 0, vqx = 0, vqy = 0;
// position via `translate` (applied before `scale`), so the badge grows from its own centre, right on the cursor
const vplace = () => { vraf = 0; vc.style.translate = `${(vqx - vc.offsetWidth / 2).toFixed(1)}px ${(vqy - vc.offsetHeight / 2).toFixed(1)}px`; };
const vmove = (x, y) => { vqx = x; vqy = y; if (!vraf) vraf = requestAnimationFrame(vplace); };
// show: jump to the cursor first, then grow in place, so the cursor itself turns into the button
const vshow = (x, y) => { if (!vc.classList.contains('on')) { vqx = x; vqy = y; if (vraf) { cancelAnimationFrame(vraf); vraf = 0; } vplace(); vc.getBoundingClientRect(); } vc.classList.add('on'); };
const vhide = () => vc.classList.remove('on');
let lpx = -1, lpy = -1, vchk = 0;
addEventListener('pointermove', e => { lpx = e.clientX; lpy = e.clientY; }, { passive: true });
const vcheck = () => { vchk = 0; const el = lpx < 0 ? null : document.elementFromPoint(lpx, lpy); const over = !!(el && el.closest && el.closest('.wk-grid .cm')) && !csKey; if (over) { vshow(lpx, lpy); vmove(lpx, lpy); } else vhide(); };
addEventListener('scroll', () => { if (!vchk) vchk = requestAnimationFrame(vcheck); }, { passive: true });
document.documentElement.addEventListener('pointerleave', vhide);
grid.querySelectorAll('.cm').forEach(m => {
  m.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; vshow(e.clientX, e.clientY); });
  m.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; vshow(e.clientX, e.clientY); vmove(e.clientX, e.clientY); });
  m.addEventListener('pointerleave', vhide);
});


/* =========================================================
   PROCESS · "One idea in. Revenue out."
   An LED dot-matrix. Each station is a shape drawn once offscreen and sampled into points;
   ~2,400 dots spring between them as you scroll. Cursor/finger pushes dots away, a click
   sends a shockwave, and every shape has its own idle life (waveform plays, iris turns,
   broadcast rings pulse, the calendar fills). The section powers on like a CRT.
   Scroll units: Praw 0 → 7.6. The first .6 is the power-on, then 7 stations.
   ========================================================= */
{
  const sec = document.getElementById('process'), pin = document.getElementById('pqPin');
  const stage = document.getElementById('pqStage'), cv = document.getElementById('pqCanvas'), g = cv.getContext('2d');
  const say = document.getElementById('pqSay'), big = document.getElementById('pqBig'), fill = document.getElementById('pqFill');
  const steps = [...document.querySelectorAll('.pq-step')], railBtns = [...document.querySelectorAll('.pq-rail button')];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = t => t * t * (3 - 2 * t);
  const touch = matchMedia('(hover: none)').matches, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (touch) document.getElementById('pqHint').innerHTML = '<b>●</b> Swipe through it · tap to shake it';

  // ---------- shapes, drawn in a 600×520 box: white = cream dots, orange = accent dots ----------
  const BW = 600, BH = 520, CREAM = '#fff', ORANGE = '#ff4500';
  const off = document.createElement('canvas'); off.width = BW; off.height = BH; const o = off.getContext('2d');
  const font = w => `${w} 1px "Space Grotesk", sans-serif`;
  const SPECIAL = '#00ff00'; // drawn cream, but tagged so its dots can move on their own (the radar sweep)
  const rr = (x, y, w, h, r) => { o.beginPath(); o.roundRect(x, y, w, h, r); };
  const DRAW = [
    // 01 deposition: the founder interview, first chunk "played" in orange, with a playhead
    () => { const n = 44, w = 7, gap = 5.2, x0 = (BW - n * (w + gap)) / 2;
      for (let i = 0; i < n; i++) { const h = 30 + Math.abs(Math.sin(i * .55) * 150 + Math.sin(i * 1.7) * 60 + Math.sin(i * .21) * 40);
        o.fillStyle = i < 17 ? ORANGE : CREAM; o.fillRect(x0 + i * (w + gap), BH / 2 - h / 2, w, h); }
      o.fillStyle = CREAM; o.fillRect(x0 + 17 * (w + gap) - 4, BH / 2 - 150, 3, 300); },
    // 02 production: the camera iris
    () => { const cx = BW / 2, cy = BH / 2, R = 220, r = 78; o.lineWidth = 12; o.strokeStyle = CREAM; o.beginPath(); o.arc(cx, cy, R, 0, 7); o.stroke(); o.lineWidth = 9;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, ax = cx + Math.cos(a) * r, ay = cy + Math.sin(a) * r, b = a + Math.PI / 2 - .25;
        o.beginPath(); o.moveTo(ax, ay); o.lineTo(ax + Math.cos(b) * 205, ay + Math.sin(b) * 205); o.stroke(); }
      o.fillStyle = ORANGE; o.beginPath(); o.arc(cx + 150, cy - 150, 14, 0, 7); o.fill(); },
    // 03 podcast: a studio mic, orange grille, sound coming off it
    () => { o.strokeStyle = CREAM; o.lineWidth = 9; rr(240, 50, 120, 210, 60); o.stroke();
      o.fillStyle = ORANGE; for (let y = 82; y < 236; y += 17) o.fillRect(262, y, 76, 6);
      o.lineWidth = 9; o.beginPath(); o.arc(300, 205, 98, 0, Math.PI); o.stroke();
      o.fillStyle = CREAM; o.fillRect(296, 303, 8, 120); o.fillRect(225, 421, 150, 9);
      o.lineWidth = 6; o.globalAlpha = .7; [150, 196].forEach(r => { o.beginPath(); o.arc(300, 155, r, -.55, .55); o.stroke(); o.beginPath(); o.arc(300, 155, r, Math.PI - .55, Math.PI + .55); o.stroke(); }); o.globalAlpha = 1; },
    // 04 rollout: three feeds (you, sales lead, engineer), always scrolling
    () => { [-1, 0, 1].forEach(k => { const cx = BW / 2 + k * 178; o.strokeStyle = CREAM; o.lineWidth = 7; rr(cx - 64, 40, 128, 440, 24); o.stroke();
      o.fillStyle = ORANGE; o.beginPath(); o.arc(cx - 34, 84, 13, 0, 7); o.fill(); o.fillStyle = CREAM; o.fillRect(cx - 14, 79, 52, 9);
      o.globalAlpha = .8; for (let j = 0; j < 6; j++) { o.fillRect(cx - 46, 122 + j * 56, 92, 34); } o.globalAlpha = 1; }); },
    // 05 outbound: radar. 500 accounts, a sweep, the warm ones light up
    () => { const cx = BW / 2, cy = BH / 2; o.strokeStyle = CREAM; o.lineWidth = 5; o.globalAlpha = .85; [75, 150, 225].forEach(r => { o.beginPath(); o.arc(cx, cy, r, 0, 7); o.stroke(); });
      o.lineWidth = 2; o.beginPath(); o.moveTo(cx - 230, cy); o.lineTo(cx + 230, cy); o.moveTo(cx, cy - 230); o.lineTo(cx, cy + 230); o.stroke(); o.globalAlpha = 1;
      for (let i = 0; i < 46; i++) { const a = i * 2.39996, r = 40 + ((i * 53) % 180); o.fillStyle = i % 6 === 2 ? ORANGE : CREAM; o.beginPath(); o.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 6 === 2 ? 8 : 5.5, 0, 7); o.fill(); }
      o.strokeStyle = SPECIAL; o.lineWidth = 7; o.beginPath(); o.moveTo(cx, cy); o.lineTo(cx + 222, cy); o.stroke(); },
    // 06 paid: cost per demo dropping under the baseline, the latest months in orange
    () => { const H0 = [300, 278, 252, 220, 192, 160, 128, 100], bx = 92, bw = 36, gap = 20, base = 440;
      H0.forEach((h, i) => { o.fillStyle = i > 5 ? ORANGE : CREAM; o.globalAlpha = i > 5 ? 1 : .85; o.fillRect(bx + i * (bw + gap), base - h, bw, h); });
      o.globalAlpha = .6; o.fillStyle = CREAM; for (let x = 70; x < 540; x += 22) o.fillRect(x, base - 304, 12, 4); o.globalAlpha = 1; o.fillRect(70, base + 8, 470, 4); },
    // 07 close: the calendar. Meetings drop in one by one until the week is full
    () => { const x0 = 75, y0 = 70, cw = 90, ch = 92; for (let c = 0; c < 5; c++) for (let r = 0; r < 4; r++) { const x = x0 + c * cw, y = y0 + r * ch;
        o.globalAlpha = .45; o.strokeStyle = CREAM; o.lineWidth = 3; rr(x + 5, y + 5, cw - 10, ch - 10, 10); o.stroke();
        o.globalAlpha = 1; o.fillStyle = ORANGE; rr(x + 15, y + 15, cw - 30, ch - 30, 6); o.fill(); }
      o.fillStyle = CREAM; for (let c = 0; c < 5; c++) o.fillRect(x0 + c * cw + 28, 46, 34, 6); },
  ];
  const sample = draw => { o.clearRect(0, 0, BW, BH); o.globalAlpha = 1; draw();
    const d = o.getImageData(0, 0, BW, BH).data; let step = 6, pts;
    do { pts = []; for (let y = 0; y < BH; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < BW; x += step) { const i = (Math.floor(y) * BW + Math.floor(x)) * 4; if (d[i + 3] > 100) pts.push([x - BW / 2, y - BH / 2, d[i] < 128 ? 2 : d[i + 1] < 160 ? 1 : 0, d[i + 3] / 255]); }
      step += .5; } while (pts.length > 3200);
    pts.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])); return pts; };
  let SH = [], N = 3200, D = [];
  const build = () => { SH = DRAW.map(sample);
    const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
    // every dot has a home in every shape; spare dots become faint drifting dust
    D = Array.from({ length: N }, (_, i) => ({ x: (rnd(i, 1) - .5) * BW, y: 0, vx: 0, vy: 0, k: .045 + rnd(i, 2) * .05, d: rnd(i, 3), j: rnd(i, 4) }));
    SH.forEach((pts, s) => { D.forEach((p, i) => { p['t' + s] = i < pts.length ? pts[i] : [(rnd(i, s + 5) - .5) * BW * 1.3, (rnd(i, s + 9) - .5) * BH * 1.2, 0, -1]; }); });
  };

  // ---------- canvas sizing ----------
  let W = 0, H = 0, S = 1, dpr = 1, grid = null;
  const size = () => { const r = stage.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = Math.min(W / (BW + 40), H / (BH + 40));
    // the dim LED panel behind everything
    grid = document.createElement('canvas'); grid.width = cv.width; grid.height = cv.height; const q = grid.getContext('2d'); q.scale(dpr, dpr); q.fillStyle = 'rgba(236,220,190,.07)';
    const st = 6 * S; for (let y = (H / 2) % st; y < H; y += st) for (let x = (W / 2) % st; x < W; x += st) q.fillRect(x - .6, y - .6, 1.2, 1.2); };

  // ---------- input ----------
  let mx = 1e5, my = 1e5, tnx = 0, tny = 0, nx = 0, ny = 0;
  const pt = (cx, cy) => { const r = stage.getBoundingClientRect(); mx = (cx - r.left - W / 2) / S; my = (cy - r.top - H / 2) / S; tnx = clamp((cx - r.left) / r.width * 2 - 1, -1, 1); tny = clamp((cy - r.top) / r.height * 2 - 1, -1, 1); };
  stage.addEventListener('pointermove', e => pt(e.clientX, e.clientY), { passive: true });
  stage.addEventListener('pointerdown', e => pt(e.clientX, e.clientY), { passive: true });
  stage.addEventListener('pointerleave', () => { mx = my = 1e5; tnx = tny = 0; });
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { mx = my = 1e5; tnx = tny = 0; } }, { passive: true });
  const QUIPS = [["Story #7 is off the record.", "That pause? Gold. We're keeping it."], ['Take 12. Marty, stop laughing.', 'Hook v7. v1–v6 are in witness protection.'],
    ["Guest #4 is on your target list. Coincidence? No.", "Episode 7. Still not a 'quick sync'."], ['Your company page is jealous.', '+1 like. From your mum. Still counts.'],
    ['Warm lead spotted. Jumping the queue.', "Never from your main domain. We're not animals."], ['Cost per demo, going down.', 'Losers get paused the same day. No sentiment.'], ['Moved to Thursday. Classic.', 'Told you.']];
  const FILL = [3, 11, 7, 16, 0, 9, 18, 5, 13, 1, 15, 8, 19, 4, 12, 2, 17, 6, 10, 14];
  let quipN = 0, sayT = 0, shock = null;
  stage.addEventListener('click', e => { const r = stage.getBoundingClientRect(); pt(e.clientX, e.clientY); shock = { x: mx, y: my, t: 0 };
    const q = QUIPS[lastStep < 0 ? 0 : lastStep]; say.textContent = q[quipN++ % q.length]; say.style.left = `${e.clientX - r.left}px`; say.style.top = `${e.clientY - r.top}px`;
    say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(() => say.classList.remove('on'), 2400); });

  // ---------- loop ----------
  let run = false, Pc = 0, lastStep = -1, T = 0, last = performance.now(), wasIdea = false;
  const rawP = () => { const r = sec.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight * 2.2)) * 7.6; }; // the last screen is held for 1.2 screens while Results opens over it
  function frame(now) {
    if (!run) return; requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    const Pt = rawP(); Pc += (Pt - Pc) * .16; if (Math.abs(Pt - Pc) < .0005) Pc = Pt;
    // the sheet (this section's top edge) has covered the screen: words and dots fade up
    
    const P = Math.max(0, Pc - .6), s = Math.min(6, Math.floor(P + .12)), sf = Math.min(6, Math.floor(P)), tr = sm(clamp((P - sf - .62) / .38)); // transition into the next shape late in each station
    if (s !== lastStep) {
      steps.forEach((el, i) => { el.classList.toggle('on', i === s); el.classList.toggle('gone', i < s); });
      railBtns.forEach((b, i) => { b.classList.toggle('on', i === s); b.classList.toggle('done', i < s); b.setAttribute('aria-selected', i === s); });
      big.textContent = String(s + 1).padStart(2, '0'); lastStep = s;
    }
    fill.style.setProperty('--p', (P / 7).toFixed(4));
    nx += (tnx - nx) * .06; ny += (tny - ny) * .06; big.style.setProperty('--bx', `${(-nx * 30).toFixed(1)}px`); big.style.setProperty('--by', `${(-ny * 20).toFixed(1)}px`);
    if (shock) { shock.t += dt; if (shock.t > 1.2) shock = null; }
    // draw
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(grid, 0, 0);
    g.setTransform(dpr * S, 0, 0, dpr * S, dpr * W / 2, dpr * H / 2);
    const pinned = sec.getBoundingClientRect().top <= 1, idea = pinned && Pc < .5, pre = !pinned, a0 = 'rgba(236,220,190,', a1 = 'rgba(255,92,30,';
    if (wasIdea && !idea && pinned && !reduce) shock = { x: 0, y: 0, t: 0 }; wasIdea = idea; // the idea bursts into the first station
    const tilt = nx * .18, sz = 2.7, nxt = Math.min(6, sf + 1);
    for (let i = 0; i < N; i++) {
      const p = D[i]; let A = p['t' + sf], B = p['t' + nxt], tx, ty, acc, al;
      if (pre) { tx = (p.d - .5) * BW * 1.6; ty = (p.j - .5) * BH * 1.4; acc = 0; al = .25; }
      else if (idea) { const a = p.d * 6.2832 + T * (1 + p.j), rr = Math.sqrt(p.j) * 11 / S * (1 + .12 * Math.sin(T * 4)); tx = Math.cos(a) * rr; ty = Math.sin(a) * rr; acc = 1; al = .9; } // one idea, held in the middle
      else {
        const k = sm(clamp((tr - p.d * .35) / .65)); // each dot leaves on its own beat
        tx = A[0] + (B[0] - A[0]) * k; ty = A[1] + (B[1] - A[1]) * k; acc = k < .5 ? A[2] : B[2]; al = (k < .5 ? A[3] : B[3]);
        // arc between shapes, so they swirl rather than slide
        const arc = Math.sin(Math.PI * k) * (40 + p.j * 90); tx += -ty * arc / 260; ty += tx * arc / 900;
        // idle life per shape
        const st = k < .5 ? sf : nxt, live = reduce ? 0 : 1;
        if (al > 0 && live) {
          if (st === 0) { const c = Math.abs(Math.sin(T * 3.2 + tx * .045)); ty *= .62 + .38 * c; }
          else if (st === 1) { const r = Math.hypot(tx, ty); if (r < 200) { const a = Math.atan2(ty, tx) + T * .22; tx = Math.cos(a) * r; ty = Math.sin(a) * r; } }
          else if (st === 2) { if (!acc) { const r = Math.hypot(tx, ty + 105); if (r > 120 && Math.abs(tx) > 80) al *= .3 + .7 * Math.max(0, Math.sin(r * .06 - T * 5)); } }
          else if (st === 3) { const k3 = Math.round(tx / 178), cx = k3 * 178; if (Math.abs(tx - cx) < 50 && ty > -142 && ty < 186) { ty = -142 + (((ty + 142 - T * 34) % 328) + 328) % 328; if (ty > 176 || ty < -136) al *= .2; } }
          else if (st === 4) { const sw = T * 1.3; if (acc === 2) { const r = Math.hypot(tx, ty); tx = Math.cos(sw) * r; ty = Math.sin(sw) * r; acc = 0; al = .95; }
            else { let dA = (sw - Math.atan2(ty, tx)) % 6.2832; if (dA < 0) dA += 6.2832; const lit = Math.exp(-dA * 1.6); al *= acc ? .4 + .6 * lit : .5 + .5 * lit; } }
          else if (st === 5) { if (ty > -120) { const b = 180, k5 = .9 + .1 * Math.sin(T * 2 + tx * .03); ty = b - (b - ty) * k5; } }
          else if (st === 6) { if (acc === 1) { const c6 = Math.floor((tx + 225) / 90), r6 = Math.floor((ty + 190) / 92), idx = FILL[(r6 * 5 + c6 + 20) % 20], ph = (T % 9) / 9, n6 = Math.floor(clamp(ph / .7) * 20);
              if (idx >= n6) al = .06; else if (ph > .72 && ph < .8) al = 1; } }
        }
        if (al < 0) { tx += Math.sin(T * .3 + p.j * 9) * 12; ty += Math.cos(T * .25 + p.d * 9) * 12; al = .1; } // dust
      }
      tx += ty * tilt * .05; // the panel leans a touch toward the cursor
      // physics: spring home, dodge the cursor, ride the shockwave
      let fx = (tx - p.x) * p.k * 2.2, fy = (ty - p.y) * p.k * 2.2;
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 9000 && d2 > .01) { const d = Math.sqrt(d2), f = (1 - d / 95) * 9; fx += dx / d * f; fy += dy / d * f; }
      if (shock) { const sx = p.x - shock.x, sy = p.y - shock.y, d = Math.hypot(sx, sy) + .01, ring = Math.abs(d - shock.t * 520); if (ring < 50) { const f = (1 - ring / 50) * 26 * (1 - shock.t / 1.2); fx += sx / d * f; fy += sy / d * f; } }
      p.vx = (p.vx + fx) * .74; p.vy = (p.vy + fy) * .74; p.x += p.vx; p.y += p.vy;
      const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 14);
      g.fillStyle = (acc ? a1 : a0) + (al * (.75 + sp * .25)).toFixed(2) + ')';
      const z = sz + sp * 1.4; g.fillRect(p.x - z / 2, p.y - z / 2, z, z);
    }
  }
  const start = () => { if (!SH.length) build(); size(); last = performance.now(); requestAnimationFrame(frame); };
  document.fonts.ready.then(() => { SH = []; if (run) { build(); size(); } });
  addEventListener('resize', () => { if (SH.length) size(); });
  new IntersectionObserver(es => es.forEach(e => { const was = run; run = e.isIntersecting; if (run && !was) start(); }), { rootMargin: '15% 0px 15% 0px' }).observe(sec);

  // ---------- work → process: the idea ----------
  // An orange dot leaves the "Book a free call" button at the end of Work, arcs across while Process rises,
  // and lands in the middle of the dot panel, where it becomes the dot cluster that bursts into station 01.
  if (!reduce) {
    const dot = document.createElement('i'); dot.className = 'idea'; dot.setAttribute('aria-hidden', 'true'); document.body.appendChild(dot);
    const btn = document.querySelector('.work > .wk-cta .btn'), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    let on = false, lastK = '';
    const tick = () => { if (!on) return; requestAnimationFrame(tick);
      const r = sec.getBoundingClientRect(), Hh = innerHeight, e = clamp((Hh * .9 - r.top) / (Hh * .9));
      const after = clamp(-r.top / (Hh * .22)), op = (r.top > Hh * .9 ? 0 : clamp(e / .08)) * (1 - after);
      if (op <= 0) { if (lastK !== 'off') { lastK = 'off'; dot.style.opacity = 0; } return; }
      const a = btn.getBoundingClientRect(), b = stage.getBoundingClientRect(), k = eio(e);
      const ax = a.left + a.width / 2, ay = a.top + a.height / 2, bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(Math.PI * k) * Hh * .22, sc = 1 + Math.sin(Math.PI * k) * .9;
      const key = `${x | 0}|${y | 0}|${sc.toFixed(2)}|${op.toFixed(2)}`; if (key === lastK) return; lastK = key;
      dot.style.opacity = op.toFixed(3); dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`; };
    new IntersectionObserver(es => es.forEach(en => { const was = on; on = en.isIntersecting; if (on && !was) requestAnimationFrame(tick); if (!on) dot.style.opacity = 0; }), { rootMargin: '100% 0px 0px 0px' }).observe(sec);
  }

  // rail + arrow keys
  const go = i => { const top = sec.getBoundingClientRect().top + scrollY; const y = top + ((i + .6 + .55) / 7.6) * (sec.offsetHeight - innerHeight * 2); window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: 'smooth' }); };
  railBtns.forEach((b, i) => b.addEventListener('click', () => go(i)));
  addEventListener('keydown', e => { if (!run || e.target.closest?.('input, textarea')) return; const r = sec.getBoundingClientRect(); if (r.top > 1 || r.bottom < innerHeight - 1) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.min(6, lastStep + 1)); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.max(0, lastStep - 1)); } });

  // heading wipe, like the other sections
  const h = document.getElementById('pqTitle');
  document.fonts.ready.then(() => buildHighlight(h));
  new IntersectionObserver((es, ob) => es.forEach(e => { if (e.isIntersecting) { playHighlight(h); ob.disconnect(); } }), { threshold: .6 }).observe(h);
  let hw = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - hw) < 40) return; hw = innerWidth; const played = !!h.querySelector('.t') && getComputedStyle(h.querySelector('.t')).visibility === 'visible'; buildHighlight(h); if (played) { h.querySelectorAll('.t').forEach(t => t.style.visibility = 'visible'); h.querySelectorAll('.hl-bar').forEach(b => b.style.display = 'none'); } });
}

// case page
const cs = document.getElementById('cs'), csBody = document.getElementById('csBody');
let csKey = null, csTimer = 0;
function renderCase(k) {
  const i = CASES.findIndex(c => c.k === k), c = CASES[i], n = CASES[(i + 1) % CASES.length];
  cs.style.setProperty('--pc', c.pc); document.getElementById('csCrumb').textContent = `Case ${i + 1} of ${CASES.length}`;
  csBody.innerHTML = `<div class="cs-head"><h2 id="csTitle">${c.name}</h2><div><p>${c.sum}</p><div class="cs-tags">${c.tags.map(t => `<span>${t}</span>`).join('')}</div><div class="cs-meta">${c.engine} · ${c.sector} · ${c.year}</div></div></div>
    <div class="cs-hero" style="--pc:${c.pc}"><div class="mock">${mock(c.k)}</div></div>
    <div class="cs-stats">${c.stats.map(([b, u, s]) => `<div><b>${b}<em>${u}</em></b><span>${s}</span></div>`).join('')}</div>
    ${SAMPLE ? '<p class="cs-note">Sample case: the company and the figures are placeholders until real client work replaces them.</p>' : ''}
    <div class="cs-sec"><h4>The brief</h4><div>${c.brief.map(p => `<p>${p}</p>`).join('')}</div></div>
    <div class="cs-sec"><h4>What we ran</h4><div class="cs-steps">${c.did.map((d, j) => `<div><b>0${j + 1}</b><span>${d}</span></div>`).join('')}</div></div>
    <div class="cs-gal"><div style="--pc:${c.pc}"><div class="mock">${mock(c.k, 'b')}</div></div><div style="--pc:${c.pc}"><div class="mock">${mock(c.k)}</div></div></div>
    <div class="wk-cta cs-cta"><h3>Want this for your company?</h3><div><p>Thirty minutes, no pitch deck. Just your situation and what I would do about it.</p><a class="btn primary" data-book href="#"><span class="label">Book a free call →</span></a></div></div>
    <button class="cs-next" data-next="${n.k}" style="--pc:${n.pc}"><div class="mock">${mock(n.k)}</div><div class="nx"><small>Next case</small><h3>${n.name} <i>→</i></h3><div class="cs-tags" style="margin-top:18px">${n.tags.map(t => `<span>${t}</span>`).join('')}</div></div></button>`;
  applyBook(csBody);
  csBody.querySelector('[data-next]').onclick = () => { cs.scrollTo({ top: 0 }); renderCase(n.k); history.replaceState(null, '', '#case-' + n.k); csKey = n.k; cs.classList.remove('open'); cs.style.transition = 'none'; cs.style.clipPath = 'none'; cs.offsetWidth; requestAnimationFrame(() => { cs.classList.add('open'); cs.style.transition = ''; cs.style.clipPath = ''; }); };
}
function clipFrom(el) { const r = el.getBoundingClientRect(); cs.style.setProperty('--t', r.top + 'px'); cs.style.setProperty('--l', r.left + 'px'); cs.style.setProperty('--r', (innerWidth - r.right) + 'px'); cs.style.setProperty('--b', (innerHeight - r.bottom) + 'px'); }
function openCase(k, push = true) {
  if (!CASES.some(c => c.k === k)) return; renderCase(k); csKey = k;
  const m = grid.querySelector(`[data-case="${k}"] .cm`);
  cs.classList.remove('open', 'closing'); cs.style.transition = 'none'; clipFrom(m); cs.scrollTop = 0; cs.offsetWidth; cs.style.transition = '';
  requestAnimationFrame(() => requestAnimationFrame(() => { if (csKey === k) cs.classList.add('open'); }));
  document.documentElement.style.overflow = 'hidden'; vc.classList.remove('on');
  if (push) history.pushState({ case: k }, '', '#case-' + k);
}
function closeCase(pop = false) {
  if (!csKey) return; const m = grid.querySelector(`[data-case="${csKey}"] .cm`); m.scrollIntoView({ block: 'center', behavior: 'instant' }); clipFrom(m);
  cs.classList.add('closing'); cs.classList.remove('open'); csKey = null;
  setTimeout(() => { if (!csKey) { cs.classList.remove('closing'); document.documentElement.style.overflow = ''; } }, 850);
  if (!pop && location.hash.startsWith('#case-')) history.back();
}
grid.querySelectorAll('.cm').forEach(m => m.addEventListener('click', e => { e.preventDefault(); openCase(m.closest('.case').dataset.case); }));
document.getElementById('csBack').onclick = () => closeCase();
addEventListener('keydown', e => { if (e.key === 'Escape' && csKey) closeCase(); });
addEventListener('popstate', () => { const m = location.hash.match(/^#case-([\w-]+)/); if (m) openCase(m[1], false); else if (csKey) closeCase(true); });
{ const m = location.hash.match(/^#case-([\w-]+)/); if (m) setTimeout(() => openCase(m[1], false), 400); }
window.__case = k => openCase(k);
}

/* =========================================================
   RESULTS · three numbers that roll like an odometer as you scroll (pinned, fully scrubbed both ways)
   ========================================================= */
{
  const RESULTS = [ // ← placeholders: swap in the real numbers (v = the number, suf = what follows it)
    { v: 340, suf: '+', label: 'Pre-sold calls booked', sub: 'Sales calls where they already knew the founder.', say: '340 calls where they already knew his name. Cheat code.' },
    { v: 8, suf: 'h', label: 'Of your time a month', sub: 'What founders spend on all four engines. Total.', say: 'Eight hours a month. Less than your Slack time.' },
    { v: 92, suf: '%', label: 'Renew after month three', sub: 'Once the engine is running, they stay.', say: '92% stayed. When it pays, they stay.' },
  ];
  const RESULTS_SAMPLE = true; // ← false once the numbers are real
  const START = .06, STEP = .29, LEN = .25; // scroll fraction where each number starts counting, and how long it takes
  const sec = document.getElementById('results'), pin = document.getElementById('resPin'), row = document.getElementById('resRow'), note = document.getElementById('resNote');
  const strip = `<i>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<b>${n}</b>`).join('')}</i>`;
  row.innerHTML = RESULTS.map((r, k) => `<div class="rs-n" data-k="${k}"><small>0${k + 1} / 0${RESULTS.length}</small>
    <div class="rs-num" role="img" aria-label="${r.v}${r.suf}">${String(r.v).split('').map(() => `<span class="rs-dg" aria-hidden="true">${strip}</span>`).join('')}<em aria-hidden="true">${r.suf}</em></div>
    <span class="rs-bar"></span><p><b>${r.label}</b>${r.sub}</p></div>`).join('');
  if (RESULTS_SAMPLE) note.textContent = 'Placeholder figures. The real numbers go here.';
  const big = document.createElement('span'); big.className = 'rs-big'; big.setAttribute('aria-hidden', 'true'); pin.prepend(big);
  const cells = [...row.children], digs = cells.map(c => [...c.querySelectorAll('.rs-dg')]);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), eo = p => 1 - Math.pow(1 - p, 3);
  // odometer: every digit is a strip 0–9–0; the ones roll continuously, higher digits only turn over while the ones pass 9
  const roll = (v, n) => { const out = []; for (let d = n - 1; d >= 0; d--) { const p = 10 ** d, whole = Math.floor(v / p), rem = v / p - whole;
    out.push((whole % 10) + (d === 0 ? rem : Math.max(0, (rem - (1 - 1 / p)) * p))); } return out; };
  let run = false, qc = 0, act = 0, oD = null, lastF = performance.now(), cameFrom = 1; // cameFrom > 0: we arrive from above, so the circle opens from zero
  function frame() {
    if (!run) return; requestAnimationFrame(frame);
    const r = sec.getBoundingClientRect(), H = innerHeight, q = clamp((-r.top - H * .2) / (r.height - H * 1.2));
    // the mist field opens as a circle from the end of the Process timeline (bottom right), then stays open
    { const tn = performance.now(), dt = Math.min(.1, (tn - lastF) / 1000), oT = clamp((H - r.top) / (H * 1.2)); lastF = tn;
      // the circle follows the scroll but never faster than ~0.9s end to end, so a fast flick still shows it opening
      oD = oD === null ? oT : oD + clamp(oT - oD, -dt / .9, dt / .9);
      const o = oD, open = o * o * (3 - 2 * o), cp = o >= 1 ? 'none' : `circle(${(28 + open * Math.hypot(innerWidth, H) * 1.05).toFixed(1)}px at ${(innerWidth * .86).toFixed(0)}px ${(H * .94 - r.top).toFixed(0)}px)`; if (sec._cp !== cp) { sec._cp = cp; sec.style.clipPath = cp; } }
    qc += (q - qc) * .14; if (Math.abs(q - qc) < .0004) qc = q;
    let a = 0;
    RESULTS.forEach((R, i) => {
      const pk = clamp((qc - (START + i * STEP)) / LEN); if (pk > 0) a = i;
      const v = R.v * eo(pk), pos = roll(v, digs[i].length);
      let lead = true;
      digs[i].forEach((d, j) => { const t = `translate3d(0,${(-pos[j]).toFixed(3)}em,0)`; if (d._t !== t) { d._t = t; d.firstChild.style.transform = t; }
        const z = lead && j < digs[i].length - 1 && pos[j] < .5; d.classList.toggle('z', z); if (pos[j] >= .5) lead = false; });
      const c = cells[i]; c.style.setProperty('--p', pk.toFixed(3)); c.style.setProperty('--sf', clamp((pk - .78) / .22).toFixed(3));
      c.classList.toggle('lit', pk > 0); c.classList.toggle('done', pk >= 1);
    });
    if (a !== act || !big.textContent) { act = a; big.textContent = RESULTS[a].v + RESULTS[a].suf.replace('+', ''); }
    const cr = cells[a].getBoundingClientRect(), pr = pin.getBoundingClientRect();
    pin.style.setProperty('--gx', `${((cr.left + cr.width * .35 - pr.left) / pr.width * 100).toFixed(1)}%`);
    pin.style.setProperty('--by', `${((.5 - qc) * 60).toFixed(1)}px`);
  }
  // not an IntersectionObserver: Chrome counts the clip-path, so a section clipped to a zero circle never reports as visible
  const watch = () => { const r = sec.getBoundingClientRect(), H = innerHeight, vis = r.top < H * 1.1 && r.bottom > -H * .1, was = run; run = vis;
    if (run && !was) { lastF = performance.now(); oD = cameFrom > 0 ? 0 : null; requestAnimationFrame(frame); } if (!run && was) cameFrom = r.top; if (!run) cameFrom = r.top; };
  addEventListener('scroll', watch, { passive: true }); addEventListener('resize', watch); watch();
  window.__rs = { cells, R: RESULTS, start: START, step: STEP, len: LEN };
  // headings that wipe in like the rest of the page
  [document.getElementById('resTitle'), document.getElementById('huTitle')].forEach(h => {
    document.fonts.ready.then(() => buildHighlight(h));
    new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { playHighlight(h); o.disconnect(); } }), { threshold: .6 }).observe(h);
    let hw = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - hw) < 40) return; hw = innerWidth; const played = h.querySelector('.t') && getComputedStyle(h.querySelector('.t')).visibility === 'visible';
      buildHighlight(h); if (played) { h.querySelectorAll('.t').forEach(t => t.style.visibility = 'visible'); h.querySelectorAll('.hl-bar').forEach(b => b.style.display = 'none'); } });
  });
}

/* =========================================================
   THE HUMAN · Meet Yohith. A pile of polaroids that lands one by one; click the top one to shuffle,
   drag it to toss it across the room (it comes back to the bottom of the pile).
   ========================================================= */
{
  const stack = document.getElementById('huStack'), pols = [...stack.querySelectorAll('.hu-pol')];
  pols.forEach(p => { const img = p.querySelector('img'); img.src = PHOTOS[img.dataset.ph] || ''; img.draggable = false; });
  const BASE = [{ x: -30, y: 18, r: -9 }, { x: 26, y: 8, r: 7 }, { x: 0, y: 0, r: -2 }]; // bottom → top
  let order = pols.slice(), landed = false;
  const set = (p, x, y, r, s = 1) => { p.style.setProperty('--x', `${x}px`); p.style.setProperty('--y', `${y}px`); p.style.setProperty('--r', `${r}deg`); p.style.setProperty('--s', s); };
  const layout = () => order.forEach((p, i) => { p.style.zIndex = i + 1; const b = BASE[i] || BASE[0]; set(p, b.x, b.y, b.r); });
  const top = () => order[order.length - 1];
  // before they land: off to the side, spinning
  pols.forEach((p, i) => { p.style.transition = 'none'; set(p, 340 + i * 60, -260 + i * 120, 38 - i * 22, 1.1); p.style.opacity = 0; });
  requestAnimationFrame(() => pols.forEach(p => p.style.transition = ''));
  new IntersectionObserver((es, o) => es.forEach(e => { if (!e.isIntersecting) return; o.disconnect(); landed = true;
    order.forEach((p, i) => setTimeout(() => { p.style.opacity = 1; p.style.zIndex = i + 1; const b = BASE[i]; set(p, b.x, b.y, b.r); }, 120 + i * 210)); }), { threshold: .25 }).observe(stack);
  // shuffle: the top photo flicks out and slides under the pile
  let busy = false;
  const shuffle = (dx = 1) => { if (busy || !landed) return; busy = true; const p = top(); set(p, 230 * dx, -70, 26 * dx, 1.03);
    setTimeout(() => { order.unshift(order.pop()); layout(); busy = false; }, 280); };
  // toss: thrown in the direction you flicked it, then it drifts back under the pile
  const toss = (p, x, y, vx, vy) => { busy = true; const k = 520 / Math.max(.4, Math.hypot(vx, vy));
    p.style.transition = 'transform .55s cubic-bezier(.2,.7,.3,1), opacity .4s'; set(p, x + vx * k, y + vy * k, (vx > 0 ? 1 : -1) * 70, .92);
    setTimeout(() => { order.splice(order.indexOf(p), 1); order.unshift(p); p.style.transition = ''; layout(); busy = false; }, 560);
    window.__marty?.say("Careful. That's his good side.", 3200); };
  let drag = null;
  stack.addEventListener('pointerdown', e => { const p = top(); if (!landed || busy || !p.contains(e.target)) return;
    drag = { p, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, moved: false, b: BASE[order.length - 1] };
    p.classList.add('drag'); p.setPointerCapture(e.pointerId); });
  stack.addEventListener('pointermove', e => {
    if (drag) { const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0, t = performance.now(), dt = Math.max(1, t - drag.lt);
      drag.vx = drag.vx * .6 + (e.clientX - drag.lx) / dt * .4; drag.vy = drag.vy * .6 + (e.clientY - drag.ly) / dt * .4; drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = t;
      if (Math.hypot(dx, dy) > 6) drag.moved = true; set(drag.p, drag.b.x + dx, drag.b.y + dy, drag.b.r + dx * .07, 1.05); return; }
    if (e.pointerType !== 'mouse' || !landed) return;
    const p = top(), r = p.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) { p.style.setProperty('--tx', '0deg'); p.style.setProperty('--ty', '0deg'); return; }
    p.style.setProperty('--ty', `${((px - .5) * 16).toFixed(1)}deg`); p.style.setProperty('--tx', `${((.5 - py) * 12).toFixed(1)}deg`);
    p.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`); p.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`); });
  const up = e => { if (!drag) return; const d = drag; drag = null; d.p.classList.remove('drag');
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0, sp = Math.hypot(d.vx, d.vy);
    if (!d.moved) shuffle(Math.random() < .5 ? -1 : 1);
    else if (sp > .55 || Math.hypot(dx, dy) > 150) toss(d.p, d.b.x + dx, d.b.y + dy, d.vx || dx / 300, d.vy || dy / 300);
    else layout(); };
  stack.addEventListener('pointerup', up); stack.addEventListener('pointercancel', up);
  stack.addEventListener('pointerleave', () => { const p = top(); p.style.setProperty('--tx', '0deg'); p.style.setProperty('--ty', '0deg'); });
  stack.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shuffle(); } });
  stack.tabIndex = 0;
  // the pile leans and drifts a little as the section scrolls past
  const hu = document.getElementById('human'); let hr = 0;
  addEventListener('scroll', () => { if (hr) return; hr = requestAnimationFrame(() => { hr = 0; const r = hu.getBoundingClientRect(), H = innerHeight; if (r.bottom < 0 || r.top > H) return;
    const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - H / 2) / H)); stack.style.transform = `translate3d(0, ${(k * 40).toFixed(1)}px, 0) rotate(${(k * -5).toFixed(2)}deg)`; }); }, { passive: true });
}

/* =========================================================
   CONTACT · LET'S TALK? The letters are on springs (grab one and fling it), the ring is Marty's
   front door, and a hand of cards is dealt onto the page for you to throw around.
   ========================================================= */
{
  const MAIL = ''; // ← your email address, e.g. 'hello@yourdomain.com' (every "Say hello", "Email me" and the careers card use it)
  document.querySelectorAll('[data-mail]').forEach(a => {
    if (MAIL) a.href = `mailto:${MAIL}?subject=${encodeURIComponent(a.dataset.mail)}`;
    else a.addEventListener('click', e => { e.preventDefault(); window.__marty?.say('He forgot to add his email. Classic. Book the call instead.', 4200); });
  });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sec = document.getElementById('contact'), topEl = sec.querySelector('.ct-top'), ring = document.getElementById('ctRing'), hov = sec.querySelector('.ct-hover');
  const touch = matchMedia('(hover: none)').matches;
  if (touch) hov.lastChild.textContent = 'Tap me';

  // ---- spring letters ----
  sec.querySelectorAll('.ct-line[data-word]').forEach(l => { l.innerHTML = [...l.dataset.word].map(ch => `<span class="ct-ch">${ch === ' ' ? '&nbsp;' : ch}</span>`).join(''); l.setAttribute('aria-hidden', 'true'); });
  const chars = [...sec.querySelectorAll('.ct-ch')].map(el => ({ el, x: 0, y: 0, vx: 0, vy: 0, drag: null }));
  let raf = 0, flung = false;
  const put = c => { c.el.style.setProperty('--lx', `${c.x.toFixed(1)}px`); c.el.style.setProperty('--ly', `${c.y.toFixed(1)}px`); c.el.style.setProperty('--lr', `${(c.x * .09).toFixed(2)}deg`); };
  const tick = () => { raf = 0; let live = false;
    for (const c of chars) { if (c.drag) { live = true; continue; } if (!c.x && !c.y && !c.vx && !c.vy) continue;
      c.vx = (c.vx - c.x * .085) * .82; c.vy = (c.vy - c.y * .085) * .82; c.x += c.vx; c.y += c.vy;
      if (Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.vx) + Math.abs(c.vy) < .08) { c.x = c.y = c.vx = c.vy = 0; } else live = true; put(c); }
    if (live) raf = requestAnimationFrame(tick); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  chars.forEach(c => {
    c.el.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { c.vy -= 9; c.vx += (Math.random() - .5) * 8; kick(); return; }
      c.drag = { sx: e.clientX - c.x, sy: e.clientY - c.y }; c.el.classList.add('drag'); c.el.setPointerCapture(e.pointerId); e.preventDefault(); kick(); });
    c.el.addEventListener('pointermove', e => { if (!c.drag) return; const dx = e.clientX - c.drag.sx, dy = e.clientY - c.drag.sy, d = Math.hypot(dx, dy) || 1, lim = 260 * Math.tanh(d / 260);
      const nx = dx / d * lim, ny = dy / d * lim; c.vx = nx - c.x; c.vy = ny - c.y; c.x = nx; c.y = ny; put(c); });
    const rel = () => { if (!c.drag) return; c.drag = null; c.el.classList.remove('drag'); kick();
      if (!flung && Math.hypot(c.x, c.y) > 60) { flung = true; window.__marty?.say('Put that back. He paid for those letters.', 3400); } };
    c.el.addEventListener('pointerup', rel); c.el.addEventListener('pointercancel', rel);
  });
  // brushing past the letters with the mouse nudges them
  sec.querySelector('.ct-h').addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const c = chars.find(c => c.el === e.target); if (!c || c.drag) return;
    c.vx += clamp(e.movementX, -30, 30) * .35; c.vy += clamp(e.movementY, -30, 30) * .35; kick(); });

  // ---- "hover me" points at the ring; the ring tells Marty when you're there ----
  const placeHover = () => { const a = ring.getBoundingClientRect(), b = topEl.getBoundingClientRect(), roomR = b.right - a.right;
    if (roomR > 170) { hov.classList.remove('above'); hov.style.left = `${a.right - b.left + 10}px`; hov.style.top = `${a.top - b.top + a.height * .06}px`; }
    else { hov.classList.add('above'); hov.style.left = `${a.left - b.left + a.width * .5}px`; hov.style.top = `${a.top - b.top - 46}px`; } };
  placeHover(); addEventListener('resize', placeHover); document.fonts.ready.then(placeHover);
  ring.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') window.__marty?.ringHover(true); });
  ring.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') window.__marty?.ringHover(false); });
  ring.addEventListener('click', () => { window.__marty?.poke(); if (touch) { window.__marty?.ringHover(true); clearTimeout(ring._t); ring._t = setTimeout(() => window.__marty?.ringHover(false), 2600); } });

  // ---- footer clock (IST) ----
  const clk = document.getElementById('ctClock'), fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  const tickClock = () => { clk.textContent = fmt.format(new Date()); }; tickClock(); setInterval(tickClock, 20000);

  // ---- the toy: a hand of cards dealt onto the page. Drag and throw them; click one to flip it. ----
  const play = document.getElementById('ctPlay'), ART = window.__cardArt, CS = window.__CARDS || [];
  const BACK = '<svg viewBox="0 0 250 350" aria-hidden="true"><use href="#pc-backart" width="250" height="350"/></svg>';
  const PICK = [0, 8, 1, 2, 3, 4];
  const cards = PICK.map((ci, i) => { const el = document.createElement('div'); el.className = 'ct-card';
    el.innerHTML = `<div class="ct-in"><div class="ct-face f">${ci >= 0 && ART && CS[ci] ? ART(CS[ci]) : BACK}</div><div class="ct-face b">${BACK}</div></div>`;
    if (ci < 0) el.classList.add('flip'); play.appendChild(el); return { el, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, drag: null, z: i + 1 }; });
  play.querySelectorAll('svg text').forEach(t => { if (!t.style.fontFamily) t.style.fontFamily = 'var(--sf)'; });
  if (window.__jokerURL) play.querySelectorAll('.pc-joker-img').forEach(i => i.setAttribute('href', window.__jokerURL));
  // where they lie: around the edges, never on the words
  const HOME_D = [[.075, .25, -12], [.135, .43, 9], [.83, .63, -10], [.91, .7, 13], [.875, .52, 4], [.96, .58, -7]];
  const HOME_P = [[.62, .955, -14], [.7, .965, 6], [.78, .95, -4], [.86, .965, 12], [.92, .95, -9], [.55, .965, 8]];
  let W = 0, H = 0, cw = 0, ch = 0, zTop = 10, dealt = false, raf2 = 0;
  const dims = () => { W = play.clientWidth; H = play.clientHeight; cw = cards[0].el.offsetWidth; ch = cw * 1.4; };
  const homes = () => (W < 700 ? HOME_P : HOME_D).map(([x, y, r]) => ({ x: x * W, y: y * H - (W < 700 ? ch * .2 : 0), r }));
  const draw = c => { c.el.style.transform = `translate3d(${(c.x - cw / 2).toFixed(1)}px, ${(c.y - ch / 2).toFixed(1)}px, 0) rotate(${c.r.toFixed(2)}deg)`; };
  const settle = () => { dims(); const hs = homes(); cards.forEach((c, i) => { if (!c.moved) { c.x = hs[i].x; c.y = hs[i].y; c.r = hs[i].r; } c.x = clamp(c.x, cw / 2, W - cw / 2); c.y = clamp(c.y, ch / 2, H - ch / 2); draw(c); }); };
  // dealt out of Marty's ring the first time you get here
  const deal = () => { if (dealt) return; dealt = true; dims(); const a = ring.getBoundingClientRect(), b = play.getBoundingClientRect(), sx = a.left + a.width / 2 - b.left, sy = a.top + a.height / 2 - b.top, hs = homes();
    cards.forEach((c, i) => { c.el.style.transition = 'none'; c.x = sx; c.y = sy; c.r = 0; draw(c); c.el.style.opacity = 0; });
    play.offsetWidth;
    cards.forEach((c, i) => setTimeout(() => { c.el.style.transition = 'transform .95s cubic-bezier(.2,.9,.25,1.05), opacity .3s'; c.el.style.opacity = 1; c.x = hs[i].x; c.y = hs[i].y; c.r = hs[i].r + (i % 2 ? 360 : -360); draw(c);
      setTimeout(() => { c.el.style.transition = 'none'; c.r = hs[i].r; draw(c); }, 980); }, 160 + i * 120)); };
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.disconnect(); deal(); } }), { threshold: .35 }).observe(sec);
  settle(); addEventListener('resize', () => { if (dealt) settle(); });
  let saidHit = 0;
  const step = () => { raf2 = 0; let live = false; const a = ring.getBoundingClientRect(), b = play.getBoundingClientRect(), rx = a.left + a.width / 2 - b.left, ry = a.top + a.height / 2 - b.top;
    for (const c of cards) { if (c.drag) { live = true; continue; }
      if (Math.abs(c.vx) + Math.abs(c.vy) + Math.abs(c.vr) < .04) continue;
      c.x += c.vx; c.y += c.vy; c.r += c.vr; c.vx *= .955; c.vy *= .955; c.vr *= .93;
      if (c.x < cw / 2) { c.x = cw / 2; c.vx = Math.abs(c.vx) * .55; c.vr *= -.7; } if (c.x > W - cw / 2) { c.x = W - cw / 2; c.vx = -Math.abs(c.vx) * .55; c.vr *= -.7; }
      if (c.y < ch / 2) { c.y = ch / 2; c.vy = Math.abs(c.vy) * .55; } if (c.y > H - ch / 2) { c.y = H - ch / 2; c.vy = -Math.abs(c.vy) * .55; }
      if (Math.hypot(c.x - rx, c.y - ry) < a.width * .5 && Math.hypot(c.vx, c.vy) > 6 && performance.now() - saidHit > 5000) { saidHit = performance.now(); window.__marty?.say('Hey! Watch the hair.', 2600); }
      draw(c); live = true; }
    if (live) raf2 = requestAnimationFrame(step); };
  const go = () => { if (!raf2) raf2 = requestAnimationFrame(step); };
  cards.forEach(c => {
    c.el.addEventListener('pointerdown', e => { if (trick) { c.tap = [e.clientX, e.clientY]; return; } dims(); c.el.style.transition = 'none'; const b = play.getBoundingClientRect();
      c.drag = { ox: e.clientX - b.left - c.x, oy: e.clientY - b.top - c.y, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
      c.el.style.zIndex = ++zTop; c.el.classList.add('drag'); c.el.setPointerCapture(e.pointerId); e.preventDefault(); go(); });
    c.el.addEventListener('pointermove', e => { const d = c.drag; if (!d) return; const b = play.getBoundingClientRect(), t = performance.now(), dt = Math.max(8, t - d.lt);
      d.vx = d.vx * .5 + (e.clientX - d.lx) / dt * 16 * .5; d.vy = d.vy * .5 + (e.clientY - d.ly) / dt * 16 * .5; d.lx = e.clientX; d.ly = e.clientY; d.lt = t;
      c.x = clamp(e.clientX - b.left - d.ox, cw / 2, W - cw / 2); c.y = clamp(e.clientY - b.top - d.oy, ch / 2, H - ch / 2); c.r += (d.vx * .6 - c.r * .02) * .2; draw(c); });
    const rel = e => { if (trick) { if (c.tap && Math.hypot(e.clientX - c.tap[0], e.clientY - c.tap[1]) < 10) trickTap(c); c.tap = null; return; }
      const d = c.drag; if (!d) return; c.drag = null; c.el.classList.remove('drag'); c.moved = true;
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) { c.el.classList.toggle('flip'); return; }
      c.vx = clamp(d.vx, -60, 60); c.vy = clamp(d.vy, -60, 60); c.vr = clamp(d.vx * .5, -18, 18); go(); };
    c.el.addEventListener('pointerup', rel); c.el.addEventListener('pointercancel', rel);
  });
  // ---- the card game: you pick a card, Marty shuffles, you have to find it again ----
  const trickBtn = document.getElementById('ctTrick'); let trick = null;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const moveTo = (c, x, y, r, ms = 700, ease = 'cubic-bezier(.2,.8,.2,1)') => { c.el.style.transition = `transform ${ms}ms ${ease}`; c.x = x; c.y = y; c.r = r; draw(c); };
  const rowPos = (i, n) => { const gap = Math.min(cw * 1.14, (W - cw) / Math.max(1, n - .5)), tb = trickBtn.getBoundingClientRect(), pb = play.getBoundingClientRect();
    return { x: W / 2 + (i - (n - 1) / 2) * gap, y: Math.min(H - ch * .62, tb.bottom - pb.top + ch * .5 + 34) }; }; // the row sits right under the button
  const say = (t, ms) => window.__marty?.say(t, ms);
  async function runTrick() {
    if (trick) return; dims(); trick = { phase: 'fan', slot: cards.slice() }; trickBtn.disabled = true; trickBtn.textContent = 'Pick a card…';
    cards.forEach(c => { c.vx = c.vy = c.vr = 0; c.el.classList.remove('flip', 'found', 'miss'); });
    say('Pick a card. Remember it. Tap it.', 7000);
    cards.forEach((c, i) => { const p = rowPos(i, cards.length); c.el.style.zIndex = 20 + i; moveTo(c, p.x, p.y, (i - 2.5) * 3, 650); });
    await wait(700); trick.phase = 'pick';
  }
  function trickTap(c) { if (trick.phase === 'pick') chosen(c); else if (trick.phase === 'guess') guess(c); }
  async function chosen(c) {
    trick.phase = 'shuffle'; trick.card = c; trickBtn.textContent = 'Watch the card…';
    c.el.classList.add('found'); moveTo(c, c.x, c.y - ch * .3, 0, 380, 'cubic-bezier(.34,1.56,.64,1)'); say("That one? Bold. Keep your eyes on it.", 3400);
    await wait(1500); c.el.classList.remove('found'); moveTo(c, c.x, c.y + ch * .3, 0, 300); await wait(340);
    cards.forEach(k => k.el.classList.add('flip')); await wait(800);
    // three-card-monte: two cards swap places in arcs, faster each time. Trackable if you're locked in.
    const n = cards.length, swaps = RM ? 3 : 9;
    for (let sI = 0; sI < swaps; sI++) {
      const ms = Math.max(240, 560 - sI * 38); let i = Math.random() * n | 0, j = Math.random() * (n - 1) | 0; if (j >= i) j++;
      if (sI % 3 === 0) { const at = trick.slot.indexOf(c); if (at !== i && at !== j) j = at; }   // the chosen card moves at least every third swap
      const A = trick.slot[i], B = trick.slot[j], pi = rowPos(i, n), pj = rowPos(j, n), lift = ch * .42;
      A.el.style.zIndex = 40; B.el.style.zIndex = 39;
      moveTo(A, (pi.x + pj.x) / 2, pi.y - lift, 0, ms / 2, 'cubic-bezier(.3,.6,.4,1)'); moveTo(B, (pi.x + pj.x) / 2, pi.y + lift * .35, 0, ms / 2, 'cubic-bezier(.3,.6,.4,1)');
      await wait(ms / 2);
      moveTo(A, pj.x, pj.y, (j - 2.5) * 3, ms / 2, 'cubic-bezier(.6,0,.7,1)'); moveTo(B, pi.x, pi.y, (i - 2.5) * 3, ms / 2, 'cubic-bezier(.6,0,.7,1)');
      await wait(ms / 2 + 40);
      trick.slot[i] = B; trick.slot[j] = A; trick.slot.forEach((k, q) => { k.el.style.zIndex = 20 + q; });
      if (sI === 4) say('Faster. Keep up.', 2200);
    }
    trick.phase = 'guess'; trickBtn.textContent = 'Find your card'; say('Where is it? Tap your card.', 9000);
  }
  function confetti(el) {
    if (RM) return; const b = play.getBoundingClientRect(), r = el.getBoundingClientRect(), x0 = r.left + r.width / 2 - b.left, y0 = r.top + r.height / 2 - b.top, cols = ['#ff4500', '#182113', '#eeece7', '#b8c0a5', '#e2b34c'];
    for (let i = 0; i < 46; i++) { const d = document.createElement('i'); d.className = 'ct-conf'; d.style.cssText = `left:${x0}px;top:${y0}px;background:${cols[i % cols.length]};width:${6 + Math.random() * 6 | 0}px;height:${8 + Math.random() * 10 | 0}px`;
      play.appendChild(d); const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260, dx = Math.cos(a) * v, dy = Math.sin(a) * v - 160;
      d.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 260}px)) rotate(${Math.random() * 900 - 450}deg)`, opacity: 0 }], { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => d.remove(); }
  }
  async function guess(k) {
    trick.phase = 'reveal'; const c = trick.card, win = k === c;
    k.el.classList.remove('flip'); k.el.style.zIndex = 60; await wait(500);
    if (win) {
      k.el.classList.add('found'); moveTo(k, k.x, k.y - ch * .34, 0, 520, 'cubic-bezier(.34,1.56,.64,1)'); confetti(k.el);
      trickBtn.textContent = 'You found it'; say("No way. You actually found it. Respect. You're him.", 6000);
    } else {
      k.el.classList.add('miss'); trickBtn.textContent = 'Wrong card'; say("Wrong card. Not even close 💀", 3200);
      await wait(1300); c.el.classList.remove('flip'); c.el.classList.add('found'); c.el.style.zIndex = 61; moveTo(c, c.x, c.y - ch * .3, 0, 520, 'cubic-bezier(.34,1.56,.64,1)');
      say('It was this one. Run it back?', 5200);
    }
    await wait(2600); cards.forEach(q => q.el.classList.remove('flip')); await wait(2200);
    cards.forEach(q => q.el.classList.remove('found', 'miss')); const hs = homes(); cards.forEach((q, i) => { q.moved = false; moveTo(q, hs[i].x, hs[i].y, hs[i].r, 900); });
    await wait(960); cards.forEach(q => { q.el.style.transition = 'none'; }); trick = null; trickBtn.disabled = false; trickBtn.textContent = win ? 'Play again. Harder.' : 'Run it back';
  }
  trickBtn.addEventListener('click', runTrick);
}

/* =========================================================
   MARTY, PAGE HOST
   The same Marty (same build, same rig, same cigarette) stands on the loader, leaves his room and keeps
   you company down the page from a small transparent canvas that follows him (cheap: it never covers
   the whole screen). He only moves when it means something: onto the engines, to the deck, to the reel,
   to case six, along the Process timeline, across the three numbers, to Yohith's photos, into the ring.
   In between he waits in the corner of the screen and points at whatever you hover.
   Where he belongs is a pure function of the scroll position, so scrolling back replays it in reverse.
   Scroll back to the top and he jumps out of the page and drops back into his room from the sky.
   Orthographic camera in pixels: world (x, -y) = screen (x, y).
   ========================================================= */
{
  const LB = window.__lab;
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = t => t * t * (3 - 2 * t), lerp = (a, b, k) => a + (b - a) * k;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), NOW = () => performance.now();
  const Q = s => document.querySelector(s), QA = s => [...document.querySelectorAll(s)];
  const rect = el => el.getBoundingClientRect(), shown = el => !!el && el.getClientRects().length > 0;
  const RIG = MARTY.M, HEIGHT = RIG.HEIGHT;
  // hand targets written for a shoulder at (±.36, .52) and a .63 arm, mapped onto this rig
  const AR = (RIG.A + RIG.B) / .63, L = (x, y, z) => V3(RIG.shL.x + (x - .36) * AR, RIG.shL.y + (y - .52) * AR, z * AR);
  const Rh = (x, y, z) => V3(RIG.shR.x + (x + .36) * AR, RIG.shR.y + (y - .52) * AR, z * AR);

  // ---------- overlay renderer: a box around Marty, not the whole screen ----------
  const mcv = document.createElement('canvas'); mcv.className = 'marty-cv'; mcv.setAttribute('aria-hidden', 'true'); mcv.style.visibility = 'hidden'; document.body.appendChild(mcv);
  const mb = document.createElement('div'); mb.className = 'bubble mbub'; document.body.appendChild(mb);
  const mr = new THREE.WebGLRenderer({ canvas: mcv, alpha: true, antialias: true, powerPreference: 'high-performance' });
  mr.setClearColor(0x000000, 0); mr.outputColorSpace = THREE.SRGBColorSpace; mr.toneMapping = THREE.AgXToneMapping; mr.toneMappingExposure = 1.1;
  const ms = new THREE.Scene();
  ms.environment = scene.environment;
  ms.add(new THREE.HemisphereLight('#fff3e2', '#3b2d22', 1.4));
  const keyL = new THREE.DirectionalLight('#fff0dc', 2.6); keyL.position.set(-.55, 1, .85); ms.add(keyL);
  const rimL = new THREE.DirectionalLight('#ffb27a', 1.1); rimL.position.set(.9, .35, -.7); ms.add(rimL);
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000); cam.position.z = 2000;
  let VW = innerWidth, VH = innerHeight, BW = 0, BH = 0;
  const DPRM = Math.min(devicePixelRatio || 1, 2);
  mr.setPixelRatio(DPRM);
  const words = new Map();
  const size = () => { VW = innerWidth; VH = innerHeight; words.clear(); };
  addEventListener('resize', size); document.fonts.ready.then(() => words.clear());
  // the canvas is a box sized to Marty (in steps, so it rarely reallocates) and moved with a transform
  function boxTo(x, y, px) {
    const w = Math.ceil(px * 1.7 / 64) * 64 + 64, hgt = Math.ceil(px * 2.1 / 64) * 64 + 64;
    if (w !== BW || hgt !== BH) { BW = w; BH = hgt; mr.setSize(BW, BH, false); mcv.style.width = BW + 'px'; mcv.style.height = BH + 'px'; }
    const bx = Math.round(x - BW / 2), by = Math.round(y - BH + px * .22 + 24);
    cam.left = bx; cam.right = bx + BW; cam.top = -by; cam.bottom = -(by + BH); cam.updateProjectionMatrix();
    mcv.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
    return { bx, by };
  }

  // ---------- the rig: a clone of the room's Marty ----------
  const tilt = new THREE.Group(); tilt.rotation.x = .3; ms.add(tilt);
  const M2 = buddy.clone(true); M2.visible = true; M2.position.set(0, 0, 0); M2.rotation.set(0, 0, 0); M2.scale.setScalar(1); tilt.add(M2);
  M2.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; } });
  const pick = n => M2.getObjectByName(n);
  const cigC = pick('Cigarette'); let emberC = null;
  cigC.traverse(o => { if (o.isMesh && o.material === BM.ember) { o.material = BM.ember.clone(); emberC = o; } });
  const R = { hips: pick('Hips'), torso: pick('Torso'), head: pick('Head'), legL: pick('Leg_L'), legR: pick('Leg_R'), shinL: pick('Shin_L'), shinR: pick('Shin_R'),
    aR: { upper: pick('UpperArm_R'), fore: pick('Forearm_R'), A: RIG.A, B: RIG.B }, aL: { upper: pick('UpperArm_L'), fore: pick('Forearm_L'), A: RIG.A, B: RIG.B } };
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), M.blob.clone()); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01; M2.add(shadow);
  const POCKET = RIG.pocket;
  const crown = new THREE.Group(); crown.visible = false; R.head.add(crown);
  { const gold = new THREE.MeshStandardMaterial({ color: '#e2b34c', metalness: .8, roughness: .32, emissive: '#2a1800' }), gem = new THREE.MeshStandardMaterial({ color: '#c0182a', roughness: .3, emissive: '#3a0008' });
    const bx = (w, h, d, x, y, z, m = gold) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); crown.add(b); };
    bx(.5, .09, .04, 0, .55, .25); bx(.5, .09, .04, 0, .55, -.25); bx(.04, .09, .5, .25, .55, 0); bx(.04, .09, .5, -.25, .55, 0);
    [-.17, 0, .17].forEach((x, i) => bx(.07, i === 1 ? .15 : .11, .04, x, i === 1 ? .66 : .64, .25)); [-.17, .17].forEach(z => bx(.04, .11, .07, .25, .64, z)); [-.17, .17].forEach(z => bx(.04, .11, .07, -.25, .64, z));
    bx(.06, .06, .03, 0, .56, .275, gem); crown.scale.setScalar(.44); crown.position.set(.005, .02, -.01); crown.rotation.z = -.12; }

  // ---------- smoke ----------
  const puffs = [], smokeMap = smoke[0] && smoke[0].material.map;
  if (smokeMap) for (let i = 0; i < 22; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeMap, transparent: true, depthWrite: false, opacity: 0 })); sp.userData = { life: 9, max: 1, seed: Math.random() * 10, k: 60, vx: 0, puff: false }; ms.add(sp); puffs.push(sp); }
  let emit = 0;
  const _w = V3(), _m = V3(), _h = V3();
  function smokeFrame(dt, k, exhaling) {
    if (!puffs.length || !emberC) return;
    emberC.getWorldPosition(_w); R.head.localToWorld(_m.set(.01, .055, .12));
    emit = Math.min(2, emit + dt * 6);
    for (const sp of puffs) { const u = sp.userData;
      if (u.life >= u.max) { if (emit >= 1) { emit -= 1; u.life = 0; u.puff = exhaling && Math.random() < .65; sp.position.copy(u.puff ? _m : _w); sp.position.z += 40; u.k = k; u.vx = (Math.random() - .5) * .08; u.max = u.puff ? 1.3 + Math.random() * .8 : 1.8 + Math.random() * 1.1; } else { sp.material.opacity = 0; continue; } }
      u.life += dt; const p = u.life / u.max;
      sp.position.y += dt * u.k * (u.puff ? .12 : .17);
      sp.position.x += (Math.sin(T * 1.3 + u.seed) * .05 + (u.puff ? .08 : 0) + u.vx) * dt * u.k;
      const s = u.k * ((u.puff ? .06 : .025) + p * (u.puff ? .3 : .22)); sp.scale.set(s, s, 1);
      sp.material.opacity = Math.sin(Math.min(p, 1) * Math.PI) * (u.puff ? .5 : .32); sp.material.rotation = u.seed + T * .2; }
  }

  // ---------- pose ----------
  const pose = () => ({ drop: 0, lean: 0, rx: 0, ry: 0, rz: 0, hx: .05, hy: 0, lL: 0, lR: 0, kL: null, kR: null, hL: POCKET.clone(), pL: RIG.poleL, hR: null, pR: RIG.poleR, sx: 1, sy: 1, sh: .5, yaw: null });
  let T = 0, puffT = 0, nextPuff = 2.5, exhale = 0;
  const _hr = V3(), _dd = V3(), _dn = V3(0, -1, 0);
  const knee = l => Math.max(0, l) * .9 + Math.max(0, -l) * .93 + .03;
  function applyPose(p) {
    M2.rotation.x = p.lean; R.hips.position.y = RIG.hip + p.drop; R.torso.position.y = RIG.hip + p.drop;
    R.torso.rotation.set(p.rx, p.ry, p.rz); R.head.rotation.set(p.hx, p.hy, 0);
    R.legL.rotation.x = p.lL; R.legR.rotation.x = p.lR; R.shinL.rotation.x = p.kL ?? knee(p.lL); R.shinR.rotation.x = p.kR ?? knee(p.lR);
    const br = Math.sin(T * 1.6) * .5 + .5; R.torso.scale.set(1 + br * .006, 1 + br * .01, 1 + br * .008);
    M2.scale.set(p.sx, p.sy, p.sx);
    let k = 0; if (puffT > 0) { const q = puffT / 2.4; k = q < .3 ? sm(q / .3) : q < .6 ? 1 : 1 - sm((q - .6) / .4); }
    if (p.hR) { _dd.subVectors(p.hR, RIG.shR); const len = _dd.length(), mx = RIG.A + RIG.B - .02; _hr.copy(RIG.shR).addScaledVector(_dd, len > mx ? mx / len : 1); k = 0; } else _hr.lerpVectors(RIG.rest, RIG.puff, k);
    solveArm(R.aR, RIG.shR, _hr, p.pR); solveArm(R.aL, RIG.shL, p.hL, p.pL);
    cigC.position.copy(R.aR.fore.position).addScaledVector(_dd.copy(_dn).applyQuaternion(R.aR.fore.quaternion), RIG.B + RIG.tip);
    if (emberC) emberC.material.color.setRGB(2.2 + k * 3, .6 + k * .6, .1);
    shadow.material.opacity = p.sh;
  }
  const place = (x, y, k, yaw) => { tilt.position.set(x, -y, 0); tilt.scale.setScalar(k); M2.rotation.y = yaw; };
  const _v = V3();
  const reachTo = (sx, sy, sh, len = .5) => { tilt.updateMatrixWorld(true); _v.set(sx, -sy, 0); R.torso.worldToLocal(_v); _v.sub(sh); _v.z = Math.max(_v.z, .12); _v.normalize(); return sh.clone().addScaledVector(_v, len); };
  const headTo = (p, sx, sy, x, y, k) => { p.hy = clamp((sx - x) / (k * 6), -.6, .6) - p.ry * .5; p.hx = clamp((sy - (y - k * RIG.headY)) / (k * 9), -.25, .35); };
  const walkPose = (p, ph, amt) => { const s = Math.sin(ph); p.lL = s * .5 * amt; p.lR = -s * .5 * amt; p.drop -= Math.abs(Math.cos(ph)) * .03 * amt;
    p.hL.lerp(V3(.24, -.03, s * .2 + .04), amt); p.rz += Math.cos(ph) * .025 * amt; p.ry += s * .045 * amt; };
  const sitPose = (p, sat) => { const kick = Math.sin(T * 2) * .14; p.drop = RIG.sitDrop * sat; p.lL = lerp(p.lL, -1.5, sat); p.lR = lerp(p.lR, -1.5, sat);
    p.kL = lerp(knee(p.lL), 1.3 + kick, sat); p.kR = lerp(knee(p.lR), 1.3 - kick, sat); p.sh = .5 * (1 - sat); p.hL = V3(.3, lerp(-.06, -.5, sat), .2); p.pL = V3(.8, .3, -.4); };
  let curX = -1e4, curY = -1e4, curT = -1e9;
  addEventListener('pointermove', e => { curX = e.clientX; curY = e.clientY; curT = NOW(); }, { passive: true });
  const look = (p, c) => { if (NOW() - curT < 4000 && curX > -1e3) headTo(p, curX, curY, c.x, c.y, c.k); else { p.hy = Math.sin(T * .45) * .18; p.hx = .04 + Math.sin(T * .3) * .03; } };
  const present = (p, tx, ty, c) => { if (tx < c.x - c.k * .25) { p.hR = reachTo(tx, ty, RIG.shR, .5); p.pR = V3(-.8, -.2, -.3); } else { p.hL = reachTo(tx, ty, RIG.shL, .5); p.pL = V3(.8, -.2, -.3); }
    p.ry = clamp((tx - c.x) / (c.k * 30), -.35, .35); headTo(p, tx, ty, c.x, c.y, c.k); };

  // ---------- thoughts: fewer of them, and never under the nav ----------
  const DOTS = '<span class="dots"><i></i><i></i><i></i></span>';
  const TH = { mode: 'off', until: 0, prio: 0, next: null, n: {}, w: 0, h: 0, text: '' };
  function say(text, ms = 4800, prio = 1) { if (!text) return; const t = NOW(); if (TH.mode === 'line' && TH.prio > prio && t < TH.until) return;
    TH.mode = 'line'; TH.prio = prio; TH.until = t + ms; if (TH.text !== text) { TH.text = text; mb.textContent = text; TH.w = 0; } }
  const GENZ = ["We're so back.", "Okay I'm back. Did I miss any lore?", "Sorry, side quest. Anyway.", "Main character re-entering the chat.", "Back like I never left. Iconic, honestly."];
  const GLOBAL = ["Scroll slower. Some of this is funny.", "I'm not a mascot. I'm middle management.", "Ghost founder? Not on his watch.", "Every line on this page? Him. Not a copywriter."];
  function ambient() {
    const s = A.at >= 0 ? ST[A.at] : null, id = s ? s.id : 'edge';
    if (TH.next) { const t = TH.next; TH.next = null; say(t, 5600, 0); return; }
    const own = s ? s.lines : EDGE_LINES, n = TH.n[id] = (TH.n[id] ?? -1) + 1;
    const pool = own.length ? (n % 3 === 2 ? GLOBAL : own) : GLOBAL;
    say(pool[n % pool.length], 5600, 0);
  }
  function thinkTick() {
    const t = NOW();
    if (TH.mode === 'line' && t > TH.until) { TH.mode = 'dots'; TH.until = t + 9000 + Math.random() * 5000; TH.text = ''; mb.innerHTML = DOTS; TH.w = 0; }   // long quiet spells
    else if ((TH.mode === 'dots' && t > TH.until) || TH.mode === 'off') ambient();
  }

  // ---------- stations ----------
  const isPhone = () => VW < 768;
  const BASE = () => isPhone() ? 96 : VW < 1100 ? 128 : clamp(VH * .17, 120, 165);
  const onWord = (id, word) => () => { const h = document.getElementById(id); if (!shown(h)) return null;
    let w = words.get(id); if (!w || !w.isConnected) { const ws = [...h.querySelectorAll('.w')]; if (!ws.length) return null;
      w = ws.find(s => s.textContent.toLowerCase().replace(/[^a-z]/g, '') === word) || ws[0]; words.set(id, w); h._fs = parseFloat(getComputedStyle(h).fontSize); }
    const r = rect(w); if (!r.width) return null; return { x: r.left + r.width * .5, y: r.top + r.height * .5 - h._fs * .34, r }; };
  const edgeOf = (el, f) => { if (!shown(el)) return null; const r = rect(el); if (!r.width) return null; return { x: r.left + r.width * f, y: r.top + 1, r }; };
  const TILE_LINES = { content: 'This one makes you the main character.', podcast: "Your guests are your pipeline. Don't tell them.", revenue: 'He only gets paid when you close. Bold.',
    paid: "Fuel on what's already on fire.", full: 'All four. Obviously all four.', cta: "Not sure? Click it. I'll hold your coffee." };
  const CASE_LINES = { ledgerline: 'Ledgerline. The founder posts. Prospects slide into his DMs.', kiln: 'Kiln. The guest list was the sales list.', northstack: 'Northstack. Warm meetings. Every week.', parcel: 'Parcel AI. Cheaper demos, same budget.', overcast: 'Overcast Labs. All four engines. Full send.' };
  const CARD_LINES = ["That's his AI clone. Better posture than him.", 'Two weeks of research. Done before my smoke break.', 'One voice memo. A month of posts.', "Clips before the coffee's cold. I timed it.",
    '150 data sources. Basically a stalker, but legal.', 'Guests feel understood. Me? Never.', 'More tests, same budget. Math is hot.', 'The admin nobody misses. Including me.', "That's me on the Joker. Royalty, honestly."];
  const STEP_LINES = ['Ninety minutes. He asks what your PR team won’t.', 'One shoot day. A month of content. Heist energy.', "The guests? Your buyers. Don't tell them.", 'Five posts a week. From people, not logos.',
    '500 accounts. Scanning… found a warm one.', 'Cost per demo going down. Like my standards.', 'Warm meetings. Revenue. Act surprised.'];
  const EDGE_LINES = ['I live down here now.', 'Hover something. I narrate.', 'Take your time. I have cigarettes.'];
  const CLICK = ['Wsg my boy 🤝', 'Ayo, personal space?? jk', "Yo, you good? I'm just vibing fr", "Careful, I'm load-bearing."];

  const ST = [];
  const add = o => ST.push(Object.assign({ yaw: 0, lines: [], line: '' }, o));
  const firstTile = Q('.bento:not(.hu-careers) .tile');
  add({ id: 'bento', geo: () => edgeOf(firstTile, isPhone() ? .78 : .84), act: 'tile', el: firstTile, line: '', lines: ['Four engines. One guy you call. Hover one.', "Your team is the channel. Logos are décor."] });
  add({ id: 'lab', act: 'lab', lines: ['Every card is a job a junior used to do.', 'He still edits every single one. Nerd.'],
    geo: () => { if (!LB) return null;
      if (LB.flat() || !LB.L) { const ui = Q('.deck-ui'); if (!shown(ui)) return null; const r = rect(ui); return { x: r.left + (isPhone() ? 20 : 34), y: r.top - 4, px: BASE() * .95 }; }
      const tr = rect(LB.table), L0 = LB.L; return { x: tr.left + L0.deckX + L0.cw * 1.02, y: tr.top + L0.deckY + L0.ch * .5, px: clamp(L0.ch * .72, 120, 200) }; },
    key: g => (LB && !LB.flat() && LB.L) ? -rect(LB.lab).top - .06 * VH : .6 * VH - g.y });
  add({ id: 'reel', act: 'watch', yaw: Math.PI, enter: 'walk', line: 'Movie time. Phones down.', lines: ['Shh. This is the good part.', "I've seen this 400 times. Still slaps."],
    geo: () => { const m = Q('#reelMedia'); if (!shown(m)) return null; const r = rect(m); if (r.width < 20) return null;
      return { x: r.left + r.width * .1, y: r.bottom - Math.max(3, r.height * .025), px: clamp(r.height * .26, 58, BASE() * 1.1) }; },
    key: g => .8 * VH - g.y });
  add({ id: 'six', act: 'six', line: 'Seat six. Saved it for you.', lines: ['This seat has your name on it. Metaphorically.'],
    geo: () => { const c = Q('.work > .wk-cta'); if (!shown(c)) return null; const r = rect(c); return { x: r.right - (isPhone() ? 56 : 150), y: r.top + 1, r }; } });
  add({ id: 'pqHead', geo: onWord('pqTitle', 'in'), act: 'pqHead', line: 'Here’s what happens after you sign.', lines: ["Seven stops. I'll walk you through."] });
  const pqP = () => { const s = rect(Q('#process')); return { s, P: Math.max(0, clamp(-s.top / (s.height - VH * 2)) * 7.6 - .6) }; };
  add({ id: 'rail', act: 'rail', lines: [],
    geo: () => { const rail = Q('#pqRail'); if (!shown(rail)) return null; const r = rect(rail), { P } = pqP(), sf = Math.min(6, Math.floor(P)), tr = sf < 6 ? sm(clamp((P - sf - .62) / .38)) : 0;
      return { x: r.left + r.width * (sf + .5 + tr) / 7, y: r.top, px: BASE() * (isPhone() ? .82 : .8), step: Math.min(6, Math.floor(P + .12)) }; },
    key: () => { const { s } = pqP(); return -s.top - (s.height - VH * 2) * (.6 / 7.6); } });
  let numX = null;
  add({ id: 'nums', act: 'num', line: '',
    geo: () => { const rs = window.__rs; if (!rs || isPhone()) return null; const sec = rect(Q('#results')); if (sec.top > 0) return null;
      const q = clamp(-sec.top / (sec.height - VH)); let k = 0; for (let i = 0; i < 3; i++) if (q > rs.start + i * rs.step) k = i;
      const c = rs.cells[k]; if (!shown(c)) return null; const r = rect(c), tx = r.right - 52; numX = numX == null ? tx : numX + (tx - numX) * .07;
      return { x: numX, y: r.top, px: BASE() * .92, k }; },
    key: () => .12 * VH - rect(Q('#results')).top });
  add({ id: 'human', act: 'human', enter: 'walk', line: 'Meet Yohith. Yes, he’s real.', lines: ['He built all of this. I just live here.', 'Click his face. He loves that.', 'Drag a photo. Go on, toss it.'],
    geo: () => { const s = Q('#huStack'); if (!shown(s)) return null; const r = rect(s); return isPhone() ? { x: Math.min(VW - 26, r.right + 26), y: r.bottom - 8 } : { x: r.left - BASE() * .42, y: r.bottom - 8 }; } });
  add({ id: 'ring', act: 'ring', clip: true, line: 'Oh hey. You made it to the end.', lines: ['Hover the ring. I dare you.', 'Play my card game. Bet you lose.', "That's the whole site. Go book the call."],
    geo: () => { const el = Q('#ctRing'); if (!shown(el)) return null; const r = rect(el), Rr = r.width / 2, cx = r.left + Rr, cy = r.top + Rr;
      return { x: cx, y: cy + Rr * lerp(1.3, .8, sm(A.rise)), px: Rr * 2 * .98, cx, cy, R: Rr }; },
    key: g => .62 * VH - (g.cy + g.R) });
  add({ id: 'foot', act: 'sit', line: "That's the whole site. Go book the call.", lines: [],
    geo: () => { const b = Q('.ct-base'); if (!shown(b)) return null; const r = rect(b); return { x: r.right - (isPhone() ? 40 : 90), y: r.top + 1 }; } });
  // the corner he waits in: standing on the bottom edge of the window. On phones he ducks while you scroll.
  const EDGE = -2;
  let duck = 0, lastScroll = 0;
  addEventListener('scroll', () => { lastScroll = NOW(); }, { passive: true });
  const edgeGeo = () => ({ x: VW - (isPhone() ? 34 : 72), y: VH + 6 + duck * BASE() * .95, px: BASE() * (isPhone() ? .78 : .85) });

  const G = [];
  function measure() {
    let prevY = null, delay = 0;
    for (let i = 0; i < ST.length; i++) { const s = ST[i]; let g = null; try { g = s.geo(); } catch (e) { g = null; }
      if (g) { if (!g.px) g.px = BASE(); if (prevY !== null && Math.abs(g.y - prevY) < 6) delay += .18 * VH; else delay = 0; prevY = g.y; g.key = s.key ? s.key(g) : .6 * VH - (g.y + delay); }
      G[i] = g; }
  }
  function pickTarget() {
    const cur = A.hop && typeof A.hop.to === 'number' ? A.hop.to : A.at;
    let t = -1; for (let i = 0; i < ST.length; i++) if (G[i] && G[i].key + (i === cur ? 40 : 0) - (i === cur + 1 ? 40 : 0) >= 0) t = i;
    if (t < 0) { t = G.findIndex(g => g); if (t < 0) return EDGE; }
    for (let n = 0; n < ST.length && G[t] && G[t].y < .12 * VH; n++) { let j = t + 1; while (j < ST.length && !G[j]) j++; if (j >= ST.length || G[j].y > 1.0 * VH) break; t = j; }
    const g = G[t]; if (!g || g.y < .1 * VH || g.y > 1.06 * VH) return EDGE;
    return t;
  }
  const anchorOf = i => { if (i === EDGE) { const g = edgeGeo(); return { x: g.x, y: g.y, px: g.px, yaw: -.3 }; } const g = G[i]; return g ? { x: g.x, y: g.y, px: g.px, yaw: ST[i].yaw } : null; };

  // ---------- room Marty in screen space ----------
  const _f = V3(), _hh = V3();
  const roomScreen = () => { const S = STAGE; buddy.updateMatrixWorld(true); buddy.localToWorld(_f.set(0, 0, 0)); head.localToWorld(_hh.set(0, .3, 0)); _f.project(camera); _hh.project(camera);
    const x = S.left + (_f.x * .5 + .5) * S.width, y = S.top + (-_f.y * .5 + .5) * S.height, hy = S.top + (-_hh.y * .5 + .5) * S.height; return { x, y, px: Math.max(30, y - hy), yaw: buddy.rotation.y - Math.PI / 4 }; };
  const setRoom = on => { buddy.visible = on; martyShadow.visible = on; window.__martyOut = !on; };
  let dropT = -1;
  const roomDrop = () => { dropT = 0; window.__roomDropY = 9; };
  const dropTick = dt => { if (dropT < 0) return; dropT += dt; const u = clamp(dropT / .62); window.__roomDropY = 9 * (1 - u * u);
    if (u >= 1) { dropT = -1; window.__roomDropY = 0; hop = 1; think('Close call. But I’m back.', 6000); } };

  // ---------- director ----------
  const A = { mode: 'room', at: -1, hop: null, x: 0, y: 0, px: 120, yaw: 0, rise: 0, arrT: 0, said: {}, walkAmt: 0, walkPh: 0, lastAX: null, bounce: 0, ci: 0, lastStep: -1, lastDealt: -1, lastSlide: -1, lastHov: null, fullSaid: false, standSaid: false, lastNum: -1, caseSaid: {} };
  const snap = () => ({ x: A.x, y: A.y, px: A.px, yaw: A.yaw });
  function startHop(from, to, kind = 'hop', u0 = 0) {
    const fa = from === 'room' ? roomScreen() : (typeof from === 'number' ? anchorOf(from) : null), s0 = fa || snap();
    if (kind === 'up') { A.hop = { kind, from: 'snap', snap: s0, to: 'sky', t: 0, dur: .6 }; return; }
    const ta = anchorOf(to) || s0, d = Math.hypot(ta.x - s0.x, ta.y - s0.y);
    const walk = kind === 'hop' && typeof from === 'number' && from >= 0 && to >= 0 && ((ST[to].enter === 'walk' && to === from + 1) || (ST[from].enter === 'walk' && to === from - 1));
    if (walk) return startWalk(from, to);
    A.hop = { kind, from: fa ? from : 'snap', snap: s0, to, t: u0, dur: kind === 'leap' ? 1.25 : clamp(.62 + d / 1500, .65, 1.1) };
  }
  function startWalk(from, to) {
    const fa = typeof from === 'number' && from >= -2 ? anchorOf(from) : null, s0 = fa || snap(), ta = anchorOf(to) || s0;
    A.hop = { kind: 'walk', from: fa ? from : 'snap', snap: s0, to, phase: 0, outSide: s0.x < VW / 2 ? -1 : 1, inSide: ta.x < VW / 2 ? -1 : 1, ox: s0.x, ix: 0 };
    say('Okay, bye.', 3200, 2);
  }
  function arrive(i, how) {
    A.at = i; A.arrT = NOW(); A.lastAX = null; A.walkAmt = 0;
    if (how === 'leap') return;
    if (i === EDGE) return;
    const s = ST[i]; if (!s) return;
    if (how === 'walk') { if (s.line) TH.next = s.line; return; }
    if (s.line && !A.said[s.id]) { A.said[s.id] = 1; say(s.line, 5200, 1); }
  }
  // a jump with weight: crouch, spring, a slow-in/slow-out arc, land and absorb
  function hopFrame(p, dt, target) {
    const h = A.hop;
    if (h.kind === 'hop' && target !== h.to) { A.hop = null; startHop('snap', target, 'hop', h.t > .2 ? .2 : 0); return hopFrame(p, dt, target); }
    if (h.kind === 'leap') h.to = target;
    h.t += dt / h.dur; const u = clamp(h.t);
    let fr = h.from === 'room' ? roomScreen() : h.from === 'snap' ? h.snap : anchorOf(h.from); if (!fr) fr = h.snap; else if (h.from !== 'snap') h.snap = fr;
    const to = h.to === 'sky' ? { x: fr.x, y: -fr.px * 1.5, px: fr.px, yaw: fr.yaw } : (anchorOf(h.to) || h.last || fr); h.last = to;
    const a = sm(clamp((u - .2) / .62)), dx = to.x - fr.x, dy = to.y - fr.y, px = lerp(fr.px, to.px, a);
    let x, y;
    if (h.kind === 'up') { x = fr.x; y = fr.y + dy * a * a; }
    else { const H = (Math.max(46, Math.abs(dx) * .14 + Math.abs(dy) * .16) + Math.max(0, -dy) * .5) * clamp(px / 140, .5, 1.3) + (h.kind === 'leap' ? 60 : 0);
      x = lerp(fr.x, to.x, a); y = lerp(fr.y, to.y, a) - H * 4 * a * (1 - a); }
    const dir = Math.abs(dx) > 30 ? Math.sign(dx) : 0, air = dir ? dir * .9 : to.yaw;
    const yaw = u < .2 ? lerp(fr.yaw, air, sm(u / .2)) : u < .82 ? air : lerp(air, to.yaw, sm((u - .82) / .18));
    if (u < .2) { const c = sm(u / .2); p.drop = -.12 * c; p.rx = .2 * c; p.hL = L(.34, -.08, -.2 * c); p.hx = .14 * c; p.lL = -.25 * c; p.lR = -.25 * c; }
    else if (u < .82) { const tuck = Math.sin(clamp((u - .2) / .62) * Math.PI); p.lL = -.6 * tuck; p.lR = .35 * tuck; p.rx = lerp(.16, -.08, a); p.hL = L(.44, .15 + .7 * tuck, .2); p.pL = V3(.8, .3, -.4);
      p.hx = -.16 * tuck; p.sh = .05; p.sy = 1 + .05 * (1 - sm(clamp((u - .2) * 6))); }
    else { const l = (u - .82) / .18, sq = Math.sin(l * Math.PI); p.drop = -.14 * sq; p.lL = p.lR = -.3 * sq; p.sy = 1 - .06 * sq; p.sx = 1 + .04 * sq; p.rx = .16 * sq; p.hL = L(.36, -.02, .22 * sq); }
    if (u >= 1) { A.hop = null; if (h.kind === 'up') return 'sky'; arrive(h.to, h.kind); }
    return { x, y, px, yaw };
  }
  function walkFrame(p, dt, target) {
    const h = A.hop, speed = Math.max(460, VW * .55);
    if (target !== h.to) { if (h.phase === 1 || A.x < -40 || A.x > VW + 40) h.to = target; else { A.hop = null; startHop('snap', target); return hopFrame(p, dt, target); } }
    let fr = h.from === 'snap' ? h.snap : anchorOf(h.from); if (!fr) fr = h.snap; else h.snap = fr;
    const to = anchorOf(h.to) || fr;
    let x, y, px, dir;
    if (h.phase === 0) { const goal = h.outSide < 0 ? -fr.px * .8 : VW + fr.px * .8; dir = Math.sign(goal - h.ox) || 1; h.ox += dir * speed * dt;
      x = h.ox; y = fr.y; px = fr.px; if ((goal - h.ox) * dir <= 0) { h.phase = 1; h.ix = h.inSide < 0 ? -to.px * .8 : VW + to.px * .8; say(GENZ[(A.ci++) % GENZ.length], 4800, 2); } }
    else { dir = Math.sign(to.x - h.ix) || 1; h.ix += dir * speed * dt; if ((to.x - h.ix) * dir <= 0) { h.ix = to.x; A.hop = null; arrive(h.to, 'walk'); } x = h.ix; y = to.y; px = to.px; }
    A.walkPh += speed * dt / (px * .2); walkPose(p, A.walkPh, 1); p.lean = .05;
    return { x, y, px, yaw: dir * 1.35 };
  }
  function startLeave() { const s0 = snap(); A.hop = { kind: 'leave', snap: s0, side: s0.x < VW / 2 ? -1 : 1, x: s0.x }; say('Okay, bye.', 3000, 3); }
  function leaveFrame(p, dt) { const h = A.hop, goal = h.side < 0 ? -A.px : VW + A.px, sp = Math.max(460, VW * .55); h.x += h.side * sp * dt; A.walkPh += sp * dt / (A.px * .2); walkPose(p, A.walkPh, 1);
    if ((goal - h.x) * h.side <= 0) { A.hop = null; return null; } return { x: h.x, y: h.snap.y, px: h.snap.px, yaw: h.side * 1.35 }; }
  function startEnter(to) { const ta = anchorOf(to), side = ta && ta.x < VW / 2 ? -1 : 1; A.hop = { kind: 'walk', from: 'snap', snap: ta || snap(), to, phase: 1, inSide: side, ix: side < 0 ? -BASE() : VW + BASE() }; say(GENZ[(A.ci++) % GENZ.length], 4800, 3); }

  const GEST = [
    p => { p.hL = L(.3, .86, .04); p.pL = V3(.9, -.2, -.3); p.hx = .06; p.rz = -.07; },
    p => { p.hL = L(.12, .85, .4); p.pL = V3(.8, -.3, -.2); p.hx = -.02; p.ry = -.12; },
    p => { p.hL = L(.33, .95, 0); p.pL = V3(.9, 0, -.3); p.hx = .05 + Math.sin(T * 6.5) * .07; },
    p => { p.hL = L(.08, .3, .36 + Math.sin(T * 5) * .02); p.pL = V3(.8, -.3, -.3); p.hx = .32; p.hy = .08; },
    p => { p.hL = L(.12, .9, .3); p.pL = V3(.8, .1, -.3); p.hy = Math.sin(T * .9) * .45; p.hx = -.02; },
    null,
    p => { p.hL = L(.06, .42, .34); p.pL = V3(.9, -.2, -.3); p.hx = .34; p.hy = .1; },
  ];
  // points at whatever you hover (engine tiles, case studies), otherwise watches you
  function pointAtHover(p, c, allowCases = true) {
    const hov = Q('.bento .tile.hov') || (allowCases && Q('.wk-grid .cm:hover')) || Q('.work > .wk-cta.hov');
    if (hov) { const r = rect(hov); present(p, r.left + r.width * .5, r.top + r.height * .45, c);
      if (hov !== A.lastHov) { A.lastHov = hov; const tl = hov.classList.contains('tile') ? TILE_LINES[hov.dataset.offer || 'cta'] : CASE_LINES[hov.closest('.case')?.dataset.case]; if (tl) say(tl, 3800, 1); } return true; }
    A.lastHov = null; return false; }
  const ACT = {
    stand(p, c) { look(p, c); },
    tile(p, c) { if (!pointAtHover(p, c)) { const r = rect(c.s.el); present(p, r.left + r.width * .5, r.top + r.height * .45, c); } },
    lab(p, c) {
      if (LB.flat() || !LB.L) { const n = +(Q('.deck-n b')?.textContent || 1); if (n !== A.lastSlide) { if (A.lastSlide > 0) say(CARD_LINES[n - 1], 3600, 1); A.lastSlide = n; }
        const tr = rect(LB.table); present(p, tr.left + tr.width * .5, tr.top + tr.height * .45, c); return; }
      const d = LB.dealt; if (d !== A.lastDealt) { if (d > A.lastDealt && d > 0 && A.lastDealt >= 0) say(d === LB.N && !A.fullSaid ? (A.fullSaid = true, 'Full house. Obviously.') : CARD_LINES[d - 1], 3800, 1); A.lastDealt = d; }
      let watch = LB.hover; if (watch < 0) { let bt = -1; for (let i = 0; i < LB.N; i++) { const t = (LB.cur - LB.S0 - i * LB.STEP) / LB.DUR; if (t > 0 && t < 1.25 && t > bt) { bt = t; watch = i; } } }
      if (watch >= 0 && LB.els[watch]) { const r = rect(LB.els[watch]); if (LB.hover >= 0) present(p, r.left + r.width / 2, r.top + r.height / 2, c); else { headTo(p, r.left + r.width / 2, r.top + r.height / 2, c.x, c.y, c.k); p.ry = clamp((r.left - c.x) / (c.k * 40), -.3, .3); } }
      else look(p, c); },
    watch(p, c) { p.yaw = Math.PI; p.hx = -.14 + Math.sin(T * .7) * .03; p.hy = Math.sin(T * .35) * .1; p.rz = Math.sin(T * .9) * .02; },
    six(p, c) { sitPose(p, sm(clamp((NOW() - A.arrT) / 500))); if (!pointAtHover(p, c, false)) look(p, c); },
    sit(p, c) { sitPose(p, sm(clamp((NOW() - A.arrT) / 500))); look(p, c); },
    pqHead(p, c) { const st = rect(Q('#pqStage')); present(p, st.left + st.width * .5, st.top + st.height * .45, c); },
    rail(p, c) { const g = c.g; if (A.walkAmt > .35) return;
      if (g.step !== A.lastStep) { A.lastStep = g.step; say(STEP_LINES[g.step], 5600, 1); }
      if (g.step === 5) { const st = rect(Q('#pqStage')); present(p, st.left + st.width * .5, st.top + st.height * .62, c); } else if (GEST[g.step]) GEST[g.step](p); },
    num(p, c) { const rs = window.__rs, k = c.g.k, cell = rs.cells[k], r = rect(cell.querySelector('.rs-num'));
      if (A.lastNum !== k) { A.lastNum = k; say(rs.R[k].say, 5600, 1); }
      if (A.walkAmt < .3) present(p, r.left + r.width * .45, r.top + r.height * .5, c); },
    human(p, c) { const r = rect(Q('#huStack')); present(p, r.left + r.width / 2, r.top + r.height * .4, c); },
    ring(p, c) { look(p, c); if (A.rise > .45) { const w = Math.sin(T * 10); p.hL = L(.4 + w * .07, .98, .16); p.pL = V3(.9, -.1, -.3); p.rz = w * .025; } },
    edge(p, c) { if (!pointAtHover(p, c)) look(p, c);
      // the case study in the middle of the screen gets a comment (once), without him moving
      const mid = QA('.wk-grid .case').find(el => { const r = rect(el); return r.top < VH * .55 && r.bottom > VH * .45; });
      if (mid && !A.caseSaid[mid.dataset.case]) { A.caseSaid[mid.dataset.case] = 1; say(CASE_LINES[mid.dataset.case], 4800, 1); } },
  };
  function holdFrame(p, dt) {
    const i = A.at, a = anchorOf(i); if (!a) return null;
    const s = i >= 0 ? ST[i] : null, g = i >= 0 ? G[i] : null, k = a.px / HEIGHT;
    const c = { x: a.x, y: a.y, px: a.px, k, g, s, dt };
    if (A.lastAX !== null && dt > 0) { const dx = a.x - A.lastAX, v = Math.abs(dx) / dt; A.walkAmt += ((v > 22 * (a.px / 120) ? 1 : 0) - A.walkAmt) * Math.min(1, dt * 8);
      if (A.walkAmt > .02) { A.walkPh += Math.abs(dx) / (a.px * .2); if (Math.abs(dx) > .2) A.walkDir = Math.sign(dx); } }
    A.lastAX = a.x;
    place(a.x, a.y, k, a.yaw);
    (ACT[s ? s.act : 'edge'] || ACT.stand)(p, c);
    let yaw = p.yaw ?? a.yaw;
    if (A.walkAmt > .02) { walkPose(p, A.walkPh, A.walkAmt); yaw = lerp(yaw, (A.walkDir || 1) * 1.3, A.walkAmt); }
    return { x: a.x, y: a.y, px: a.px, yaw };
  }

  // ---------- boredom, idling, clicks ----------
  const BOR = { last: scrollY, dir: 0, seg: 0, rev: [], dist: [], said: -1e9, idle: NOW(), idleSaid: false };
  addEventListener('scroll', () => { const y = scrollY, d = y - BOR.last; BOR.last = y; if (!d) return; const t = NOW(); BOR.idle = t; BOR.idleSaid = false; BOR.dist.push([t, Math.abs(d)]);
    const dir = Math.sign(d); if (dir !== BOR.dir) { if (BOR.seg > .4 * innerHeight) BOR.rev.push(t); BOR.dir = dir; BOR.seg = 0; } BOR.seg += Math.abs(d); }, { passive: true });
  addEventListener('pointerdown', () => { BOR.idle = NOW(); BOR.idleSaid = false; }, { passive: true });
  let borT = 0;
  function boredTick(now) {
    if (now - borT < 500) return; borT = now;
    BOR.rev = BOR.rev.filter(t => now - t < 25000); BOR.dist = BOR.dist.filter(([t]) => now - t < 20000);
    const dist = BOR.dist.reduce((s, [, d]) => s + d, 0);
    if ((BOR.rev.length >= 3 || dist > 14 * innerHeight) && now - BOR.said > 45000) { BOR.said = now; BOR.rev = []; BOR.dist = [];
      const line = 'How long are you going to do this? Just see what he can do.'; if (A.mode === 'room') think(line, 6500); else say(line, 6500, 3); }
    if (!BOR.idleSaid && now - BOR.idle > 30000) { BOR.idleSaid = true; const line = "Still here? Book the call. He doesn't bite."; if (A.mode === 'room') think(line, 6000); else say(line, 6000, 2); }
  }
  addEventListener('click', e => { if (A.mode !== 'out' || A.hop) return; const k = A.px;
    if (Math.abs(e.clientX - A.x) > k * .3 || e.clientY > A.y + 4 || e.clientY < A.y - k * 1.02) return;
    if (e.target.closest && e.target.closest('a, button, input, textarea, .tile, .cm, .pc, .ct-card, .hu-pol, .ct-ch, #ctRing')) return;
    A.bounce = 1; say(CLICK[(A.ci++) % CLICK.length], 3200, 2); }, true);
  window.__marty = {
    say: (t, ms = 3800) => { if (A.mode === 'out') say(t, ms, 2); else if (A.mode === 'room') think(t, ms); },
    ringHover: on => { window.__ringHover = on; if (on && A.at >= 0 && ST[A.at].id === 'ring' && !A.hop) say("Hi. Book the call. He doesn't bite.", 3400, 2); },
    poke: () => { if (A.at >= 0 && ST[A.at].id === 'ring') { A.bounce = 1; say(['Okay, okay. I’m up.', 'That tickles. Book the call.', 'Still here? The button’s right there.'][(A.ci++) % 3], 3200, 2); } },
    get mode() { return A.mode; }, get at() { return A.at >= 0 ? ST[A.at].id : A.at; },
  };

  // ---------- the loop ----------
  let last = NOW();
  const clipFor = (g, o) => `path('M0 0H${BW}V${(g.cy - o.by).toFixed(1)}H${(g.cx + g.R - o.bx).toFixed(1)}A${g.R.toFixed(1)} ${g.R.toFixed(1)} 0 0 1 ${(g.cx - g.R - o.bx).toFixed(1)} ${(g.cy - o.by).toFixed(1)}H0Z')`;
  const hide = () => { if (mcv.style.visibility !== 'hidden') mcv.style.visibility = 'hidden'; mb.classList.remove('show'); };
  const navEl = Q('.nav');
  function draw(p, o, dt, withBubble) {
    const k = A.px / HEIGHT, box = boxTo(A.x, o.y, A.px);
    place(A.x, o.y, k, A.yaw); applyPose(p);
    const ri = ST.findIndex(s => s.id === 'ring'), rg = G[ri];
    const clipOn = rg && ((A.at === ri && !A.hop) || (A.hop && A.hop.to === ri && A.hop.t > .5) || (A.hop && A.hop.from === ri && A.hop.t < .5));
    const cp = clipOn ? clipFor(rg, box) : ''; if (mcv._cp !== cp) { mcv._cp = cp; mcv.style.clipPath = cp; }
    smokeFrame(dt, k, exhale > 0);
    if (mcv.style.visibility) mcv.style.visibility = '';
    mr.render(ms, cam);
    if (!withBubble) { mb.classList.remove('show'); return; }
    thinkTick();
    R.head.updateMatrixWorld(true); R.head.localToWorld(_h.set(0, .3, 0));
    if (!TH.w) { TH.w = mb.offsetWidth; TH.h = mb.offsetHeight; }
    // keep clear of the nav: if his head is up under it, the bubble moves beside him instead of above
    const nb = navEl ? Math.max(0, rect(navEl).bottom) + 10 : 10, hx = _h.x, hy = -_h.y;
    let bx = hx, by = hy;
    if (hy - TH.h < nb) { const side = hx > VW / 2 ? -1 : 1; bx = hx + side * (TH.w / 2 + A.px * .28); by = Math.max(nb + TH.h, hy + TH.h * .6); }
    bx = clamp(bx, TH.w / 2 + 10, VW - TH.w / 2 - 10);
    mb.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) translate(-50%, -100%)`;
    if (!mb.classList.contains('show')) mb.classList.add('show');
  }
  const slot = Q('#loaderMarty');
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now; T += dt;
    dropTick(dt);
    if (T > nextPuff && !puffT) puffT = .001; if (puffT) { puffT += dt; if (puffT >= 2.4) { puffT = 0; exhale = 1.4; nextPuff = T + 6 + Math.random() * 3; } } exhale = Math.max(0, exhale - dt);
    // on the loader: he stands on the page and leaves with it when it wipes up
    if (!document.body.classList.contains('ready')) {
      if (!slot) return hide(); const r = rect(slot); if (r.bottom < -40) return hide();
      const p = pose(); A.x = r.left + r.width / 2; A.px = r.height * .95; A.yaw = Math.sin(T * .5) * .25 - .1; const c = { x: A.x, y: r.bottom, k: A.px / HEIGHT };
      p.hy = Math.sin(T * .7) * .2; p.hx = .04;
      return draw(p, { y: r.bottom }, dt, false);
    }
    if (REDUCE) return hide();
    boredTick(now);
    const st = rect(stageEl), leave = st.bottom < VH * .5, back = st.bottom > VH * .6, over = !!Q('.detail.open, .cs.open, .mnav.open');
    const ringOn = A.at >= 0 && ST[A.at] && ST[A.at].id === 'ring' && !A.hop;
    A.rise += (((ringOn && (window.__ringHover || NOW() - A.arrT < 2600)) ? 1 : 0) - A.rise) * Math.min(1, dt * 5);
    duck += (((isPhone() && A.at === EDGE && !A.hop && NOW() - lastScroll < 450) ? 1 : 0) - duck) * Math.min(1, dt * 7);
    measure(); const target = pickTarget();
    if (A.mode === 'room') { if (leave && !over) { setRoom(false); A.mode = 'out'; A.said = {}; if (st.bottom > -40) { startHop('room', target, 'leap'); say('Nobody tell my landlord I left the room.', 5600, 2); } else startEnter(target); } else return hide(); }
    else if (A.mode === 'out') { if (back && !(A.hop && A.hop.kind === 'up')) { startHop('snap', 'sky', 'up'); A.mode = 'up'; } else if (over && (!A.hop || A.hop.kind !== 'leave')) { A.mode = 'leaving'; startLeave(); } }
    else if (A.mode === 'up') { if (leave) { A.mode = 'out'; A.hop = null; startHop('snap', target, 'hop', .2); } }
    else if (A.mode === 'leaving' || A.mode === 'gone') { if (!over) { A.mode = 'out'; startEnter(target); } }
    if (A.mode === 'gone') return hide();
    const p = pose(); let o = null;
    if (A.hop) o = A.hop.kind === 'walk' ? walkFrame(p, dt, target) : A.hop.kind === 'leave' ? leaveFrame(p, dt) : hopFrame(p, dt, target);
    else if (A.mode === 'out' && target !== A.at) { startHop(A.at, target); o = A.hop.kind === 'walk' ? walkFrame(p, 0, target) : hopFrame(p, 0, target); }
    else o = holdFrame(p, dt);
    if (o === 'sky') { A.mode = 'room'; A.at = -1; setRoom(true); roomDrop(); return hide(); }
    if (!o) { if (A.mode === 'leaving') A.mode = 'gone'; return hide(); }
    A.x = o.x; A.y = o.y; A.px = o.px; A.yaw = o.yaw;
    if (A.bounce > 0) { A.bounce = Math.max(0, A.bounce - dt * 2.4); const b = Math.sin((1 - A.bounce) * Math.PI); o.y -= b * A.px * .12; p.sy *= 1 + b * .04; }
    draw(p, o, dt, A.mode !== 'up' && duck < .5);
  }

  // ---------- his portrait for the Joker card (rendered once, with the crown on) ----------
  (function jokerShot() {
    const W = 320, H = 400;
    try {
      crown.visible = true; shadow.visible = false; puffs.forEach(s => s.visible = false);
      const p = pose(); p.hL = L(.4, .98, .2); p.pL = V3(.9, -.1, -.3); p.hx = -.05; p.hy = -.18; p.rz = .05; puffT = 0;
      const k = H / 1.3; place(0, 0, k, .42); tilt.position.set(0, -1.42 * k, 0); applyPose(p);
      const c2 = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -5000, 5000); c2.position.z = 2000;
      mr.setPixelRatio(1); mr.setSize(W, H, false); mr.render(ms, c2);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(mcv, 0, 0, W, H);
      const url = cv.toDataURL('image/png'); window.__jokerURL = url; QA('.pc-joker-img').forEach(i => i.setAttribute('href', url));
    } catch (e) { /* the joker keeps its plain frame */ }
    crown.visible = false; shadow.visible = true; puffs.forEach(s => s.visible = true); mr.setPixelRatio(DPRM); BW = BH = 0;
  })();
  requestAnimationFrame(frame);
}


window.__app = { renderer, composer, scene, camera, island, bloom, THREE, buddy, updateBuddy, reveal };
window.__ready = true;
