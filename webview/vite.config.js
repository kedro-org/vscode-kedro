import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'public/index.html',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].chunk.js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 3030
  }
});
