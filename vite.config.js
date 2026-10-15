import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true,
    cors: false,
    proxy: { '/upstream/': { target: 'https://cuberto.com', changeOrigin: true,
      rewrite: path => path.replace(/^\/upstream/, '') } }
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022' }
});
