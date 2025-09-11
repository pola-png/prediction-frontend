// server.js
// This file is a workaround for Render's deployment process, which expects a server.js file.
// It simply executes the actual Next.js standalone server entry point.
const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', [path.join(__dirname, '.next/standalone/server.js')], {
  stdio: 'inherit',
  shell: false,
});

server.on('close', (code) => {
  process.exit(code);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
