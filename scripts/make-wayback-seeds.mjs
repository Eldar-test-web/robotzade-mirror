import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdx(params) {
  const url = `https://web.archive.org/cdx/search/cdx?url=robotzade.az&matchType=domain&output=text&fl=timestamp,original,statuscode,mimetype${params}`;
  for (let a = 1; a <= 4; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
      if (r.ok) return await r.text();
      console.log(`  attempt ${a}: HTTP ${r.status}`);
    } catch (e) { console.log(`  attempt ${a}: ${e.name}`); }
    await sleep(4000 * a);
  }
  return '';
}

const best = new Map();
for (const year of [2022, 2023, 2024, 2025, 2026]) {
  const text = await cdx(`&from=${year}0101&to=${year}1231&filter=statuscode:200&collapse=urlkey&limit=12000`);
  let kept = 0;
  for (const line of text.split('\n').filter(Boolean)) {
    const f = line.trim().split(/\s+/);
    if (f.length < 4) continue;
    const [stamp, orig, code, mime] = f;
    if (code !== '200' || !/^text\/html/i.test(mime)) continue;
    const key = orig.replace(/\/+$/, '');
    if (!best.has(key) || best.get(key) < stamp) best.set(key, stamp);
    kept++;
  }
  console.log(`${year}: rows=${text.split('\n').filter(Boolean).length} html=${kept} total_unique=${best.size}`);
  await sleep(2500);
}

const seeds = [...best].map(([orig, stamp]) => `https://web.archive.org/web/${stamp}/${orig}`);
fs.mkdirSync('C:/Users/User/Downloads/robotzade-archive', { recursive: true });
fs.writeFileSync('C:/Users/User/Downloads/robotzade-archive/seeds-wayback.txt', seeds.join('\n'));
console.log(`\nseeds-wayback.txt = ${seeds.length} archived html pages`);
console.log(seeds.slice(0, 4).join('\n'));
