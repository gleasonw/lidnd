import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'desktop-dev-csp',
    transformIndexHtml(html, context) {
      return context.server ? html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/, '') : html;
    },
  }],
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist/renderer', emptyOutDir: true },
});
