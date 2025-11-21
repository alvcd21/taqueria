import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Aseguramos que coincida con lo que espera server.js
    emptyOutDir: true,
  }
});