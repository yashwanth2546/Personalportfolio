# Portfolio

Vite + TypeScript. Three.js (v0.160, pinned) for the 3D room, Lenis for smooth scroll. No framework: the page is imperative DOM + WebGL.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ — host anywhere
npm run preview  # serve dist/ locally
```

- `index.html` — SEO meta, JSON-LD, page markup
- `src/styles/main.css` — all styles
- `src/main.ts` — scene, scroll, card game, case studies (`@ts-nocheck` until it is split into typed modules)
- `src/data/` — inlined card-face SVGs and placeholder photos (swap `photos.ts` for real images)
- `public/assets/` — `.glb` models and textures

## Marty's model

`public/assets/marty/marty.glb` is loaded if it exists; otherwise the blocky built-in Marty (`buildMartyBlocks` in `src/main.ts`) is used.
The file needs a root node `Buddy` with these nodes (names exact): `Hips`, `Torso`, `Neck`, `Head`, `Leg_L`, `Leg_R`,
`Arm_L`, `Arm_R`, `UpperArm_L/R`, `Forearm_L/R`, `Hand_L/R`, `Cigarette` (anything he holds in his right hand).
Joints are in the file's own units: hips at y 0.8, shoulders at x ±0.36 / y 0.52, a 0.63 long arm, feet on y 0.
`marty-old.glb` is the previous voxel Marty, kept as a reference for that layout.
