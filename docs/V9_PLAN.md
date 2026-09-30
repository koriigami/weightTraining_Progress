# v9 plan: Share card redesign (random sky, body figure, a real image)

(v8 is done and merged; its spec lives in `docs/V8_PLAN.md`.)

## Context
- The user shared a screenshot of the "Share workout" sheet (from the workout page) and finds it rudimentary:
  - the clouds sit in rigid columns;
  - the card lacks the body figure with the muscles worked.
- They want:
  - random cloud placement;
  - the front and back body figure, next to the existing title, date, sets, time, volume, XP and "Levl · E-Rank Hunter";
  - a better modal;
  - a design board with a few iterations first, then the build (the usual flow).
- Research showed a bigger gap. **Share sends only text today** (`navigator.share({ title, text })`), and no image is ever made. So the redesigned card must also become the thing that is shared, as a PNG. This is ROADMAP item 5 ("Image share cards").
- Other bugs to fix along the way:
  - Cardio-only workouts share as "Sets 1", with no distance or pace.
  - The Victory screen and the workout page build the share data separately. Victory's XP includes badge XP; the workout page uses current rank.

## Approach
The card becomes one self-contained SVG, 1080x1350 (4:5). The same SVG is the on-screen preview and the export source.

**Export pipeline:**
1. Serialize the SVG.
2. Inject both fonts as base64 `@font-face`.
3. Load it into an `Image` and draw it on a canvas.
4. Make a PNG `File`, then share it through `navigator.share({ files })`, or save or copy it.

**Rules the card must follow:**
- All colours are literal: no CSS vars, `currentColor`, `foreignObject` or external hrefs.
- Text outlines use `stroke` + `paint-order="stroke"`.
- Fonts use fixed family names:
  - Copy `lilita.woff2` and `figtree.woff2` to `public/fonts/`, with `OFL.txt`.
  - Add `@font-face` rules named 'Levl Display' and 'Levl Body' in `globals.css`. next/font uses hashed names, so they can't be referenced.
- Ids are fixed through an `idPrefix` prop, not `useId`, and must match `^[A-Za-z0-9_-]+$`.
- Never hide the source SVG with `display:none`.
- The export is full-bleed, with the gold frame inset.

**iOS rule: pre-render.**
- Render the PNG when the sheet opens (about 300 ms after its slide-up) and after each "New sky".
- The Share button shows `loading` until the file is ready.
- The tap handler calls `navigator.share` before any `await`:
  - `NotAllowedError` shows a toast, "Tap Share again".
  - `AbortError` is ignored.
  - A busy flag prevents a second share while one is open.
- Once the PNG is ready, show it as an `<img>` over the live SVG, so the preview matches the file pixel for pixel. Long-press works as a fallback.

**Buttons:**
- **Phone:** Share image is the primary button. If files can't be shared, Save image is primary instead.
- **Desktop:** Save image is primary. Copy image appears when `ClipboardItem` supports PNG.
- **Copy text:** a low-weight button that stays in both.
- The share sends the image only, not image plus text. A single constant controls this, so it can be flipped after the real-device test.

**Random sky:**
- Pure and seeded. The seed is `${workout.id}#${roll}`.
- `roll` resets to 0 when the sheet opens, so reopening gives the same sky. "New sky" increments it.
- Two cloud stamps come from the brand `--cloud` art, in two layers (far and near).
- Clouds may cross the card edges.
- Clouds are placed by rejection sampling that avoids keep-out rectangles over the text and plaques.

**Body figure:**
- Extract `BodyShapes` (a `<g>`) from `BodySvg`, taking literal skin and line colours. `BodySvg` keeps its CSS-var defaults.
- Muscle set counts per workout come from a new `workoutMuscleSets`, reusing `add()` in `lib/muscleStats.ts`.
- Chips show the top 3 muscles, for example "Chest 8 sets".
- The fill is two-tone (`musclesOfExercises`) or heat (`muscleRows` + `heatPercent`), whichever the board picks.
- Cardio-only cards have no body figure. Distance is the big number, with Time and Pace, or Speed for rides.

**Rank shield:** extract `RankShieldArt` (a `<g>`, taking `idPrefix` and `fontFamily`) from `components/RankShield.tsx`. `RankShield` wraps it, and its output doesn't change.

**One data builder:** `lib/shareCard.ts` `shareCardData({ workout, lookup, units, xp, rank, level })` is used by both `VictoryScreen.tsx` and `WorkoutView.tsx`.
- It reuses `workoutSummary` and `feedTiles` (`lib/feed.ts`), `formatWhen`, `musclesOfExercises` (`lib/muscles.ts`) and `RANK_TITLES`.
- It also provides:
  - `fitTitle`: font size steps of 96, 84, 72 and 64, at most 2 lines, then an ellipsis;
  - `shareFileName`: `levl-<slug>-<YYYY-MM-DD>.png`;
  - the keep-out rectangles.
- `shareText` in `lib/victory.ts` gains cardio and mixed wording. The strength text stays byte for byte, so the existing tests pass.

## Stages (one Sonnet subagent each; Opus verifies, commits land on `claude/home-workout-nutrition-plan-kuyhvx`, Opus pushes)
- **0. Design board** `docs/design/07-share-card-board.html`, published as an artifact for sign-off.
  - **Setup:** the fonts are embedded as base64, and the board runs the real `skyClouds` and `mulberry32` code inline.
  - **Sample:** Full Body, Tue 29 Sep, 19 sets, 45 min, 900 kg, +238 XP, rank E, LV 4.
  - **Layouts:**
    - A Stacked (4:5): mark and date, shield and title, 3 cream stat plaques, a body pair with chips, big gold XP, and the footer.
    - B Split (4:5): a large body pair on the left and the stats column on the right.
    - C Story (9:16, 1080x1920).
  - **Sky:** the old tiled sky next to the new random one, three seeds side by side, and a live "New sky" button.
  - **Muscle fill:** two-tone against heat.
  - **Variants:** run, ride, mixed, bodyweight (no Volume), a long title on 2 lines, and E rank against S rank.
  - **The modal:**
    - Phone at 390 px: rendering, ready, and no file sharing.
    - "New sky" placement: a dice button on the corner, or a chip row.
    - Desktop at 1440 px.
  - **Export test:** a "Make PNG" button that runs the real serialize, canvas and PNG steps, so the user can check fonts on an iPhone before the build.
  - **Decisions to collect:**
    1. Layout A or B.
    2. Story switch: yes or no.
    3. Muscle fill: two-tone or heat.
    4. "New sky" placement.
    5. XP on the card: the workout's own XP everywhere (recommended), or Victory keeps badge XP.
    6. Share the image only (recommended), or image plus text.
- **1. Pure logic:**
  - `lib/sky.ts`: `hashSeed` (FNV-1a), `mulberry32`, `CLOUD_STAMPS`, `skyClouds`.
  - `lib/shareCard.ts`.
  - `workoutMuscleSets` in `lib/muscleStats.ts`; `muscleSets` output stays the same.
  - The cardio and mixed `shareText`.
  - Tests: `tests/sky.test.ts`, `tests/shareCard.test.ts`, plus additions to `tests/muscleStats.test.ts` and `tests/victory.test.ts`.
- **2. SVG art:**
  - `RankShieldArt` and `BodyShapes` extracted.
  - `components/share/cardTheme.ts`: literal colours and font stacks. A test checks them against the `globals.css` tokens.
  - `components/share/ShareCardSvg.tsx`: its parts carry `data-part="sky|body|stats|xp"`.
  - `public/fonts/*` and the `@font-face` rules.
  - `tests/shareCardSvg.test.ts`, rendered with `renderToStaticMarkup`, checks for:
    - no `var(`, no `foreignObject`, no `http`;
    - safe ids, with every `url(#x)` pointing to an existing id;
    - titles escaped;
    - no body part on a cardio card;
    - a 1080x1350 root.
  - If vitest can't import `.tsx`, add `oxc: { jsx: { runtime: 'automatic' } }` to `vitest.config.mts`.
- **3. Modal wiring (still text share):**
  - `ShareSheet.tsx` takes a `ShareCard`, shows the SVG preview and the "New sky" button.
  - Both call sites build the card with `useMemo(shareCardData(...))`.
  - Remove the `.wt-sharecard` and `.sc-stats` CSS, and add `.wt-share-preview` (`aspect-ratio: 4/5; max-height: min(56dvh, 560px)`).
- **4. Image export:**
  - `lib/shareImage.ts`:
    - the cached font data URIs;
    - `finalizeSvg`, which adds the style right after the root tag, plus width, height and `xmlns`;
    - `rasterize`: `onload`, then `img.decode()`, a warm-up draw, 2 animation frames, `toBlob`, and a zeroed canvas;
    - `saveImage` and `copyImage`.
  - `components/share/useShareImage.ts`: a generation counter, a 150 ms debounce and object-URL cleanup.
  - The button logic by layout, the `<img>` overlay, and the toasts:
    - "Image saved"
    - "Image copied"
    - "Couldn't make the picture. Copy the text instead."
  - `tests/shareImage.test.ts`.
- **5. Story format:** only if chosen at sign-off. A `format` prop and a Post / Story `Segmented` control.
- **6. Docs:**
  - ROADMAP item 5 marked done.
  - DESIGN_HISTORY and ARCHITECTURE updated.
  - A Share section in `docs/QA.md`, and `docs/screenshots/share-*`.
  - A real-device checklist for the user: iPhone Safari and the home-screen app, and Android Chrome, sharing to WhatsApp, Instagram Story and Photos.

## Verification (each stage)
- `npm test`, `npx tsc --noEmit` and `npm run build` (pages stay static), and the em dash grep over app, components, lib, docs and tests.
- Playwright, using Chromium at `/opt/pw-browsers/chromium`, a dev server on port 3311, and Dev sign-in with `ALLOWED_EMAILS` set, at 390x844 and 1440x900:
  - **Stage 3:**
    - Sheet screenshots for a strength workout and a Run.
    - "New sky" changes `[data-part=sky]`, and reopening brings back the first sky.
    - A 40-character title fits inside the frame (`getBBox`).
    - No console errors.
  - **Stage 4:**
    - **Share stub.** Stub `navigator.share` and `canShare` with an init script. Check:
      - `navigator.userActivation.isActive` is true at call time;
      - exactly one PNG is shared, named `levl-*.png`, larger than 50 KB.
    - **Rapid taps.** 5 quick "New sky" taps, then Share, give exactly one call with the latest file.
    - **Download at desktop size.** The file's PNG header reads 1080x1350.
    - **Fonts by eye.** Screenshot the exported PNG to `docs/screenshots/share-export-*.png` and check the fonts.
    - **No file sharing.** With `canShare` false, the primary button reads Save image.
- Real-device checks by the user; iOS can't be automated here.
- Merge to main only after the user says so.
