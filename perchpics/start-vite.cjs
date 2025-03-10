#!/usr/bin/env node

/**
 * This is a simple script to start Vite using CommonJS
 * It helps avoid ES module issues with certain Node.js versions
 */
const { spawn } = require('child_process');
const path = require('path');

// Path to Vite executable
const vitePath = path.resolve(__dirname, 'node_modules', '.bin', 'vite');

// Spawn Vite process
const viteProcess = spawn(vitePath, [], {
  stdio: 'inherit',
  shell: true
});

// Handle process exit
viteProcess.on('close', (code) => {
  process.exit(code);
}); 