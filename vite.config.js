import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/heygen': {
        target: 'https://api.heygen.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/heygen/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward the API key from the original request
            const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
            if (apiKey) {
              proxyReq.setHeader('X-Api-Key', apiKey);
            }
            // For FormData, don't modify Content-Type - let it be set automatically
            if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
              // The boundary will be set automatically by the proxy
            }
          });
        },
      },
    },
  },
})
