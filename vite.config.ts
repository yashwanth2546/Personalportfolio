import { defineConfig } from 'vite';

// esnext: main.ts uses top-level await (waits for the Nathan model before revealing the scene).
// base: GitHub Pages serves this repo at /Personalportfolio/; local dev stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Personalportfolio/' : '/',
  build: { target: 'esnext', chunkSizeWarningLimit: 1500 },
}));
