// @ts-nocheck
// Marty's crown: a voxel version of the pixel-art crown (four pearl-tipped points per side, three-slab base, big ruby on the front).
// Built from boxes, base at y = 0, about 0.7 wide and 0.42 tall; the caller scales it to fit a head. `lift` moves it down so it can be centred as a prop.
let glowTex = null;
export function buildCrown(THREE, lift = 0) {
  const U = .05, g = new THREE.Group();
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .45, ...o });
  const gold = M('#f1b030', { emissive: '#ffa51a', emissiveIntensity: .45 }), goldD = M('#dc961c', { emissive: '#ff9a10', emissiveIntensity: .35 }), pearl = M('#fff4d6', { metalness: 0, roughness: .4, emissive: '#fff0c0', emissiveIntensity: .35 });
  const ruby = M('#e5333b', { metalness: .1, roughness: .25, emissive: '#ff2236', emissiveIntensity: .65 }), ink = M('#2a1a08', { metalness: 0, roughness: .8 });
  const bx = (w, h, d, x, y, z, m = gold) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), m); b.position.set(x * U, y * U - lift, z * U); b.castShadow = true; g.add(b); return b; };
  bx(15.4, .6, 15.4, 0, -.15, 0, ink);                                                              // the dark outline under the band
  for (const z of [-6.5, 6.5]) for (const x of [-4.6, 0, 4.6]) { bx(4.2, 1.5, 1.6, x, .75, z); bx(4.2, .4, 1.6, x, 1.3, z, pearl); }   // base slabs, white along the top
  for (const x of [-6.5, 6.5]) for (const z of [-2.4, 2.4]) { bx(1.6, 1.5, 4.4, x, .75, z); bx(1.6, .4, 4.4, x, 1.3, z, pearl); }
  for (const z of [-6, 6]) { bx(12.8, 2.1, 1.2, 0, 2.55, z, goldD); for (const x of [-4, 0, 4]) bx(3.2, 1, 1.2, x, 3.9, z, gold); }   // walls, raised between the points
  for (const x of [-6, 6]) bx(1.2, 2.1, 12.8, x, 2.55, 0, goldD);
  for (const z of [-6, 6]) {
    for (const x of [-2, 2]) { bx(1.5, 3.2, 1.2, x, 5.2, z); bx(1.9, 1.9, 1.9, x, 7.4, z, pearl); }                                  // the tall inner points, pearl on each
    for (const sd of [-1, 1]) { bx(1.4, 2.6, 1.2, sd * 6.3, 4.9, z).rotation.z = -sd * .25; bx(1.7, 1.7, 1.7, sd * 6.95, 6.5, z, pearl); }   // the outer points lean outwards
  }
  for (const z of [-6.8, 6.8]) { bx(2.8, 3.2, .4, 0, 2.6, z, ink); bx(2.2, 2.6, .6, 0, 2.6, z * 1.02, ruby); }                           // big ruby front and back
  for (const x of [-6.8, 6.8]) { bx(.4, 2.8, 2.8, x, 2.5, 0, ink); bx(.6, 2.2, 2.2, x * 1.02, 2.5, 0, ruby); }                         // and one on each side
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,90,1)'); gr.addColorStop(.45, 'rgba(255,170,40,.35)'); gr.addColorStop(1, 'rgba(255,150,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .6 })); glow.scale.setScalar(1.5); glow.position.set(0, .2 - lift, 0); g.add(glow);
  return g;
}
