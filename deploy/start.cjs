const { spawn } = require('node:child_process');
const path = require('node:path');
const { bootstrapAdmin } = require('./bootstrap-admin.cjs');
const root = path.resolve(__dirname, '..');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1500).unref();
}
function launch(file, args, cwd, env) {
  const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: 'inherit' });
  children.push(child);
  child.once('error', (error) => { console.error(error.message); stop(1); });
  child.once('exit', (code) => { if (!stopping) stop(code || 1); });
}
async function start() {
  const port = process.env.PORT || '10000';
  const apiPort = process.env.API_PORT || '3000';
  if (port === apiPort) throw new Error('PORT y API_PORT deben ser distintos.');
  await bootstrapAdmin();
  launch('dist/main.js', [], path.join(root, 'backend'), { ...process.env, PORT: apiPort, HOST: '127.0.0.1' });
  let healthy = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/`, { signal: AbortSignal.timeout(1000) });
      const body = await response.json();
      if (response.ok && body.ok && body.service === '81cc-backend') { healthy = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!healthy) throw new Error('El backend no completó su inicio.');
  if (stopping) return;
  launch(path.join(root, 'frontend/node_modules/next/dist/bin/next'), ['start', '-H', '0.0.0.0', '-p', port], path.join(root, 'frontend'), process.env);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
start().catch((error) => { console.error(error.message); stop(1); });
