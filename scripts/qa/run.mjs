// npm run qa -- --routes "/,/profile,/workout/view?id=@run" --widths 390,1440 [--out dir] [--full] [--reuse] [--keep-server] [--no-seed] [--owner]
// Screenshots each route at each width, signed in with seeded data, and prints a JSON
// summary: files, console errors and horizontal overflow. Exits 1 if anything failed.
import { join } from 'node:path';
import { startServer, stopServer, launch, newPage, signIn, seed, settle, overflows, resolveRoute, slug, outDir, BASE, EMAIL, OWNER_EMAIL } from './lib.mjs';

function args(argv) {
  const a = { routes: ['/'], widths: [390, 1440], out: undefined, full: false, reuse: false, keepServer: false, seed: true, owner: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--routes') a.routes = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--widths') a.widths = argv[++i].split(',').map(Number);
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--full') a.full = true;
    else if (k === '--reuse') a.reuse = true;
    else if (k === '--keep-server') a.keepServer = true;
    else if (k === '--no-seed') a.seed = false;
    else if (k === '--owner') a.owner = true;
  }
  return a;
}

const opts = args(process.argv.slice(2));
const dir = outDir(opts.out);
const t0 = Date.now();
const summary = { base: BASE, out: dir, shots: [], failed: false, seconds: 0 };
await startServer({ reuse: opts.reuse });
const browser = await launch();
try {
  for (const width of opts.widths) {
    const { context, page, errors } = await newPage(browser, width);
    await signIn(context, opts.owner ? OWNER_EMAIL : EMAIL);
    if (opts.seed) await seed(context);
    for (const route of opts.routes) {
      const url = resolveRoute(route);
      errors.length = 0;
      const t = Date.now();
      await page.goto(`${BASE}${url}`);
      await settle(page);
      const file = join(dir, `${slug(route)}-${width}.png`);
      await page.screenshot({ path: file, fullPage: opts.full });
      const shot = { route, width, file, consoleErrors: [...errors], overflow: await overflows(page), ms: Date.now() - t };
      if (shot.consoleErrors.length || shot.overflow) summary.failed = true;
      summary.shots.push(shot);
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (!opts.keepServer) stopServer();
}
summary.seconds = Math.round((Date.now() - t0) / 100) / 10;
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.failed ? 1 : 0);
