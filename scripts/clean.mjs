import fs from 'node:fs';
import path from 'node:path';

const targets = [
  'dist',
  '.next',
  'server/dist',
  'tsconfig.tsbuildinfo',
  'server/tsconfig.tsbuildinfo',
];

for (const rel of targets) {
  const fullPath = path.resolve(process.cwd(), rel);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`Removed ${rel}`);
  }
}
