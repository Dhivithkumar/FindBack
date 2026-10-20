import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :5000; Vite forwards /api and /uploads to it
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
