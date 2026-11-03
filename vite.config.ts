import { defineConfig } from 'vite';

// esnext: main.ts uses top-level await (waits for the Marty model before revealing the scene).
export default defineConfig({
  build: { target: 'esnext', chunkSizeWarningLimit: 1500 },
});
