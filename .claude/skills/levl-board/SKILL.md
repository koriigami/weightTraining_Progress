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

## Design rules (the user has had to repeat these; never break them)
- **Start from the current screen.** Rebuild what the app shows today, faithfully, and change the least that answers the ask. Never bring back an older or rejected design, and never redesign parts nobody asked about ("adding two buttons on top is fine, changing the lower elements is not").
- **Real component sizes only**, copied from `app/globals.css`:
  - buttons `.wt-btn` 48 px, `.wt-btn-sm` 38 px (44 px on phones), `.wt-btn-lg` 56 px, the dashed `.wt-btn-g` 42 px;
  - chips `.wt-chip` 36 px.

  No custom taller buttons, no two-line buttons, no card-sized tap targets dressed as buttons.
- **Buttons side by side are equal width**, every time, on every screen (`1fr 1fr`, never `1.4fr 1fr`). Check it on every mock before publishing.
- **Buttons never act as tabs.** A button does what it says. Content that switches in place needs a real segmented control, and only when the user asked for one.
- **Pills and tags are readable:** at least 20 px tall, 11 px text, padding of 8 px or more on each side.
- **Plain English copy.** Read every label aloud. If it sounds odd ("Log one I did"), rewrite it. Buttons say what happens.
- **Fewer entry points.** Before adding a button to many screens, propose the smallest set of places and say why each one is needed.

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
