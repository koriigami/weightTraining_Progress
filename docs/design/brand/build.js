// Builds every Levl brand asset from one mark: node docs/design/brand/build.js
// Writes public/logo.svg (in-app lockups), public/favicon.svg (heavier strokes for 16 px), favicon-32.png, icon-192.png, icon-512.png,
// icon-maskable-192.png, icon-maskable-512.png, apple-touch-icon.png, favicon.ico (16, 32, 48), og.jpg
// and docs/design/brand/logo.svg.
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const HERE = __dirname;
const PUB = path.join(HERE, '../../../public');

const GRAD = (id, stops) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

/**
 * The Levl mark: three rounded rank chevrons on the primary green tile, with the
 * button bevel and a thin gold ring. The top chevron is XP gold.
 * shape: 'tile' (rounded, transparent corners), 'bleed' (full square, for iOS),
 * 'mask' (full square, chevrons inside the maskable safe zone).
 */
function mark({ id = 'lv', shape = 'tile', sw = 11, ring = 1.5 } = {}) {
  const defs =
    GRAD(`${id}b`, [[0, '#5FD24A'], [0.5, '#2BA438'], [1, '#1E8A2E']]) +
    GRAD(`${id}c`, [[0, '#FFFFFF'], [1, '#F2FFE9']]) +
    GRAD(`${id}t`, [[0, '#FFF2A6'], [1, '#FFC21A']]) +
    GRAD(`${id}r`, [[0, '#FFF2A6'], [1, '#E0A316']]);
  let body = '';
  if (shape === 'tile') {
    body += `<rect x="4" y="8" width="112" height="108" rx="30" fill="#186A20"/>`;
    body += `<rect x="4" y="4" width="112" height="108" rx="30" fill="url(#${id}b)"/>`;
    body += `<rect x="10.5" y="10.5" width="99" height="95" rx="24" fill="none" stroke="url(#${id}r)" stroke-opacity=".85" stroke-width="${ring}"/>`;
  } else if (shape === 'bleed') {
    body += `<rect width="120" height="120" fill="#186A20"/>`;
    body += `<rect width="120" height="115" fill="url(#${id}b)"/>`;
    body += `<rect x="7" y="7" width="106" height="101" rx="21" fill="none" stroke="url(#${id}r)" stroke-opacity=".85" stroke-width="${ring}"/>`;
  } else {
    body += `<rect width="120" height="120" fill="url(#${id}b)"/>`;
  }
  const dy = shape === 'mask' ? 2 : -2;
  const rows = [30, 50, 70].map((y) => y + dy);
  const fade = [1, 0.85, 0.5];
  const chev = rows
    .map(
      (y, i) =>
        `<path d="M34 ${y + 20} L60 ${y} L86 ${y + 20}" fill="none" stroke="url(#${id}${i === 0 ? 't' : 'c'})" stroke-opacity="${fade[i]}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  body += shape === 'mask' ? `<g transform="translate(60 60) scale(.8) translate(-60 -60)">${chev}</g>` : chev;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${defs}</defs>${body}</svg>`;
}

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Lilita One';src:url(lilita.woff2) format('woff2')}
@font-face{font-family:'Figtree';src:url(figtree.woff2) format('woff2');font-weight:300 900}
body{margin:0;background:transparent}
.sq{display:grid;place-items:center}
#og{width:1200px;height:630px;position:relative;overflow:hidden;box-sizing:border-box;
  background:radial-gradient(900px 500px at 85% 20%,rgba(134,234,100,.35),transparent 60%),linear-gradient(160deg,#2BA438 0%,#1E8A2E 50%,#125E1C 100%);
  display:flex;align-items:center;justify-content:space-between;padding:0 96px 0 104px;font-family:Figtree}
#og .rule{position:absolute;inset:20px;border:3px solid rgba(255,214,90,.6);border-radius:30px}
#og .t{display:flex;flex-direction:column;gap:18px;position:relative}
#og h1{margin:0;font-family:'Lilita One';font-weight:400;font-size:200px;line-height:.86;color:#fff;letter-spacing:.005em;text-shadow:0 8px 0 #145A1C}
#og p{margin:0;font-size:40px;font-weight:800;line-height:1.2;color:rgba(255,255,255,.94);max-width:600px}
#og .rk{display:flex;gap:12px;margin-top:10px}
#og .rk b{width:54px;height:54px;border-radius:14px;border:3px solid rgba(255,255,255,.45);color:rgba(255,255,255,.9);display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:30px;box-sizing:border-box}
#og .rk b:last-child{border:0;color:#3A230C;background:linear-gradient(180deg,#FFF2A6,#FFC21A);box-shadow:0 4px 0 #C7870A}
#og .m{width:330px;filter:drop-shadow(0 22px 34px rgba(0,0,0,.28))}
</style></head><body>
<div id="og"><div class="rule"></div><div class="t"><h1>Levl</h1><p>Log workouts. Beat last time. Climb from E to S rank.</p><div class="rk">${RANKS.map((r) => `<b>${r}</b>`).join('')}</div></div><div class="m">${mark({ id: 'og' })}</div></div>
<div id="tile" class="sq" style="width:512px;height:512px">${mark({ id: 'ti' }).replace('<svg ', '<svg width="512" height="512" ')}</div>
<div id="fav" class="sq" style="width:512px;height:512px">${mark({ id: 'fa', sw: 13, ring: 2 }).replace('<svg ', '<svg width="512" height="512" ')}</div>
<div id="bleed" class="sq" style="width:512px;height:512px">${mark({ id: 'bl', shape: 'bleed' }).replace('<svg ', '<svg width="512" height="512" ')}</div>
<div id="mask" class="sq" style="width:512px;height:512px">${mark({ id: 'ma', shape: 'mask' }).replace('<svg ', '<svg width="512" height="512" ')}</div>
</body></html>`;

(async () => {
  fs.writeFileSync(path.join(HERE, 'logo.svg'), mark() + '\n');
  fs.writeFileSync(path.join(PUB, 'logo.svg'), mark() + '\n');
  fs.writeFileSync(path.join(PUB, 'favicon.svg'), mark({ sw: 13, ring: 2 }) + '\n');
  const html = path.join(HERE, '.render.html');
  fs.writeFileSync(html, page);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const shot = async (sel, size, out) => {
    const p = await b.newPage({ viewport: { width: 1300, height: 700 }, deviceScaleFactor: size / 512 });
    await p.goto('file://' + html);
    await p.evaluate(() => document.fonts.ready);
    await (await p.$(sel)).screenshot({ path: path.join(PUB, out), omitBackground: true });
    await p.close();
  };
  const p = await b.newPage({ viewport: { width: 1300, height: 700 } });
  await p.goto('file://' + html);
  await p.evaluate(() => document.fonts.ready);
  // JPEG keeps the link preview small (WhatsApp skips large images). Bump OG_FILE in app/layout.tsx
  // when the image changes, so WhatsApp, LinkedIn and Facebook fetch it fresh.
  await (await p.$('#og')).screenshot({ path: path.join(PUB, 'og.jpg'), type: 'jpeg', quality: 90 });
  await p.close();
  await shot('#fav', 32, 'favicon-32.png');
  await shot('#tile', 192, 'icon-192.png');
  await shot('#tile', 512, 'icon-512.png');
  await shot('#mask', 192, 'icon-maskable-192.png');
  await shot('#mask', 512, 'icon-maskable-512.png');
  await shot('#bleed', 180, 'apple-touch-icon.png');
  // favicon.ico for Vercel, search results and older crawlers: PNG entries packed into one ICO.
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) {
    const q = await b.newPage({ viewport: { width: 1300, height: 700 }, deviceScaleFactor: s / 512 });
    await q.goto('file://' + html);
    pngs.push(await (await q.$('#fav')).screenshot({ omitBackground: true }));
    await q.close();
  }
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s, e);
    head.writeUInt8(s, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(pngs[i].length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  fs.writeFileSync(path.join(PUB, 'favicon.ico'), Buffer.concat([head, ...pngs]));
  await b.close();
  fs.unlinkSync(html);
  console.log('brand assets written');
})();
