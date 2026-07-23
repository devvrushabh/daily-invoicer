import { defineConfig } from 'vite';

// Vite Configuration - Relative Base Path for Electron & Web Hosting Compatibility
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
