import 'dotenv/config';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const command = process.argv[2] || 'dev';
const rawExtraArgs = process.argv.slice(3);
const nextBin = path.resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const tsxBin = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
const serverEntry = path.resolve(process.cwd(), 'server', 'index.ts');

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
const frontendPort = String(
  !rawPort || (rawPort === '8080' && (command === 'dev' || isAiStudioEnv)) ? '3000' : rawPort
);
const frontendHost = String(cliHost || process.env.HOST || '0.0.0.0');
const backendPort = String(process.env.BACKEND_PORT || '4000');
const externalBackend =
  process.env.USE_EXTERNAL_BACKEND === '1' &&
  Boolean(
    process.env.API_BACKEND_URL &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(process.env.API_BACKEND_URL.trim())
  );

const env = {
  ...process.env,
  PORT: frontendPort,
  FRONTEND_PORT: frontendPort,
  BACKEND_PORT: backendPort,
  ...(externalBackend ? {} : { USE_LOCAL_BACKEND: '1' }),
};

const children = [];
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        // Ignore already-exited child
      }
    }
  }
  setTimeout(() => process.exit(exitCode), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function waitForPort(port, host = '127.0.0.1', timeoutMs = 10000) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      if (shuttingDown) return resolve(false);
      const socket = net.createConnection({ port: Number(port), host });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

async function main() {
  if (!externalBackend && fs.existsSync(serverEntry)) {
    const serverEnv = {
      ...env,
      PORT: backendPort,
    };
    const serverChild = spawn(process.execPath, [tsxBin, serverEntry], {
      stdio: 'inherit',
      env: serverEnv,
    });
    children.push(serverChild);
    serverChild.on('exit', (code) => {
      if (!shuttingDown && code && code !== 0) {
        console.warn(`Express backend exited with code ${code}`);
      }
    });
    await waitForPort(backendPort, '127.0.0.1', 10000);
  }

  const nextArgs =
    command === 'start'
      ? [nextBin, 'start', '-p', frontendPort, '-H', frontendHost, ...filteredExtraArgs]
      : [nextBin, 'dev', '-p', frontendPort, '-H', frontendHost, ...filteredExtraArgs];

  const nextEnv = {
    ...env,
    ...(command === 'start' ? { NODE_ENV: 'production' } : {}),
  };

  const nextChild = spawn(process.execPath, nextArgs, {
    stdio: 'inherit',
    env: nextEnv,
  });
  children.push(nextChild);

  nextChild.on('exit', (code, signal) => {
    if (signal) {
      shutdown(0);
      return;
    }
    shutdown(code ?? 0);
  });
}

main();
