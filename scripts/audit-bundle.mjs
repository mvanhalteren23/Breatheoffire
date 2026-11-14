import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const distDir = path.resolve(process.cwd(), 'dist', 'assets');
if (!fs.existsSync(distDir)) {
  console.error('dist/assets directory not found. Run `vite build` first.');
  process.exit(1);
}

const files = fs.readdirSync(distDir).sort();
let totalRaw = 0;
let totalGzip = 0;
let oversizedJsCount = 0;

console.log('=== Production Vite Bundle Audit (dist/assets) ===');
for (const file of files) {
  const fullPath = path.join(distDir, file);
  const buf = fs.readFileSync(fullPath);
  const gz = zlib.gzipSync(buf, { level: 9 });
  totalRaw += buf.length;
  totalGzip += gz.length;
  const rawKb = (buf.length / 1000).toFixed(2);
  const gzKb = (gz.length / 1000).toFixed(2);
  if (file.endsWith('.js') && buf.length > 500_000) {
    oversizedJsCount += 1;
  }
  console.log(`- ${file}: ${rawKb} kB (gzip: ${gzKb} kB)`);
}
console.log(
  `TOTAL ASSETS: ${(totalRaw / 1000).toFixed(2)} kB (gzip: ${(totalGzip / 1000).toFixed(2)} kB) | Chunks > 500 kB: ${oversizedJsCount}`,
);
if (oversizedJsCount > 0) {
  process.exitCode = 1;
}
