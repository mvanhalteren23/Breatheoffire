import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    exclude: ['vitest'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/') || id.includes('node_modules/@react-three/')) {
            return 'three-vendor';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@capacitor/')) {
            return 'capacitor-vendor';
          }
          if (id.includes('node_modules/zustand/') || id.includes('node_modules/miniplex/')) {
            return 'state-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
