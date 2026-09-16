import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // The CRM is a local Flask app with no CORS headers, so the dev server
      // proxies it rather than the browser calling it cross-origin.
      '/crm': {
        target: 'http://127.0.0.1:5555',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/crm/, ''),
      },
    },
  },
});
