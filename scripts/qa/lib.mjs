// QA harness for Levl: start the dev server, sign in over HTTP (no clicking),
// seed a known state through /api/state, and take screenshots with Playwright.
// Used by `npm run qa` (scripts/qa/run.mjs) and by ad-hoc flow scripts:
//
//   import { withApp } from '<repo>/scripts/qa/lib.mjs';
//   await withApp(async ({ page, base, ids }) => { ... }, { width: 390 });
//
// Nothing here runs in CI. It needs Chromium and the playwright module, which
// this environment has at the default paths below (override with env vars).
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PORT = Number(process.env.QA_PORT || 3311);
export const BASE = `http://localhost:${PORT}`;
export const EMAIL = 'qa@example.com';
export const OWNER_EMAIL = 'qa-owner@example.com';
export const SIZES = { 390: { width: 390, height: 844 }, 1440: { width: 1440, height: 900 } };

// Fixed ids for the seeded workouts, so routes can say /workout/view?id=@run.
export const IDS = { strength: 'qa-strength', run: 'qa-run', ride: 'qa-ride', mixed: 'qa-mixed' };

const require = createRequire(import.meta.url);
function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright', 'playwright', 'playwright-core'].filter(Boolean);
  for (const t of tries) {
    try {
      return require(t);
    } catch {
      // try the next one
    }
  }
  throw new Error('Playwright not found. Set PLAYWRIGHT_MODULE to the playwright package path.');
}

export function chromiumPath() {
  const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
  return existsSync(p) ? p : undefined;
}

// ---------------- the server ----------------

async function isUp() {
  try {
    return (await fetch(`${BASE}/`, { redirect: 'manual' })).status < 500;
  } catch {
    return false;
  }
}

export function stopServer() {
  try {
    execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' });
  } catch {
    // nothing was listening
  }
}

/** Starts `next dev` on PORT with the QA sign-in env. `reuse` keeps a server that is already up. */
export async function startServer({ reuse = false, log = join(tmpdir(), 'levl-qa-server.log') } = {}) {
  if (reuse && (await isUp())) return { reused: true, log };
  stopServer();
  const out = openSync(log, 'a');
  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: REPO,
    detached: true,
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      AUTH_SECRET: 'qa-secret',
      ALLOWED_EMAILS: `${EMAIL},${OWNER_EMAIL}`,
      OWNER_EMAIL,
      AUTH_GOOGLE_ID: '', // Google must be off for the dev sign-in to exist
    },
  });
  child.unref();
  const until = Date.now() + 180_000;
  while (Date.now() < until) {
    if (await isUp()) return { reused: false, log };
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`The dev server did not start. See ${log}`);
}

// ---------------- sign-in and state ----------------

/** Signs in with the dev credentials provider. Cookies land in the browser context. */
export async function signIn(context, email = EMAIL) {
  const csrf = await (await context.request.get(`${BASE}/api/auth/csrf`)).json();
  await context.request.post(`${BASE}/api/auth/callback/dev`, {
    form: { email, csrfToken: csrf.csrfToken, callbackUrl: `${BASE}/` },
    headers: { 'X-Auth-Return-Redirect': '1' },
  });
  const session = await (await context.request.get(`${BASE}/api/auth/session`)).json();
  if (session?.user?.email !== email) throw new Error(`Sign-in failed for ${email}. Is it in ALLOWED_EMAILS?`);
  return session;
}

/** One /api/state action. Returns the new state, throws with the server's message on 4xx. */
export async function api(context, action, body = {}) {
  const res = await context.request.post(`${BASE}/api/state`, { data: { action, ...body } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok()) throw new Error(`${action}: ${res.status()} ${json.error ?? ''}`.trim());
  return json;
}

export async function getState(context) {
  return (await context.request.get(`${BASE}/api/state`)).json();
}

const pad = (n) => String(n).padStart(2, '0');
export function dayStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function workout(id, daysAgo, title, minutes, items, plan) {
  const date = dayStr(daysAgo);
  const start = new Date(`${date}T18:00:00`);
  return {
    id,
    date,
    when: `${date}T18:00`,
    title,
    startedAt: start.toISOString(),
    finishedAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
    items: items.map(([exerciseId, sets]) => ({ exerciseId, sets: sets.map((s) => ({ ...s, done: true })) })),
    ...(plan ? { plan } : {}),
    xp: 0,
  };
}

const three = (kg, reps) => [{ kg, reps }, { kg, reps }, { kg, reps }];

/** The `basic` preset: onboarded prefs, a strength, run, ride and mixed workout, weights, a goal, a routine. Safe to run twice. */
export async function seed(context) {
  const state = await getState(context);
  const have = new Set((state.workouts ?? []).map((w) => w.id));
  await api(context, 'savePrefs', {
    prefs: {
      units: { weight: 'kg', distance: 'km' },
      equipment: { kind: 'gym', has: [], dumbbellKg: [] },
      avoid: [],
      limits: [],
      weeklyGoal: 3,
      sound: false,
      haptic: false,
      onboarded: true,
    },
  });
  const workouts = [
    workout(IDS.strength, 0, 'Push and Legs', 45, [['db-bench', three(20, 10)], ['bb-squat', three(60, 8)]], [
      { exerciseId: 'db-bench', sets: 3 },
      { exerciseId: 'bb-squat', sets: 3 },
    ]),
    workout(IDS.run, 1, 'Morning Run', 31, [['run', [{ min: 31, km: 5.2 }]]]),
    workout(IDS.ride, 2, 'Evening Ride', 46, [['cycle', [{ min: 46, km: 18.4 }]]]),
    workout(IDS.mixed, 3, 'Legs and a Jog', 58, [['bb-squat', three(70, 6)], ['run', [{ min: 12, km: 2.1 }]]]),
  ];
  for (const w of workouts) if (!have.has(w.id)) await api(context, 'saveWorkout', { workout: w });
  await api(context, 'weight', { date: dayStr(7), kg: 82.4 });
  await api(context, 'weight', { date: dayStr(0), kg: 81.6 });
  if (!(state.goals ?? []).length) {
    await api(context, 'addGoal', { goal: { type: 'workouts', target: 12, start: dayStr(0), deadline: dayStr(-30) } }).catch((e) => console.warn(`seed: ${e.message}`));
  }
  if (!(state.routines ?? []).some((r) => r.id === 'qa-routine')) {
    await api(context, 'saveRoutine', { routine: { id: 'qa-routine', title: 'QA Push', items: [{ exerciseId: 'db-bench', sets: three(20, 10) }] } }).catch((e) =>
      console.warn(`seed: ${e.message}`),
    );
  }
  return IDS;
}

// ---------------- browser ----------------

export async function launch() {
  const { chromium } = loadPlaywright();
  return chromium.launch({ executablePath: chromiumPath() });
}

/** A page at a width that records console errors, page errors and failed requests. */
export async function newPage(browser, width = 390) {
  const size = SIZES[width] ?? { width, height: 900 };
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return { context, page, errors };
}

/** `@strength`, `@run`, `@ride`, `@mixed` in a route become the seeded ids. */
export const resolveRoute = (route) => route.replace(/@(strength|run|ride|mixed)\b/g, (_, k) => IDS[k]);

export async function settle(page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

export async function overflows(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

export const slug = (route) => route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';

/**
 * Starts (or reuses) the server, signs in, seeds, and hands a ready page to `fn`.
 * Always closes the browser; stops the server unless `keepServer`.
 */
export async function withApp(fn, { width = 390, email = EMAIL, seedData = true, reuse = false, keepServer = false } = {}) {
  await startServer({ reuse });
  const browser = await launch();
  try {
    const { context, page, errors } = await newPage(browser, width);
    await signIn(context, email);
    const ids = seedData ? await seed(context) : IDS;
    return await fn({ browser, context, page, errors, base: BASE, ids, api: (a, b) => api(context, a, b) });
  } finally {
    await browser.close();
    if (!keepServer) stopServer();
  }
}

export function outDir(dir) {
  const d = dir || join(tmpdir(), 'levl-qa');
  mkdirSync(d, { recursive: true });
  return d;
}
