// Build a lean, shareable copy of the mirror: dedupe identical images, re-encode the
// heavy ones to WebP, rewrite every local reference path-aware. Source tree untouched.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

const SRC = 'C:/Users/User/Downloads/robotzade-mirror';
const DST = 'C:/Users/User/Downloads/robotzade-lean';
const FFMPEG = 'C:/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const WEBP_MIN = 30 * 1024;
const QUALITY = 80;
const JOBS = 6;
const SKIP = new Set(['.done.txt', 'progress.json', 'failures.tsv', 'seeds.txt', 'seeds-wayback.txt']);
const IMG_RE = /\.(png|jpe?g)$/i;
const TEXT_RE = /\.(html?|css|js|txt|json|xml|svg)$/i;
const ATTR_RE = /\b(href|src|data-src|data-original|data-bg|poster|action)\s*=\s*(["'])([^"']*)\2/gi;
const SRCSET_RE = /\bsrcset\s*=\s*(["'])([^"']*)\1/gi;
const CSS_URL_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
const EXT_ONLY = /^(https?:|data:|blob:|about:|javascript:|mailto:|tel:|#)/i;

const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
// The crawler also pulled whole vendor sites (sunfounder, shopify, dfrobot…) that only its own
// foreign pages use. Keep the shop's files plus any foreign FILE a shop page really displays.
const OWN_HOST = /^(robotzade\.(az|com|biz)|[a-z0-9.-]*tsoft[a-z0-9.-]*|fonts\.(googleapis|gstatic)\.com|[a-z0-9.-]*boxcdn\.net)$/i;
const hostOf = (f) => rel(f).split('/')[0];
const isOwn = (f) => OWN_HOST.test(hostOf(f));
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const srcOf = (dstPath) => path.join(SRC, path.relative(DST, dstPath));
const dstOf = (srcPath, name) => path.join(DST, path.relative(SRC, name ?? srcPath));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sizeOf = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => {
  const p = path.join(d, e.name);
  return s + (e.isDirectory() ? sizeOf(p) : fs.statSync(p).size);
}, 0);
const relRef = (fromFile, toFile) => {
  let r = path.relative(path.dirname(fromFile), toFile).split(path.sep).join('/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r.replace(/ /g, '%20');
};
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (SKIP.has(e.name) ? [] : [p]);
  });
}

const all = walk(SRC);
const own = all.filter(isOwn);
// one ref pass over the shop's own text files decides which foreign files earn a place
const wanted = new Set();
for (const f of own) {
  if (!TEXT_RE.test(f)) continue;
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const vals = [...text.matchAll(ATTR_RE)].map((m) => m[3])
    .concat([...text.matchAll(CSS_URL_RE)].map((m) => m[2]))
    .concat([...text.matchAll(SRCSET_RE)].flatMap((m) => m[2].split(',').map((s) => s.trim().split(/\s+/)[0])));
  for (const v of vals) {
    if (!v || EXT_ONLY.test(v)) continue;
    const clean = safeDecode(v.split(/[?#]/)[0]);
    if (!clean) continue;
    const abs = path.resolve(path.dirname(f), clean);
    if (abs.startsWith(SRC + path.sep)) wanted.add(abs);
  }
}
const files = all.filter((f) => isOwn(f) || wanted.has(f));
const dropped = all.length - files.length;
const keptForeign = files.length - own.length;
const images = files.filter((f) => IMG_RE.test(f));
const texts = files.filter((f) => TEXT_RE.test(f));
const srcMB = files.reduce((s, f) => s + fs.statSync(f).size, 0) / 1048576;
const allMB = all.reduce((s, f) => s + fs.statSync(f).size, 0) / 1048576;
const shopPages = own.filter((f) => hostOf(f) === 'robotzade.az' && /\.x?html$/i.test(f)).length;
say(`source ${files.length} of ${all.length} files / ${srcMB.toFixed(0)} MB of ${allMB.toFixed(0)} MB`);
say(`  shop pages=${shopPages} · kept ${keptForeign} referenced foreign files · dropped ${dropped} foreign files`);
say(`  ${images.length} png+jpg · ${texts.length} text`);

// 1. group images by content; canonical = largest copy
const byHash = new Map();
for (const f of images) {
  const h = crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(f);
}
const finalName = new Map();
const dupOf = new Map();
for (const group of byHash.values()) {
  group.sort((a, b) => (fs.statSync(b).size - fs.statSync(a).size) || (a.length - b.length));
  const canon = group[0];
  finalName.set(canon, fs.statSync(canon).size >= WEBP_MIN ? canon.replace(IMG_RE, '.webp') : canon);
  for (const loser of group.slice(1)) { dupOf.set(loser, canon); finalName.set(loser, finalName.get(canon)); }
}
const dupMB = [...dupOf.keys()].reduce((s, f) => s + fs.statSync(f).size, 0) / 1048576;
const toWebp = [...new Set([...finalName.keys()].filter((f) => !dupOf.has(f) && /\.webp$/i.test(finalName.get(f))))];
say(`dedupe ${dupOf.size} copies (-${dupMB.toFixed(1)} MB) · webp ${toWebp.length} unique images`);

// 2. copy the tree, skipping redundant copies (webp targets are written in step 3)
let copied = 0;
for (const f of files) {
  if (dupOf.has(f)) continue;
  const name = finalName.get(f) ?? f;
  if (name !== f) { copied++; continue; }
  const dest = dstOf(f);
  if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(f).size) { copied++; continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f, dest);
  copied++;
}
say(`copied ${copied} files -> ${DST}`);

// 3. re-encode; on failure keep the original image instead
let ok = 0, bad = [];
const q = [...toWebp];
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (q.length) {
    const f = q.shift();
    const webp = dstOf(f, finalName.get(f));
    fs.mkdirSync(path.dirname(webp), { recursive: true });
    if (fs.existsSync(webp) && fs.statSync(webp).size > 0 && fs.statSync(webp).size !== fs.statSync(f).size) { ok++; continue; }
    const code = await new Promise((res) => execFile(FFMPEG,
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', f, '-quality', String(QUALITY), webp],
      (e) => res(e ? 1 : 0)));
    if (code) {
      fs.rmSync(webp, { force: true });
      const keep = dstOf(f);
      fs.mkdirSync(path.dirname(keep), { recursive: true });
      fs.copyFileSync(f, keep);
      finalName.set(f, f);
      bad.push(rel(f));
    } else ok++;
    if ((ok + bad.length) % 500 === 0) say(`  webp ${ok + bad.length}/${toWebp.length}`);
  }
}));
say(`webp ok=${ok} fallback=${bad.length}`);

// 4. rewrite refs path-aware inside the DST copy
let touched = 0, mapped = 0;
function targetFor(rawVal, fromFile) {
  if (!rawVal || EXT_ONLY.test(rawVal)) return null;
  const clean = safeDecode(rawVal.split(/[?#]/)[0]);
  if (!clean) return null;
  const src = srcOf(path.resolve(path.dirname(fromFile), clean));
  if (!finalName.has(src)) return null;
  const target = dstOf(src, finalName.get(src));
  if (!fs.existsSync(target)) return null;
  mapped++;
  return relRef(fromFile, target);
}
for (const f of texts) {
  const dest = dstOf(f);
  if (!fs.existsSync(dest)) continue;
  const before = fs.readFileSync(dest, 'utf8');
  let after = before.replace(ATTR_RE, (m, attr, quot, val) => {
    const to = targetFor(val, dest);
    return to && to !== val ? `${attr}=${quot}${to}${quot}` : m;
  });
  after = after.replace(SRCSET_RE, (m, quot, val) => {
    const nv = val.split(',').map((s) => s.trim()).map((p) => {
      const [u, ...rest] = p.split(/\s+/);
      const to = targetFor(u, dest);
      return to ? [to, ...rest].join(' ') : p;
    }).join(', ');
    return nv !== val ? `srcset=${quot}${nv}${quot}` : m;
  });
  after = after.replace(CSS_URL_RE, (m, quot, val) => {
    const to = targetFor(val, dest);
    return to && to !== val ? `url(${quot}${to}${quot})` : m;
  });
  if (after !== before) { fs.writeFileSync(dest, after); touched++; }
}
say(`rewrote ${touched} text files, ${mapped} refs mapped`);

// 5. verify: every local ref inside DST must resolve
let checked = 0, broken = 0;
const misses = [];
for (const f of walk(DST).filter((x) => TEXT_RE.test(x))) {
  const text = fs.readFileSync(f, 'utf8');
  const vals = [...text.matchAll(ATTR_RE)].map((m) => m[3])
    .concat([...text.matchAll(CSS_URL_RE)].map((m) => m[2]))
    .concat([...text.matchAll(SRCSET_RE)].flatMap((m) => m[2].split(',').map((s) => s.trim().split(/\s+/)[0])));
  for (const v of vals) {
    if (!v || EXT_ONLY.test(v)) continue;
    const clean = safeDecode(v.split(/[?#]/)[0]);
    if (!clean || clean.endsWith('/')) continue;
    checked++;
    if (!fs.existsSync(path.resolve(path.dirname(f), clean))) {
      broken++;
      if (misses.length < 15) misses.push(`${rel(srcOf(f))}  ->  ${v}`);
    }
  }
}
const leanMB = sizeOf(DST) / 1048576;
console.log('\n=== LEAN BUILD ===');
for (const d of fs.readdirSync(DST, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  console.log(`${(sizeOf(path.join(DST, d.name)) / 1048576).toFixed(1).padStart(9)} MB  ${d.name}`);
}
console.log(`total ${leanMB.toFixed(1)} MB  (source ${srcMB.toFixed(0)} MB)  saved ${(srcMB - leanMB).toFixed(0)} MB`);
console.log(`refs checked=${checked} broken=${broken} (${(100 * broken / Math.max(checked, 1)).toFixed(2)}%)`);
for (const m of misses) console.log('  BROKEN ' + m);
