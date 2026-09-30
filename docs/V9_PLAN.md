# v9 plan: Share card redesign (random sky, body figure, a real image)

(v8 is done and merged; its spec lives in `docs/V8_PLAN.md`. Round 1 board: `docs/design/07-share-card-board.html`, https://claude.ai/artifact/3zHX1DagsD4FT6mSJuyYVo)

## Context
- The user finds the "Share workout" sheet rudimentary:
  - the clouds sit in tiled columns;
  - there is no body figure.
- **Today Share sends only text.** No image exists; the card is a preview that never leaves the phone.
- v9 makes the card the thing that is shared, as a 1080x1350 PNG, with:
  - a random sky;
  - the muscles worked;
  - correct cardio stats (today a run shares as "Sets 1").

## Signed-off decisions (round 1 review)
1. **Layout B Split.** The body figure is big on the left; stats are stacked on the right.
2. **No rank line.** Drop "E-Rank Hunter · LV 4"; the shield already shows it.
3. **Title always fits on one line:**
   - shrink it through 88, 80, 72 and 64 px;
   - if it still doesn't fit, cut it at the last whole word that fits and add "…";
   - if a single word is too long, cut that word and add "…".
4. **Centre-aligned lockups:**
   - the Levl mark and "Levl" wordmark are centred on each other, using the letters' height, not the bottom edge;
   - the date sits on the same centre line;
   - the shield and the title are centred on each other.
5. **Post size only.** No Story format for now.
6. **Two-tone muscle colours:** main muscles `--hi`, "also works" `--sec`, the rest `--muscle`.
7. **New sky is a dice button** on the preview's corner. It lives in the sheet, never in the SVG, so it never appears in the shared picture.
8. **XP:** the workout's own XP everywhere (`w.xp`). Victory stops adding badge XP to the card.
9. **4 or more muscles:**
   - the body lights every muscle worked;
   - chips show the top 3 by sets (a secondary muscle counts as 0.5 set);
   - then a line "+N more muscles" (or "+1 more muscle"), shown only when N > 0.
10. **Buttons, image only:**
    - **Share image** is the primary green button.
    - **Save image** is the secondary gold button.
    - No Copy text and no Copy image.
    - Where the browser can't share files (`navigator.canShare({ files })` is false), only Save image shows.
    - If making the picture fails, a toast reads "Couldn't make the picture. Try again." and Share falls back to the text line through `navigator.share({ text })` where it is available.

## Approach
The card is one self-contained SVG, 1080x1350. The same SVG is the on-screen preview and the export source.

**Export pipeline:**
1. Serialize the SVG.
2. Inject both fonts as base64 `@font-face`.
3. Load it into an `Image`.
4. Draw it on a canvas.
5. Make a PNG `File`, then share it (`navigator.share({ files })`) or save it.

The round 1 board already proved this pipeline in Chromium: 826 KB, about 0.2 s, correct fonts.

**Card rules:**
- Colours are literal. No CSS vars, `currentColor`, `foreignObject` or external hrefs.
- Outlines use `stroke` + `paint-order="stroke"`.
- Fonts:
  - Copy `docs/design/brand/lilita.woff2` and `docs/design/brand/figtree.woff2` to `public/fonts/`, with `OFL.txt`.
  - Add `@font-face` rules for 'Levl Display' and 'Levl Body' in `globals.css`. next/font's family names are hashed, so they can't be used.
- Ids come from an `idPrefix` prop and match `^[A-Za-z0-9_-]+$`.
- Never hide the source SVG with `display:none`.
- The export is full-bleed, with the gold frame inset.

**iOS: pre-render.**
- Render the PNG about 300 ms after the sheet opens, and after each New sky (debounced 150 ms).
- Share image shows `loading` until the file is ready.
- The tap handler calls `navigator.share` before any `await`:
  - `NotAllowedError` shows a toast, "Tap Share again".
  - `AbortError` is ignored.
  - A busy flag blocks a second share while one is open.
- Once the PNG is ready, it shows as an `<img>` over the live SVG, so the preview is pixel-exact and long-press saves it.

**Random sky:**
- A seeded PRNG (FNV-1a `hashSeed` + `mulberry32`). The seed is `${workout.id}#${roll}`.
- `roll` resets to 0 when the sheet opens; the dice adds one.
- It uses the two brand `--cloud` stamps, in a far and a near layer, and clouds may cross the edges.
- Clouds stay out of two keep-out rectangles: the date and the "+N more" line, the plain white or muted text.
- The board's `skyClouds` code is the reference implementation.

**Card B coordinates:** the reference is `renderCard` in the board (`layoutB`, updated in stage 0b).
- **Strength and mixed:**
  - top bar at y 96;
  - shield (scale 1.12) with the one-line title to its right, both centred on the shield;
  - body panel at x 80, y 360, 500x740: the front and back pair, then 3 chips, then the "+N more" line;
  - stat plaques at x 610, width 390, stacked in the same 740 px. Mixed gets 4 plaques; bodyweight gets 2.
  - XP at y 1236.
- **Cardio only:**
  - the same top bar and title row;
  - a big Distance plaque;
  - 2 plaques below it: Time, and Pace (or Speed for rides);
  - XP.

**Reuse:**
- `workoutSummary` and `feedTiles` in `lib/feed.ts` (tiles, including cardio pace and speed).
- `formatWhen`.
- `musclesOfExercises` in `lib/muscles.ts`.
- `add()` in `lib/muscleStats.ts`, through a new `workoutMuscleSets(items, lookup)`. The output of `muscleSets(state)` stays the same.
- `SHIELD` and `RANK_MATERIALS`, via an extracted `RankShieldArt` `<g>` that takes `idPrefix` and `fontFamily`. `RankShield` wraps it and renders exactly as before.
- `BODY`, via an extracted `BodyShapes` `<g>` that takes literal skin and line colours. `BodySvg` wraps it and keeps its CSS var defaults.
- The `mark()` markup in `docs/design/brand/build.js` for the Levl mark.
- `shareText` in `lib/victory.ts` gains cardio and mixed wording for the fallback only. The strength text stays byte for byte.

**One builder:** `lib/shareCard.ts` `shareCardData({ workout, lookup, units, rank, level })` is used by both `VictoryScreen.tsx` and `WorkoutView.tsx`. It returns:
- `seedBase`, `title` and `titleSize` (from `fitTitle`), `dateLabel`, `kind`;
- `stats`, and `hero` (cardio only);
- `xp` (always `w.xp`), `rank`, `level`;
- `muscles`: `{ primary, secondary, chips, moreCount }` or null;
- `text`, and `fileName` (`levl-<slug>-<YYYY-MM-DD>.png`).

## Stages (Sonnet subagents one at a time; Opus verifies and pushes to `claude/home-workout-nutrition-plan-kuyhvx`)
- **0b. Board round 2.** Update `docs/design/07-share-card-board.html` and republish it to the same URL. Then continue straight to stage 1 without waiting.
  - B only, with all ten decisions applied.
  - Variants: run, ride, mixed, bodyweight, a long title truncated to one line, and S rank. Full Body shows "+10 more muscles".
  - The sheet:
    - phone: ready, making the picture, and can't share (Save only);
    - desktop: Share image and Save image.
  - The export test stays.
- **1. Pure logic:**
  - `lib/sky.ts`.
  - `lib/shareCard.ts`: `fitTitle`, `shareFileName`, the chips with `moreCount`, and `mixHex` only if needed.
  - `workoutMuscleSets`.
  - The cardio and mixed `shareText`.
  - Tests:
    - `tests/sky.test.ts`: seed determinism, bounds, keep-out, the attempt budget.
    - `tests/shareCard.test.ts`: strength, mixed, bodyweight, run, ride, cardio with no km, lb and mi, chips and more-count, one-line truncation at a word or mid-word, file names, and no em dashes.
    - Additions to `tests/muscleStats.test.ts` and `tests/victory.test.ts`.
- **2. SVG art:**
  - `RankShieldArt` and `BodyShapes` extracted.
  - `components/share/cardTheme.ts`: literal colours, with a test against the `globals.css` tokens.
  - `components/share/ShareCardSvg.tsx`: layout B and cardio, with `data-part` set to sky, body, stats or xp.
  - `public/fonts/*` and the `@font-face` rules.
  - `tests/shareCardSvg.test.ts`, using `renderToStaticMarkup`, checks for:
    - no `var(`, no `foreignObject`, no `http`;
    - safe ids, with every `url(#x)` resolving;
    - titles escaped;
    - no body part on a cardio card;
    - a 1080x1350 root.
  - If vitest can't import `.tsx`, add `oxc: { jsx: { runtime: 'automatic' } }` to `vitest.config.mts`.
- **3. Sheet wiring:**
  - `ShareSheet.tsx` takes a `ShareCard`. It shows the SVG preview with the corner dice (New sky) and the two buttons, both disabled until stage 4.
  - Both call sites build the card with `useMemo(shareCardData(...))`.
  - CSS: remove `.wt-sharecard` and `.sc-stats`; add `.wt-share-preview` (`aspect-ratio: 4/5; max-height: min(56dvh, 560px)`) and `.wt-share-dice`.
  - Desktop is a dialog: preview on the left, actions on the right.
- **4. Image export:**
  - `lib/shareImage.ts`: the cached font data URIs, `finalizeSvg`, `rasterize` (onload, decode, a warm-up draw, 2 frames, `toBlob`, then zero the canvas) and `saveImage`.
  - `components/share/useShareImage.ts`: a generation counter, the debounce, and object-URL cleanup.
  - Button logic: Share image shows only when `canShare({ files })` is true; Save image always shows. The `<img>` overlay. Toasts: "Image saved" and the failure message.
  - `tests/shareImage.test.ts`.
- **5. Docs:**
  - ROADMAP item 5 marked done.
  - DESIGN_HISTORY and ARCHITECTURE.
  - A Share section in `docs/QA.md`.
  - `docs/screenshots/share-*`.
  - A real-device checklist for the user: iPhone Safari, the iPhone home-screen app and Android Chrome, sharing to WhatsApp and Instagram and saving to Photos.

## Verification (each stage)
- `npm test`, `npx tsc --noEmit` and `npm run build` (pages stay static), and the em dash grep over app, components, lib, docs and tests.
- Playwright, using Chromium at `/opt/pw-browsers/chromium`, a dev server on port 3311, and Dev sign-in with `ALLOWED_EMAILS=dev@example.com`, at 390x844 and 1440x900:
  - **Stage 3:**
    - Sheet screenshots for strength and for a Run.
    - The dice changes `[data-part=sky]`, and reopening brings back the first sky.
    - A 40-character title stays on one line inside the frame (`getBBox`).
    - The dice is not inside the SVG.
    - No console errors.
  - **Stage 4:**
    - **Share stub.** Stub `navigator.share` and `canShare`. Check `userActivation.isActive` at call time, and exactly one `levl-*.png` shared, larger than 50 KB.
    - **Rapid taps.** 5 quick dice taps, then Share, give exactly one call with the latest file.
    - **Save at desktop size.** The saved file's PNG header reads 1080x1350.
    - **Fonts by eye.** Screenshot the exported PNG.
    - **No file sharing.** With `canShare` false, only Save image shows.
- Real-device checks by the user; iOS can't be automated here.
- Merge to main only after the user says so.
