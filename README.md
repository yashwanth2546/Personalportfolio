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
