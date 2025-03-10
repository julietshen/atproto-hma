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
    // Set the development server port to 3000
    port: 3000,
  },
  
  // Build output configuration
  build: {
    // Set the output directory for production builds
    outDir: 'dist',
  },
}); 