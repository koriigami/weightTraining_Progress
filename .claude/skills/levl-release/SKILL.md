---
name: levl-release
description: Release a Levl feature branch to production by fast-forwarding main, then confirm the Vercel deploy is live. Use only when the user has said to merge or release in this conversation.
---

# Release to production

Only run this when the user has said to merge or release in this conversation. `main` deploys to https://weight-training-progress.vercel.app.

1. Working tree clean and the branch pushed: `git status -sb`.
2. `git fetch origin main` and confirm a fast-forward: `git merge-base --is-ancestor origin/main HEAD`. If it is not, stop and tell the user (merge `main` into the branch first, never rebase or force-push).
3. `npm run verify:full`. Any failure stops the release.
4. `git push origin HEAD:main`. Retry only on network errors (2 s, 4 s, 8 s, 16 s).
5. Wait for the deploy. `/` returning 200 proves nothing, because the old build answers it too. Pick one thing only this release can answer (a new route returning its expected status, a new field in a response, a new file in `public/`) and poll it for about 4 minutes. If the release changes nothing a URL can show (docs only), say "pushed, not checked live" instead of "live".
6. If that check never passes, do not report "live". The usual cause is that Vercel built the commit as Preview, not Production (the production branch is not `main`). Ask the user to open Vercel, Deployments, and confirm the commit carries the Production badge; if it does not, they promote it (the row's menu, Promote to Production) and the check is run again.
7. If the GitHub connector is available, check the CI run for the pushed commit is green.
8. Report: the commit on `main`, what is live, how it was verified (name the thing polled), and the manual checks from `docs/QA.md` that only a real phone can do.
