import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'pdf-lib': path.resolve(__dirname, 'node_modules/pdf-lib/dist/pdf-lib.js')
    }
  },
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // فصل المكتبات الكبيرة لتحسين الكاش وتقليل حجم الحزمة الأولى
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('/pdfjs-dist/') || id.includes('/pdf-lib/') || id.includes('/mammoth/') || id.includes('/jszip/')) return 'vendor-docs';
          return undefined;
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  }
});
