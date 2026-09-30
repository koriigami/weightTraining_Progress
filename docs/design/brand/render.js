const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1300, height: 1900 } });
  await p.goto('file://' + process.cwd() + '/render.html'); await p.waitForTimeout(600);
  await (await p.$('#og')).screenshot({ path: 'og.png' });
  await (await p.$('#app')).screenshot({ path: 'app-512.png' });
  await (await p.$('#fav')).screenshot({ path: 'fav-512.png', omitBackground: true });
  for (const [s, id, name] of [[192, '#app', 'app-192.png'], [180, '#app', 'apple-180.png'], [64, '#fav', 'fav-64.png'], [32, '#fav', 'fav-32.png']]) {
    const q = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: s / 512 });
    await q.goto('file://' + process.cwd() + '/render.html'); await q.waitForTimeout(400);
    await (await q.$(id)).screenshot({ path: name, omitBackground: id === '#fav' });
    await q.close();
  }
  await b.close(); console.log('done');
})();
