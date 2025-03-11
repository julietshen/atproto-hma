import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Configuration
 * 
 * This configuration file sets up the development and build
 * environment for the PerchPics application.
 */
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Default frontend port (3000 if not specified)
  const frontendPort = parseInt(env.FRONTEND_PORT || '3000', 10);
  
  // Get PDS URL for proxying
  const pdsHost = env.PDS_HOST || 'localhost';
  const pdsPort = env.PDS_PORT || '3002';
  const pdsUrl = `http://${pdsHost}:${pdsPort}`;
  
  console.log(`Frontend will run on port ${frontendPort}`);
  console.log(`Proxying API requests to ${pdsUrl}`);

  return {
    // Enable React support with default options
    plugins: [react()],
    
    // Development server configuration
    server: {
      port: frontendPort,
      strictPort: true, // Don't try other ports automatically
      proxy: {
        '/auth': {
          target: pdsUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        },
        '/photos': {
          target: pdsUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/webhooks': {
          target: pdsUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: pdsUrl,
          changeOrigin: true,
          secure: false,
        }
      },
    },
    
    // Define environment variables for client-side code
    define: {
      'import.meta.env.VITE_PDS_URL': JSON.stringify(pdsUrl),
    },
    
    // Build output configuration
    build: {
      outDir: 'dist',
    },
  
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
}); 