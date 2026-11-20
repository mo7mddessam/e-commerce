// Syntax-checks every JS file and verifies every relative import (and imported name) resolves.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'js');
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } })(root);
let bad = 0;
const exportsOf = (src) => new Set([...src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/g)].map((m) => m[1]));
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad++; console.error(`SYNTAX ${f}\n${e.stderr}`); continue; }
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)) {
    const target = resolve(dirname(f), m[2]);
    let tsrc; try { tsrc = readFileSync(target, 'utf8'); } catch { bad++; console.error(`MISSING ${m[2]} in ${f}`); continue; }
    const ex = exportsOf(tsrc);
    for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (!ex.has(n)) { bad++; console.error(`NO EXPORT ${n} from ${m[2]} (in ${f})`); }
  }
}
console.log(bad ? `${bad} problem(s)` : `OK — ${files.length} modules`);
process.exit(bad ? 1 : 0);
