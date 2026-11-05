# Portfolio

Vite + TypeScript. Three.js (v0.160, pinned) for the 3D hero, Lenis for smooth scroll. No framework: the page is imperative DOM + WebGL.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ — host anywhere
npm run preview  # serve dist/ locally
```

- `index.html` — SEO meta, JSON-LD, page markup
- `src/styles/main.css` — all styles
- `src/main.ts` — page sections, scroll, card game, case studies, the overlay character (`@ts-nocheck` until it is split into typed modules)
- `src/data/` — inlined card-face SVGs and placeholder photos (swap `photos.ts` for real images)
- `public/assets/` — `marty/` (the character model), `dragon/` (the boss), `work/` (case-study images and reels)

## Hero playground

`src/forest.ts` is the hero: a 3D voxel jungle that fills the screen. Walk Nathan Drake with WASD (relative to the camera; hold the right mouse button and drag to turn it, wheel zooms once the forest is focused; Shift runs, E acts, Q waves, a joystick on touch). A fox follows him around. The quest lives in `src/forest-quest.ts`: find the sword on its shrine in the jungle, wake the dragon at its lair (left click or E swings, F rolls, jump clears the fire, three hearts), then open the chest, which opens the contact form. `FOREST` in `src/main.ts` switches the whole thing off to bring the old isometric room back.

## Nathan Drake's model

`public/assets/marty/marty.glb` is Nathan Drake (the voxel explorer: 1,200 triangles, 424 KB). If it can't load, the blocky built-in Nathan Drake (`buildMartyBlocks` in `src/main.ts`) takes over.
`martyFromGLB` rebuilds the file's joint tree into the rig the page animates, so a replacement file needs these nodes (names exact):
`Pelvis`, `Torso`, `Neck`, `Head`, `Left/RightShoulder`, `Left/RightElbow`, `Left/RightHand`, `Left/RightHip`, `Left/RightKnee`.
Each limb's meshes hang straight down its joint's local -Y; shoulders sit under `Torso`, elbows under shoulders, hands under elbows. The file is 3.81 tall (scaled to 1.86 on load).
`marty-old.glb` is the previous voxel Nathan Drake, kept for reference only.
