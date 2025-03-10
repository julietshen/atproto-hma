import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Configuration
 * 
 * This configuration file sets up the development and build
 * environment for the PerchPics application.
 */
export default defineConfig({
  // Enable React support with default options
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 3000,
  },
  
  // Build output configuration
  build: {
    outDir: 'dist',
  },
}); 