import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves the site under /<repo>/; the deploy workflow sets BASE_PATH. Locally it's '/'.
  base: process.env.BASE_PATH || '/',
  // Fixed port so the extension's bridge content script (matches localhost:5173) always finds the dashboard.
  server: { port: 5173, strictPort: true },
});
