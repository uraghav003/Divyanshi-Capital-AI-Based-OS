import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss()
    ],
    define: {
      'process.env.P1_EXEC_URL': JSON.stringify(env.P1_EXEC_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react') || id.includes('motion') || id.includes('@radix-ui') || id.includes('sonner')) {
                return 'vendor-ui';
              }
              if (id.includes('react-markdown')) {
                return 'vendor-markdown';
              }
              return 'vendor-misc';
            }
          },
        },
      },
    },
    server: {
      hmr: false,
      watch: {
        usePolling: true,
        interval: 100,
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
  };
});
