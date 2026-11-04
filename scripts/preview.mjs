#!/usr/bin/env node
// Build a small, self-contained preview from a full mirror: entry pages + transitive asset closure.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };

const SRC = path.resolve(arg('src', 'C:/Users/User/Downloads/robotzade-lean'));
const OUT = path.resolve(arg('out', 'C:/Users/User/Downloads/robotzade-preview'));
const MAX_PAGES = Number(arg('max-pages', 60));
const MAX_MB = Number(arg('max-mb', 90));

const ATTR_RE = /\b(href|src|data-src|data-original|data-bg|poster|action)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const SRCSET_RE = /\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const CSS_URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

const skip = (ref) =>
  /^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(ref) ||
  /^https?:\/\//i.test(ref) ||
  /^\/\//.test(ref);

function resolveRefs(file, isCss) {
  const text = fs.readFileSync(file, 'utf8');
  const out = new Set();
  if (isCss) {
    for (const m of text.matchAll(CSS_URL_RE)) out.add(m[1].trim());
    return [...out];
  }
  for (const m of text.matchAll(ATTR_RE)) {
    const v = m[2] ?? m[3];
    if (v && !skip(v)) out.add(v.split('?')[0].split('#')[0]);
  }
  for (const m of text.matchAll(SRCSET_RE)) {
    for (const part of (m[1] ?? '').split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u && !skip(u)) out.add(u.split('?')[0]);
    }
  }
  // inline <style> blocks reference fonts/images too
  for (const blk of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const m of blk[1].matchAll(CSS_URL_RE)) out.add(m[1].trim().split('?')[0]);
  }
  return [...out];
}

function localTarget(fromFile, ref) {
  if (skip(ref)) return null;
  const cleanRef = ref.replace(/[<>]/g, '');
  let p;
  if (cleanRef.startsWith('/')) p = path.join(SRC, cleanRef.replace(/^\/+/, ''));
  else p = path.resolve(path.dirname(fromFile), cleanRef);
  const rel = path.relative(SRC, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.replace(/\\/g, '/');
}

const shopDir = 'robotzade.az';
const entries = fs.readFileSync(path.resolve(arg('entries', 'preview-entries.txt')), 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean)
  .map((e) => `${shopDir}/${e.replace(/^\/+/, '')}`);

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copied = new Set();
const queue = [];
let bytes = 0, pages = 0, assets = 0, missing = 0;

function add(rel, asPage) {
  if (!rel || copied.has(rel)) return;
  const abs = path.join(SRC, rel);
  let st;
  try { st = fs.statSync(abs); } catch { missing++; return; }
  if (st.isDirectory()) return;
  copied.add(rel);
  if (asPage && pages < MAX_PAGES) { queue.push(rel); return; }
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(abs, dest);
  bytes += st.size;
  if (asPage) pages++; else assets++;
  if (bytes > MAX_MB * 1048576) { console.log(`ABORT: exceeded ${MAX_MB} MB after ${copied.size} files`); process.exit(1); }
}

// entry pages are copied by the walk itself so their refs can be followed
for (const e of entries) {
  const abs = path.join(SRC, e);
  if (copied.has(e) || !fs.existsSync(abs)) continue;
  copied.add(e);
  queue.push(e);
}

while (queue.length) {
  const rel = queue.shift();
  const srcAbs = path.join(SRC, rel);
  const destAbs = path.join(OUT, rel);
  const isCss = rel.toLowerCase().endsWith('.css');
  const isHtml = /\.x?html$/i.test(rel);
  let refs;
  try { refs = resolveRefs(srcAbs, isCss); } catch { continue; }
  const keep = [];
  for (const r of refs) {
    const t = localTarget(srcAbs, r);
    if (!t) continue;
    const isLocalPage = /\.x?html$/i.test(t);
    if (isLocalPage && !isCss && t.startsWith(`${shopDir}/`)) keep.push(t);
    else add(t, false);
  }
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
  bytes += fs.statSync(srcAbs).size;
  pages++;
  // browse deeper only through the shop's own links, and only while under the cap
  for (const t of keep) if (pages + queue.length < MAX_PAGES) add(t, true);
}

// root redirect so the Pages URL opens the shop
fs.writeFileSync(path.join(OUT, 'index.html'),
`<!doctype html><html lang="az"><head><meta charset="utf-8">
<title>Robotzade - offline preview</title>
<meta http-equiv="refresh" content="0; url=${shopDir}/index.html">
<link rel="canonical" href="${shopDir}/index.html"></head>
<body style="font:16px system-ui;padding:2rem">
<a href="${shopDir}/index.html">Robotzade saytinin online nusxesi / Robotzade offline preview</a>
</body></html>`);

console.log(`${new Date().toISOString()} preview built -> ${OUT}`);
console.log(`pages=${pages} assets=${assets} files=${copied.size + 1} mb=${(bytes / 1048576).toFixed(1)} unresolved_refs=${missing}`);
