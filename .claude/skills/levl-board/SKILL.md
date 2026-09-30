---
name: levl-board
description: Conventions for Levl design boards - the clickable HTML pages the user signs off before a build. Use when designing a new screen, flow, visual or brand asset for Levl, or when running another round of an existing board.
---

# Design boards

A board is where the user decides. It is built in the main conversation, not by a subagent.

## File and publishing
- `docs/design/NN-short-name.html`, the next number after the highest in `docs/design/`.
- Publish it as an artifact. Later rounds republish the same file to the same URL, so the link never changes.
- Comments on artifacts do not reach the session. Ask the user to answer in chat.

## Look
- Copy tokens from the top of `app/globals.css` (sky, cream, ink, muted, primary green, gold, wood). One light look.
- Fonts: embed `docs/design/brand/lilita.woff2` and `figtree.woff2` as base64 `@font-face` named 'Levl Display' and 'Levl Body', so the board renders exactly like the app, offline too.
- Show real content from the app (real exercise names, realistic numbers), at phone (390) and desktop (1440) sizes.

## Structure
1. A short intro: what changes and why.
2. Options side by side when there is a choice, each with a one-line reason and a clear "My pick".
3. Every state that matters: empty, loading, error, long text, cardio vs strength, E vs S rank.
4. If the build must match pixels (images, cards), put the rendering code in the board and copy it to `docs/design/<topic>/` as reference for the build.
5. A closing "What I need from you" list: numbered decisions, each with my pick. After sign-off, the next round turns it into "Signed off".

## After sign-off
- Record the round in `docs/DESIGN_HISTORY.md`: what was shown, what was picked, why.
- Write or update the plan in `docs/Vn_PLAN.md`.
- No em dashes anywhere on the board.
