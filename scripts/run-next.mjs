import path from 'node:path';
import { spawn } from 'node:child_process';

const command = process.argv[2] || 'dev';
const rawExtraArgs = process.argv.slice(3);
const nextBin = path.resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

let cliPort = '';
let cliHost = '';
const filteredExtraArgs = [];

for (let i = 0; i < rawExtraArgs.length; i++) {
  const arg = rawExtraArgs[i];
  if (arg === '--port' || arg === '-p') {
    if (i + 1 < rawExtraArgs.length) cliPort = rawExtraArgs[++i];
    continue;
  }
  if (arg.startsWith('--port=')) {
    cliPort = arg.slice('--port='.length);
    continue;
  }
  if (arg === '--host' || arg === '-H' || arg === '--hostname') {
    if (i + 1 < rawExtraArgs.length) cliHost = rawExtraArgs[++i];
    continue;
  }
  if (arg.startsWith('--host=')) {
    cliHost = arg.slice('--host='.length);
    continue;
  }
  if (arg.startsWith('--hostname=')) {
    cliHost = arg.slice('--hostname='.length);
    continue;
  }
  filteredExtraArgs.push(arg);
}

const isAiStudioEnv = Boolean(
  process.env.APP_URL && /\.run\.app(?:[:/,]|$)/i.test(process.env.APP_URL)
);
const rawPort = cliPort || process.env.FRONTEND_PORT || process.env.PORT;
const port = String(
  !rawPort || (rawPort === '8080' && (command === 'dev' || isAiStudioEnv)) ? '3000' : rawPort
);
const host = String(cliHost || process.env.HOST || '0.0.0.0');
const env = { ...process.env, PORT: port };

let args;
if (command === 'build') {
  env.NODE_ENV = 'production';
  args = [nextBin, 'build', ...filteredExtraArgs];
} else if (command === 'start') {
  env.NODE_ENV = 'production';
  args = [nextBin, 'start', '-p', port, '-H', host, ...filteredExtraArgs];
} else {
  args = [nextBin, 'dev', '-p', port, '-H', host, ...filteredExtraArgs];
}

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
