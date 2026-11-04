import fs from 'node:fs';

const NEW_TXT = 'C:/Users/User/Downloads/Robozade_inspect/Robozade/hts-cache/new.txt';
const OUT = 'C:/Users/User/Downloads/robotzade-mirror/seeds.txt';
const ORIGIN = 'https://robotzade.az';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const urls = new Set();
if (fs.existsSync(NEW_TXT)) {
  for (const line of fs.readFileSync(NEW_TXT, 'utf8').split('\n').slice(1)) {
    const u = line.split('\t')[7]?.trim();
    if (u && /^https?:\/\//.test(u) && !/\/(AsiriYogunluk|ajax|SecCode)\.php/i.test(u)) urls.add(u);
  }
}
const fromCache = urls.size;

const grab = async (u) => {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
};

const idx = await grab(`${ORIGIN}/sitemap.xml`);
const subs = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
for (const s of subs) {
  const t = await grab(s);
  for (const m of t.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
}
urls.add(`${ORIGIN}/`);

fs.mkdirSync('C:/Users/User/Downloads/robotzade-mirror', { recursive: true });
fs.writeFileSync(OUT, [...urls].join('\n'));
const pages = [...urls].filter((u) => new URL(u).hostname === 'robotzade.az' && !/\.(png|jpe?g|gif|webp|svg|ico|css|js|woff2?|ttf|mp4|pdf)(\?|$)/i.test(new URL(u).pathname));
console.log(`seeds.txt written: total=${urls.size} (from HTTrack cache=${fromCache}, sitemap subs=${subs.length}) html-pages=${pages.length} -> ${OUT}`);
