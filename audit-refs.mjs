// Compare local-reference integrity between the source mirror and the lean copy.
import fs from 'node:fs';
import path from 'node:path';

const TEXT_RE = /\.(html?|css|js|txt|json|xml|svg)$/i;
const ATTR_RE = /\b(href|src|data-src|data-original|data-bg|poster|action)\s*=\s*(["'])([^"']*)\2/gi;
const SRCSET_RE = /\bsrcset\s*=\s*(["'])([^"']*)\1/gi;
const CSS_URL_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
const EXT_ONLY = /^(https?:|data:|blob:|about:|javascript:|mailto:|tel:|#)/i;
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
function audit(root) {
  let checked = 0, broken = 0;
  const byHost = new Map(), worst = new Map();
  for (const f of walk(root).filter((x) => TEXT_RE.test(x))) {
    const host = path.relative(root, f).split(path.sep)[0];
    const text = fs.readFileSync(f, 'utf8');
    const vals = [...text.matchAll(ATTR_RE)].map((m) => m[3])
      .concat([...text.matchAll(CSS_URL_RE)].map((m) => m[2]))
      .concat([...text.matchAll(SRCSET_RE)].flatMap((m) => m[2].split(',').map((s) => s.trim().split(/\s+/)[0])))
      .filter((v) => v && !EXT_ONLY.test(v));
    let b = 0;
    for (const v of vals) {
      const clean = decode(v.split(/[?#]/)[0]);
      if (!clean || clean.endsWith('/')) continue;
      checked++;
      if (!fs.existsSync(path.resolve(path.dirname(f), clean))) { broken++; b++; }
    }
    if (b) {
      byHost.set(host, (byHost.get(host) || 0) + b);
      worst.set(path.relative(root, f), b);
    }
  }
  return { root, checked, broken, byHost, worst };
}
for (const root of process.argv.slice(2)) {
  const r = audit(root);
  console.log(`\n### ${path.basename(root)}  refs=${r.checked} broken=${r.broken} (${(100 * r.broken / Math.max(r.checked, 1)).toFixed(2)}%)`);
  console.log('  broken by host:');
  [...r.byHost].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([h, n]) => console.log(`    ${String(n).padStart(7)}  ${h}`));
  console.log('  worst files:');
  [...r.worst].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([f, n]) => console.log(`    ${String(n).padStart(6)}  ${f}`));
}
