const { execSync } = require('child_process');
const path = require('path');

const clientDir = path.join(__dirname, '../client');

console.log('📦 Installing client dependencies...');
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

console.log('⚡ Building Vite client application...');
execSync('node node_modules/vite/bin/vite.js build', { cwd: clientDir, stdio: 'inherit' });

console.log('✅ Production bundle ready in client/dist!');
