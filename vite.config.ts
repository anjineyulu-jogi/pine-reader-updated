
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
        // Optional proxy configuration for local development
        proxy: {
            '/api': {
                target: 'http://localhost:3000', // Assuming proxy-server.js runs on 3000
                changeOrigin: true,
            }
        }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});
