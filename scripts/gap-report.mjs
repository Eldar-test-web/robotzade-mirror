// What stops the copy from looking 1:1: refs inside the shop's own pages that point at
// files which are not on disk. Groups them and rebuilds a fetchable URL for each.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ?? 'C:/Users/User/Downloads/robotzade-mirror';
const SHOPS = /^(robotzade\.az|www\.robotzade\.az|robotzade\.tsoft\.biz|robotzade\.tsoftstatic\.com|www\.robotzade\.com)$/i;
const ATTR_RE = /\b(href|src|data-src|data-original|data-bg|poster)\s*=\s*(["'])([^"']*)\2/gi;
const SRCSET_RE = /\bsrcset\s*=\s*(["'])([^"']*)\1/gi;
const CSS_URL_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
const EXT_ONLY = /^(https?:|data:|blob:|about:|javascript:|mailto:|tel:|#)/i;
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

function urlFor(localPath) {
  const rel = path.relative(ROOT, localPath).split(path.sep);
  const host = rel.shift();
  let segs = rel;
  if (segs.at(-1) === 'index.html') segs = segs.slice(0, -1);
  else segs = segs.map((s, i) => (i === segs.length - 1 ? s.replace(/__[0-9a-f]{8}(?=\.[a-z0-9]*$|$)/, '') : s.replace(/__[0-9a-f]{8}$/, '')));
  return `https://${host}/${segs.map((s) => s.replace(/__([0-9a-f]{8})(?=$|[./])/g, '')).join('/')}`;
}

const miss = new Map();
let shopRefs = 0, shopMissing = 0, pagesScanned = 0;
for (const f of walk(ROOT)) {
  const host = path.relative(ROOT, f).split(path.sep)[0];
  if (!SHOPS.test(host) || !/\.(html?|css)$/i.test(f)) continue;
  pagesScanned++;
  const text = fs.readFileSync(f, 'utf8');
  const vals = [...text.matchAll(ATTR_RE)].map((m) => m[3])
    .concat([...text.matchAll(CSS_URL_RE)].map((m) => m[2]))
    .concat([...text.matchAll(SRCSET_RE)].flatMap((m) => m[2].split(',').map((s) => s.trim().split(/\s+/)[0])))
    .filter((v) => v && !EXT_ONLY.test(v));
  for (const v of vals) {
    const clean = decode(v.split(/[?#]/)[0]);
    if (!clean || clean.endsWith('/')) continue;
    const abs = path.resolve(path.dirname(f), clean);
    if (!/^https?:|^file:/.test(v) && path.relative(ROOT, abs).startsWith('..')) continue;
    shopRefs++;
    if (fs.existsSync(abs)) continue;
    shopMissing++;
    const target = abs.endsWith(path.sep) ? abs : abs;
    const key = path.relative(ROOT, target).split(path.sep)[0];
    if (!miss.has(key)) miss.set(key, new Map());
    miss.get(key).set(target, urlFor(target));
  }
}
const rows = [...miss].map(([h, m]) => ({ host: h, n: m.size })).sort((a, b) => b.n - a.n);
console.log(`shop pages/css scanned=${pagesScanned}  refs=${shopRefs}  missing=${shopMissing} (${(100 * shopMissing / Math.max(shopRefs, 1)).toFixed(2)}%)`);
for (const r of rows) console.log(`  ${String(r.n).padStart(6)}  ${r.host}`);
const out = [];
for (const m of miss.values()) for (const url of m.values()) out.push(url);
fs.writeFileSync(path.join(path.dirname(ROOT), 'gap-urls.txt'), [...new Set(out)].sort().join('\n') + '\n');
console.log(`fetch list -> ${path.join(path.dirname(ROOT), 'gap-urls.txt')} (${new Set(out).size} urls)`);
const sample = [...miss.values()].flatMap((m) => [...m.entries()]).slice(0, 12);
for (const [p, u] of sample) console.log('  MISS ' + p + '\n       -> ' + u);
