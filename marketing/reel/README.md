# Levl reels and posts

Vertical reels (1080 x 1920) and feed posts (1080 x 1350) made in code with Remotion, so a new
piece is a new script, not a new edit. The look and motion are set by board 11
(`docs/design/11-motion-language.html`). Kept apart from the app: it has its own `package.json`
and the app's `tsconfig.json` leaves this folder out.

## What is here
- `src/brand.tsx`: the app's colours, the two fonts, stroked display type, tags, the sky.
- `src/motion.tsx`: the motion vocabulary (slam, drop in, rise, roll, sparks, gloss, sky wipe,
  impact shake). Build new reels from these, not new moves.
- `src/ui.tsx`: app pieces rebuilt as vectors (rank shield, XP bar, Home header card, week strip,
  XP chip, XP earned sheet, logo). Keep them matching the app as it is today.
- `src/reels/`: one file per reel plus its cue sheet (`*.cues.json`), which times both the
  sound and the animation.
- `src/posts/`: feed posts as stills.
- `sfx.mjs`: renders a reel's sound from its cue sheet with the app's own synthesized sounds
  (the same code as `lib/feedback.ts`), plus a 120 BPM pulse. No recorded audio, no voice.

## Make them
1. `npm install`, then `npm run assets` (copies images, fonts and the logo into `public/`).
2. `npm run sound` writes the WAVs, `npm run studio` previews, `npm run render` writes the reels
   to `out/`, `npm run render:overlay` the transparent reel 2 (large ProRes file), and
   `npm run posts` the post images.
3. On a Mac, drop the `--browser-executable` flag from the scripts; Remotion fetches its own browser.

## Rules
- Numbers follow the XP rules (`docs/design/xp-reference.html`): 5 XP a set, +50 daily bonus at
  20 minutes, +25 comeback, the growing weekly bonus, level n starts at 50 x n x (n - 1) XP.
- Text stays inside Instagram's safe zone: clear of the top 250 px and the bottom 350 px.
- Every piece ends on "Join the waitlist · link in bio" while `SIGNUPS=invite` is on.
