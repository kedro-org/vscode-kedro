import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/index.jsx',
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/index.[ext]',
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 3030
  }
});
