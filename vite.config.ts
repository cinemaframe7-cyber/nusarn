
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Essential for Render Static Sites
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // Faster, built-in to Vite, and fixes your build error
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          genai: ['@google/genai'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
