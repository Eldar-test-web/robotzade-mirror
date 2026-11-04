#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes(`--${k}`);

const ORIGIN = arg('origin', 'https://robotzade.az');
const OUT = path.resolve(arg('out', 'C:/Users/User/Downloads/robotzade-mirror'));
const PAGE_CONC = Number(arg('concurrency', 2));
const PAGE_DELAY = Number(arg('delay', 900));
const ASSET_CONC = Number(arg('asset-concurrency', 4));
const ASSET_DELAY = Number(arg('asset-delay', 120));
const MAX_PAGES = Number(arg('max-pages', 0));
const MAX_ASSETS = Number(arg('max-assets', 0));
const MAX_RETRY = Number(arg('retries', 12));
const PROBE_EVERY = Number(arg('probe-every', 45)) * 1000;
const PAGES_ONLY = has('pages-only');
const NO_DEFER = has('no-defer');
const CANON = has('canon-orig');
const KEEP_ORIG = arg('keep-orig', '') ? new RegExp(arg('keep-orig'), 'i') : null;
const origOf = (url) => (url.match(/^https?:\/\/web\.archive\.org\/web\/\d+[a-z_]*\/(https?:\/\/.+)$/i) || [, url])[1];
const originHost = new URL(ORIGIN).hostname;
// Product pages link out to vendors' whole sites (dfrobot, adafruit …). Chasing those turns
// ~3k shop pages into 100k+ foreign ones, so only their files are fetched, never their pages.
const OWN_HOSTS = /(^|\.)(robotzade\.(az|com|biz)|tsoft\.biz|tsoftstatic\.com|tsoft360\.com|tsoftapps\.com|boxcdn\.net)$/i;
const safeHost = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HDRS = { 'User-Agent': UA, 'Accept-Language': 'az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7', Accept: '*/*' };

const ASSET_EXT = new Set(['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico', 'cur', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mp3', 'wav', 'pdf', 'json', 'xml', 'map', 'webmanifest']);
const PAGE_EXT = new Set(['html', 'htm', 'xhtml']);
const BLOCK_PATH = ['/ajax.php', '/Cache/GelismisVitrin/', '/SecCode.php', '/AsiriYogunluk.php'];
const OUTBOUND = /(^|\.)(doubleclick|google-analytics|googletagmanager|facebook\.com|fb\.com|twitter\.com|x\.com|instagram\.com|youtube\.com|youtu\.be|linkedin\.com|tiktok\.com)$|wa\.me|t\.me|maps\.google/i;
const ERROR_MARK = /cf-error-details|error code:?\s*520|<title>Not Found<\/title>|Ray ID:/i;
const ASSET_HINT = /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|ttf|eot|mp4|webm|mp3|pdf)(\?|$)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString();
const clean = (s) => s.replace(/[<>:"|?*]/g, '_').replace(/\s+/g, '_').replace(/[. ]+$/, '');

function mapUrl(url, kind) {
  let u; try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  let p; try { p = decodeURIComponent(u.pathname); } catch { p = u.pathname; }
  if (BLOCK_PATH.some((b) => p.startsWith(b))) return null;
  const segs = p.split('/').filter(Boolean).map((s) => clean(s) || '_');
  const last = segs.at(-1) || '';
  const ext = (path.extname(last).slice(1) || '').toLowerCase();
  const kept = u.search.replace(/^\?/, '').split('&').filter((kv) => kv && !/^(v|ver|t|cb|hash|rand|_)=/i.test(kv)).join('&');
  const tag = kept ? `__${crypto.createHash('md5').update(kept).digest('hex').slice(0, 8)}` : '';
  const hint = kind === 'asset' && !ASSET_EXT.has(ext) ? (/css/i.test(last) ? 'css' : /js/i.test(last) ? 'js' : '') : '';
  const guess = ext || hint;
  // A URL with no asset extension must land in the same place whichever pool queued
  // it, otherwise "<seg>" gets written next to an existing "<seg>/index.html" dir.
  let isPage;
  if (ASSET_EXT.has(ext)) isPage = false;
  else if (PAGE_EXT.has(ext)) isPage = true;
  else if (ext) isPage = kind !== 'asset';
  else isPage = !hint;
  let rel;
  if (!segs.length) rel = `index${tag}.html`;
  else if (isPage) rel = path.posix.join(...segs.slice(0, -1), `${last.replace(/\.[a-z]+$/i, '')}${tag}`, 'index.html');
  else rel = path.posix.join(...segs.slice(0, -1), `${path.basename(last, path.extname(last))}${tag}${guess ? `.${guess}` : ''}`);
  const host = u.hostname.toLowerCase();
  let full = path.posix.join(host, rel);
  if (full.length > 180) full = path.posix.join(host, crypto.createHash('md5').update(p + kept).digest('hex').slice(0, 32) + (isPage ? '/index.html' : `.${guess || 'bin'}`));
  return { host, file: path.join(OUT, full), relPath: full, isPage };
}

// Windows gives mkdir an EEXIST (not ENOTDIR) when an ancestor of the path is a plain file,
// and a directory sitting where we want a file means the URL is already stored as a page.
// Resolve both cases to a path that is definitely writable; fall back to a flattened name.
function writableTarget(preferred) {
  const flat = (p) => path.join(OUT, p.slice(OUT.length + 1).split(/[\\/]/).join('__'));
  const stat = (p) => { try { return fs.statSync(p); } catch (e) { return ['ENOENT', 'ENOTDIR'].includes(e.code) ? null : e; } };
  let file = preferred;
  for (let g = 0; g < 8; g++) {
    const st = stat(file);
    if (st instanceof Error) return flat(preferred);
    if (st?.isDirectory()) { file = path.join(file, 'index.html'); continue; }
    const dir = path.dirname(file);
    const dst = stat(dir);
    if (dst instanceof Error) return flat(preferred);
    if (dst?.isDirectory()) return file;
    if (dst?.isFile()) { file = path.join(path.dirname(dir), `${path.basename(dir)}__${path.basename(file)}`); continue; }
    try { fs.mkdirSync(dir, { recursive: true }); }
    catch (e) { if (!['EEXIST', 'ENOENT', 'ENOTDIR'].includes(e.code)) return flat(preferred); }
  }
  return flat(preferred);
}

const ATTR_RE = /\b(href|src|data-src|data-original|data-bg|poster|action|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const CSS_URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

function extractRefs(text, isCss) {
  const out = new Set();
  if (isCss) { for (const m of text.matchAll(CSS_URL_RE)) out.add(m[1].trim()); return [...out]; }
  for (const m of text.matchAll(ATTR_RE)) {
    const val = m[2] ?? m[3];
    if (!val) continue;
    const pieces = m[1].toLowerCase() === 'srcset' ? val.split(',').map((s) => s.trim().split(/\s+/)[0]) : [val];
    for (const piece of pieces) if (piece && !/^(data:|blob:|about:|javascript:|mailto:|tel:|\#)/i.test(piece)) out.add(piece);
  }
  for (const m of text.matchAll(CSS_URL_RE)) out.add(m[1].trim());
  return [...out];
}

const absOf = (base, ref) => { try { return new URL(ref.trim(), base).href.split('#')[0]; } catch { return null; } };
const relRef = (fromFile, toFile) => {
  let r = path.relative(path.dirname(fromFile), toFile).split(path.sep).join('/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r.replace(/ /g, '%20');
};

const seen = new Map();
const canonSeen = new Set();
const queue = [];
function enqueue(url, kind) {
  if (!url || seen.has(url)) return;
  if (KEEP_ORIG && !KEEP_ORIG.test(origOf(url))) return;
  const k = origOf(url);
  if (CANON && canonSeen.has(k)) return;
  const m = mapUrl(url, kind);
  if (!m) return;
  if (m.host !== originHost && OUTBOUND.test(m.host)) return;
  if (PAGES_ONLY && kind === 'asset') return;
  if (kind === 'page' && url.includes('?') && m.host === originHost && !/page|sayfa|p=/i.test(url)) return;
  canonSeen.add(k);
  seen.set(url, { ...m, url, kind, done: false, tries: 0 });
  queue.push(url);
}

function addSeedUrl(url) {
  const m = mapUrl(url, null);
  enqueue(url, ASSET_HINT.test(url) || !m?.isPage ? 'asset' : 'page');
}

function rewrite(text, base, fromFile, isCss) {
  const swap = (v) => { const a = absOf(base, v); const r = a && seen.get(a); return r?.file ? relRef(fromFile, r.file) : v; };
  if (isCss) return text.replace(CSS_URL_RE, (w, v) => w.replace(v, swap(v)));
  return text.replace(ATTR_RE, (w, name, d1, s1) => {
    const val = d1 ?? s1;
    if (!val) return w;
    const next = name.toLowerCase() === 'srcset'
      ? val.split(',').map((s) => { const t = s.trim().split(/\s+/); t[0] = swap(t[0]); return t.join(' '); }).join(', ')
      : swap(val);
    return w.replace(val, next);
  });
}

let pages = 0, assets = 0, bytes = 0, ok200 = 0;
const failures = new Map();
const started = Date.now();
const DONE = path.join(OUT, '.done.txt');
fs.mkdirSync(OUT, { recursive: true });
const doneSet = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[0]) : []);

async function raw(url, timeout = 40000) {
  try {
    const r = await fetch(url, { headers: HDRS, redirect: 'follow', signal: AbortSignal.timeout(timeout) });
    const buf = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
    return { ok: r.ok, status: r.status, buf, ctype: r.headers.get('content-type') || '' };
  } catch { return { ok: false, status: 0, buf: null, ctype: '' }; }
}

async function sitemapUrls() {
  const urls = [];
  const idx = await raw(`${ORIGIN}/sitemap.xml`);
  if (!idx.ok) return null;
  for (const s of [...idx.buf.toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())) {
    const r = await raw(s);
    if (r.ok) for (const m of r.buf.toString().matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1].trim());
    await sleep(250);
  }
  urls.push(`${ORIGIN}/`);
  return urls;
}

let originUp = false, probing = false, sitemapDone = false;
const deferred = [];
const deferredSet = new Set();

async function checkOrigin() {
  const r = await raw(`${ORIGIN}/`, 25000);
  return r.ok && !ERROR_MARK.test(r.buf?.subarray(0, 3000).toString('utf8') || '');
}

async function releaseDeferred() {
  const n = deferred.length;
  for (const u of deferred) queue.push(u);
  deferred.length = 0;
  deferredSet.clear();
  if (n) console.log(`${ts()} released ${n} deferred pages`);
  if (!sitemapDone) {
    sitemapDone = true;
    const urls = has('no-sitemap') ? [] : await sitemapUrls();
    if (urls && urls.length) { const b = queue.length; urls.forEach(addSeedUrl); console.log(`${ts()} sitemap merged: +${queue.length - b} urls`); }
    else if (!has('no-sitemap')) { sitemapDone = false; console.log(`${ts()} sitemap unavailable, retry next up-cycle`); }
  }
}

const prober = setInterval(async () => {
  if (probing) return;
  probing = true;
  const up = await checkOrigin();
  probing = false;
  if (up && !originUp) { originUp = true; console.log(`${ts()} ORIGIN UP`); await releaseDeferred(); }
  else if (!up && originUp) { originUp = false; console.log(`${ts()} ORIGIN DOWN again`); }
  else if (up && !sitemapDone) await releaseDeferred();
}, PROBE_EVERY);

const seedFile = arg('seed-file', '');
if (seedFile && fs.existsSync(seedFile)) fs.readFileSync(seedFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean).forEach(addSeedUrl);
else for (const u of (await sitemapUrls()) || [`${ORIGIN}/`]) addSeedUrl(u);
console.log(`${ts()} seeded ${queue.length} urls -> ${OUT}`);
originUp = await checkOrigin();
console.log(`${ts()} initial origin state: ${originUp ? 'UP' : 'DOWN'}`);
if (originUp) await releaseDeferred();

let stop = false;
const cursors = { page: 0, asset: 0 };
async function worker(kind) {
  const delay = kind === 'asset' ? ASSET_DELAY : PAGE_DELAY;
  while (!stop) {
    let url;
    while (cursors[kind] < queue.length) {
      const u = queue[cursors[kind]++];
      const r = seen.get(u);
      if (r && !r.done && r.kind === kind) { url = u; break; }
    }
    if (!url) {
      if (queue.every((u) => seen.get(u).done)) break;
      await sleep(600);
      continue;
    }
    const rec = seen.get(url);
    if (doneSet.has(url)) { rec.done = true; continue; }
    if (kind === 'page' && MAX_PAGES && pages >= MAX_PAGES) { rec.done = true; continue; }
    if (kind === 'asset' && MAX_ASSETS && assets >= MAX_ASSETS) { rec.done = true; continue; }
    if (kind === 'page' && !originUp && !NO_DEFER) {
      if (!deferredSet.has(url)) { deferred.push(url); deferredSet.add(url); }
      await sleep(1000);
      continue;
    }
    const res = await raw(url);
    const head = res.buf ? res.buf.subarray(0, 4000).toString('utf8') : '';
    const bad = !res.ok || (/text\/html/i.test(res.ctype) && ERROR_MARK.test(head));
    if (bad) {
      rec.tries++;
      failures.set(url, res.status || 'conn');
      if (kind === 'page' && rec.host === originHost && !NO_DEFER) originUp = false;
      if (rec.tries > MAX_RETRY) { rec.done = true; continue; }
      if (kind === 'page' && !originUp && !NO_DEFER) { if (!deferredSet.has(url)) { deferred.push(url); deferredSet.add(url); } continue; }
      queue.push(url);
      continue;
    }
    failures.delete(url);
    const isCss = /\.css(\?|$)/i.test(rec.relPath) || /text\/css/i.test(res.ctype);
    const isHtml = /text\/html|application\/xhtml/i.test(res.ctype) || /<html|<!DOCTYPE/i.test(head);
    let body = res.buf;
    const file = writableTarget(rec.file);
    if ((isCss || isHtml) && (OWN_HOSTS.test(safeHost(url)) || /web\.archive\.org/i.test(url))) {
      let text = res.buf.toString('utf8');
      if (/web\.archive\.org/i.test(url)) text = text.replace(/<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi, '');
      for (const rf of extractRefs(text, isCss)) {
        const abs = absOf(url, rf);
        if (!abs) continue;
        const m = mapUrl(abs, null);
        if (!m) continue;
        const own = OWN_HOSTS.test(m.host) || /web\.archive\.org/i.test(m.host);
        const ext = (path.extname(new URL(abs).pathname).slice(1) || '').toLowerCase();
        if (!own && !ASSET_EXT.has(ext)) continue;
        enqueue(abs, ASSET_HINT.test(rf) || !m.isPage || !own ? 'asset' : 'page');
      }
      body = Buffer.from(rewrite(text, url, file, isCss), 'utf8');
    }
    fs.writeFileSync(file, body);
    fs.appendFileSync(DONE, `${url}\t${rec.relPath}\n`);
    bytes += body.length; ok200++; rec.done = true;
    isHtml && !isCss ? pages++ : assets++;
    await sleep(delay);
  }
}

const tick = setInterval(() => {
  const el = (Date.now() - started) / 1000;
  const remaining = queue.filter((u) => !seen.get(u).done).length;
  const rate = ok200 / Math.max(el, 1);
  fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({
    origin_up: originUp, pages, assets, queued: queue.length, remaining, deferred_pages: deferred.length,
    resumed_skipped: doneSet.size, mb: +(bytes / 1048576).toFixed(1), urls_failing: failures.size,
    s: Math.round(el), rate_per_s: +rate.toFixed(2), eta_s: rate ? Math.round(remaining / rate) : null, updated: ts(),
  }, null, 1));
  fs.writeFileSync(path.join(OUT, 'failures.tsv'), 'url\tstatus\n' + [...failures].map(([u, s]) => `${u}\t${s}`).join('\n'));
}, 15000);

await Promise.all([
  ...Array.from({ length: PAGE_CONC }, () => worker('page')),
  ...Array.from({ length: PAGES_ONLY ? 0 : ASSET_CONC }, () => worker('asset')),
]);
clearInterval(prober);
clearInterval(tick);
fs.writeFileSync(path.join(OUT, 'failures.tsv'), 'url\tstatus\n' + [...failures].map(([u, s]) => `${u}\t${s}`).join('\n'));
console.log(`${ts()} DONE pages=${pages} assets=${assets} queued=${queue.length} still_failing=${failures.size} mb=${(bytes / 1048576).toFixed(1)} s=${Math.round((Date.now() - started) / 1000)}`);
