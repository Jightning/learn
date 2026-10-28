import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';

export const publicFiles = ['README.md', 'ledger.py', 'test_ledger.py',
  'data/base.csv', 'data/fresh.csv', 'data/delayed.csv', 'data/empty.csv'];
export const packageName = 'cost-ledger-1.0.0.zip';

// Explicit allowlist: reviewer solutions/checks cannot enter by directory walk.
export function ledgerPackage() {
  const files = Object.fromEntries(publicFiles.map(path => [path,
    [new Uint8Array(readFileSync(new URL(`public/${path}`, import.meta.url))), { mtime: new Date(2020, 0, 1) }]]));
  const bytes = zipSync(files, { level: 9 });
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('usage: node examples/mastery-cost-ledger/package.mjs /absolute/output.zip');
  const { bytes, sha256 } = ledgerPackage();
  writeFileSync(process.argv[2], bytes);
  console.log(`${sha256}  ${process.argv[2]}`);
}
