# v13 plan: motion, sound, chests and the Rank Road

(v12 is done and on `main`. Board 12 round 2 and board 13 round 2 were signed off on 9 October 2026.)

## Context
Levl moves and sounds flat today: one pop for everything, one brown chest, medals that look alike. Board 12 (`docs/design/12-motion-sound.html`) designed a library for the whole app: 3D chests and medals, a tap-to-open reward stage, 34 interactions with their timing, sound and haptic, and CC0 sounds and music. Board 13 (`docs/design/13-rank-road.html`) decided which chest opens and put the chests on the Rank Road.

The board code in `docs/design/12-motion/` and `docs/design/13-road/` is the reference for the build: timings, springs, sound recipes and the 3D models are ported from it, not redrawn.

## Stages
1. **The rules.** Which chest opens, what comes after a workout, the road's rows. Pure logic, no UI.
2. **The sound engine and the motion tokens.** `lib/motion.ts`, `lib/sound.ts`, the picked sound files, the Music switch.
3. **Taps, overlays, training and Victory.** The interactions outside the reward stage, and the level up on Victory.
4. **The 3D art.** Chests and medals as a lazily loaded module, and small badge pictures rendered from the same models.
5. **The reward stage.** The chest, the swirl reveal, the card, the tray and summary, the rank up, and the sequence after Victory.
6. **The Rank Road and the badge view.** Gate cards with chests, progress on the road's line, badges on the rows, the badge view and tilt.
7. **Docs, QA and release.**

## Signed-off decisions

### What happens after a workout (board 13, 9 October 2026)
Every workout ends on Victory (XP lines count in, the total rolls, the level bar fills). Then, after Victory's 1.8 s hold (`VICTORY_HOLD_MS`):

| The workout earned | After Victory |
|---|---|
| Only XP | Nothing. Victory's level bar fills a little. |
| A new level, same rank | Nothing more: the level up plays on Victory itself (the bar fills to the end, flashes white, the level number pops, the level-up music). |
| A badge | Your rank's chest, with every badge inside, the best last. |
| A new level and a badge | The level up on Victory, then the chest. |
| A new rank | The rank-up moment (old shield breaks into pieces, pillar of light, new shield rises, title unrolls), then the new rank's chest: the title, the profile frame, then any badges. |
| Several levels at once | One level up, showing the final level. |

At most one moment and one chest after Victory.

**Kept for the future, not built now:** the full-screen level-up moment (board 12, interaction 32: shield slam, the number rolls). Option A of this decision.

### Which chest opens
- **Your rank decides your chest:** E Wooden, D Silver, C Golden, B Crystal, A Obsidian, S Prismatic.
- **At most one chest per workout,** when it earned a badge or crossed a rank.
- **Crossing a rank** opens the new rank's chest for the first time, with the title and frame first.
- **Themed chests:** Monthly for monthly badges, Royal for special badges, Pillow for secret rest badges. A rank crossing always wins.
- **Taps by chest:** 1 for Wooden, Silver, Monthly and Pillow; 2 for Golden, Crystal and Royal; 3 for Obsidian and Prismatic.
- **Nothing new is stored.** The chest is derived from the level before and after the workout and the badges it earned.

### Art (3D, board 12 option ids in `docs/design/12-motion/art3d.js`)
- **Chests:**

  | Chest | Option |
  |---|---|
  | Wooden, Golden, Pillow | as round 1 |
  | Silver | `a`, slate wood, polished silver |
  | Crystal | `a`, faceted crystal |
  | Obsidian | `c`, void |
  | Prismatic | `a`, opal |
  | Monthly | `c`, two-tone |
  | Royal | `a`, antique gold, ruby |

- **Medals:**
  - Bronze, Silver and Diamond as round 1;
  - Gold `sunburst`;
  - Master `violet`;
  - Legend `halo` (star-burst);
  - Monthly with its month tab;
  - Special and Secret without laurels.

  No laurels anywhere. Icons at the round 2 scale.
- **Locked:** stone, centred in the progress ring.
- **One tier palette** replaces `TIERS` and `MEDAL_TIERS` in `lib/badgeColors.ts`.

### Sound and music (slot ids in `docs/design/12-motion/sound.js`)
My pick for every slot, except where the user chose otherwise.

| Slot | Pick |
|---|---|
| `land` | `chest-land-a` |
| `crack` | `chest-tap-b` |
| `burst` | creak with a bloom |
| `whoosh` (medal flies out) | `whoosh-air` (Air move, Almitory). User's choice |
| `reveal` | rising bells, code |
| `sparkle` | `sparkle-a` |
| `coins` | `coins-c` |
| `shatter` | `shatter-glass` |
| `tier` | climbing shimmer, code |
| `riser` | code |
| `chime` | code |
| `done` (exercise complete) | marimba run, code. User's choice |
| `beat` | brass lift, code |
| `record` | fanfare, code. User's choice |
| `goal` | seal and chord, code |
| `error` | `error-a` |
| `tap` | pop, code |
| `tock` | tock, code |
| `tick` | tick, code |
| `switch` | two notes, code |
| `chip` | pip, code |
| `close` | puff, code |
| `open` | lift, code |
| `modal` | pip and lift, code |
| `lap` | `lap-a` |

- **Music:**
  - **Chest opening:** none. User's choice. Reward sounds then play in C.
  - **Level up:** `m-level-joth`.
  - **Rank up:** `m-rank-c` (Triumphant, Emma_MA, C major, 4 s). User's choice.
  - **Victory:** `m-victory-a`.
- **Only the picked files ship** in `public/sounds/`, with their `LICENSES.md` rows. The rest stay on the board.

### Rules carried over from board 12
- Three buses (taps, effects, music), a small reverb, a limiter, `navigator.audioSession.type = 'ambient'`.
- Sounds off means silence; Music has its own switch.
- Reduced motion shows end states.
- Haptics on Android only.
- **Settings:** a Music row next to Sounds and Haptics, on by default, only in reward moments.

### The interactions (board 12, section 5)
All 34 as shown in round 2, with:
- the segmented control and stepper fixes;
- the skeleton on a first visit;
- the seal for the weekly goal;
- the shatter for rank up.

Two changes from the board:
- **32 Level up** is not a full screen (see above).
- **24 Crowns** and **19 Training day** are marked "may change later".

### The Rank Road (board 13 round 2)
- **Today's light road, with gate cards in their rank's shield colours.**
  - Each card shows "C rank", the level once ("Level 10", or "Your rank, since level 10"), "Golden chest: title and frame", and the chest picture.
  - A tick on the chest once it is opened.
  - A gold frame on your rank.
  - A dashed edge and a lock for ranks ahead.
- **Your level** says "You are here". The road's gold line fills from your shield toward the next level's dot as you earn XP. The next level keeps "XP to go".
- **Rows behind you:** "Cleared", with small medals for the badges earned on that level (tap to replay). A rank-crossing workout's badges sit on its gate.
- **The "Next rank" chip** reads "Next rank: C at level 10".
- **Removed:** Up next, the "levels to next rank" line, and the progress bars in cards.

### The badge view (board 09 carry-overs)
- Tapping a badge you have opens a badge view: the medal large and tiltable, its tier, name, the date you earned it, what it measures and progress to the next tier.
- Tapping a locked rank opens the same view, with the shield in stone and "Reach level 30".

### Not now
- **Early levels:** no change. In 4 to 6 weeks, check Insights; if the median days to D rank is over 21, make levels 2 to 5 cheaper in a plan of its own.
- **Small unlocks every few levels:** not planned.

## Stage 1: the rules
- **`lib/rewards.ts` (new):**
  - `chestFor({ levelBefore, levelAfter, earned })` returns the chest key and the ordered items (title and frame on a rank crossing, then badges with the best last), or `null`.
  - `afterWorkout(...)` returns the steps after Victory: `levelUpOnVictory`, `rankUp`, `chest`.
  - Themed precedence, as above.
- **`lib/rankRoad.ts`:**
  - Gate rows lose `nextTitle`, `nextLevelsToGo` and `rankProgress` from the card's copy.
  - Gate rows gain `chest`.
  - Level rows gain `badges` (badge `earnedAt` dates against the level reached that day; a rank-crossing workout's badges on its gate).
  - The road gains `levelPct` for the fill (already there).
- **`lib/badgeColors.ts`:** one tier palette.
- **Tests (one per rule):**
  - no badge and no new level: no chest;
  - badge: rank chest;
  - rank crossing: new chest, title first;
  - themed precedence;
  - several levels: one level up;
  - badges placed on the right row.

## Stage 2: the sound engine and the motion tokens
- **`lib/motion.ts`:** durations, easings, the three springs and `springFrames`, from `12-motion/motion.js`.
- **`lib/sound.ts`:**
  - buses, reverb, limiter and ambient session;
  - the code-made sounds and the reward key;
  - the slot table with the picks above;
  - file loading after the first tap.

  It replaces the synth in `lib/feedback.ts` and keeps its prefs key, adding `music`.
- **Files:** the picked files in `public/sounds/`, with the licence list.
- **Settings:** the Music row.

## Stage 3: taps, overlays, training and Victory
- **Port the interactions** onto the real components, with the timings and sounds of the board.
- **Controls:**
  - green and gold button presses;
  - tabs, the segmented control (thumb in percentages), switches, chips, the stepper (one number, pointercancel);
  - back and close, sheets, game modals, toasts;
  - the page change with a skeleton.
- **Training:**
  - set tick and untick;
  - exercise complete, beat last time, new record;
  - lap, training day reached;
  - Finish (0.9 s roll and rise).
- **Victory:**
  - the entrance, XP lines and crowns, how it felt;
  - the weekly goal seal;
  - the level up on Victory: the bar flashes, the number pops, `m-level-joth`.

## Stage 4: the 3D art
- **`three` as a dependency,** loaded with a dynamic import only on a reward moment or the badge view.
- **The chests and medals** from `12-motion/art3d.js`, with the picked options only.
- **Small badges** (Badges tab, road rows, tray): pictures rendered from the models on first use and cached, with the vector medal as the fallback when WebGL is missing.

## Stage 5: the reward stage
- **The chest stage** from `12-motion/stage.js` and `stage3d.js`:
  - the drop, the taps (each a latch), the charge for 3-tap chests and the burst;
  - the open chest settling in the lower third;
  - the swirl reveal, the reward card framed in the tier colour, and coins into the level bar with the XP-lines sound;
  - the tray, and the summary without a heading, with Continue last.
- **The rank-up moment** with the clipped-shard shatter, then the new chest with the title and frame cards.
- **The sequence** from `afterWorkout` replaces the badge, level up and rank up moments in `CelebrationProvider`. Replays (tapping a gate or a badge) use the same stage.

## Stage 6: the Rank Road and the badge view
- **`components/rank/RankRoad.tsx`:**
  - gate cards in rank colours with the chest picture;
  - the fill on the road's line;
  - medals on the rows behind you;
  - the shorter chip.
- **The badge view:**
  - the medal large with tilt;
  - its details;
  - locked ranks in stone.

## Stage 7: docs, QA and release
- **Docs:** `docs/ARCHITECTURE.md` (sound, motion, 3D loading), `docs/QA.md` (real phone checks: silent switch, Android haptics, ambient audio with music playing), `docs/ROADMAP.md`.
- **QA:** `npm run qa` on Home, a workout, Victory, Rank and Settings at 390 and 1440; the reward flows driven with `withApp`.
- **Release** only on the user's word.

## Done when
- Every row of the after-workout table plays as signed off, with the picked sounds.
- The Rank Road matches board 13 round 2.
- `npm run verify:full` passes.
- QA screenshots are reviewed at both widths.
