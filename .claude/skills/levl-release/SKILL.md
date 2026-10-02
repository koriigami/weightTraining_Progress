---
name: levl-release
description: Release a Levl feature branch to production by fast-forwarding main, then confirm the Vercel deploy is live. Use only when the user has said to merge or release in this conversation.
---

# Release to production

Only run this when the user has said to merge or release in this conversation. `main` deploys to https://weight-training-progress.vercel.app.

1. Working tree clean and the branch pushed: `git status -sb`.
2. `git fetch origin main` and confirm a fast-forward: `git merge-base --is-ancestor origin/main HEAD`. If it is not, stop and tell the user (merge `main` into the branch first, never rebase or force-push).
3. `npm run verify:full`. Any failure stops the release.
   Then ask: does this release change something people see, or the XP rules? If so, add an
   update to `lib/news.ts` (newest first, with its pictures in `public/news/`), screenshot it
   with `/?news=1`, and show it to the user before it goes live. Releases without one show nothing.
4. `git push origin HEAD:main`. Retry only on network errors (2 s, 4 s, 8 s, 16 s).
5. Wait for the deploy: poll a URL that only exists in this release (a new file in `public/`, a new route) until it returns 200, at most about 4 minutes. Then check `/` returns 200.
6. If the GitHub connector is available, check the CI run for the pushed commit is green.
7. Report: the commit on `main`, what is live, how it was verified, and the manual checks from `docs/QA.md` that only a real phone can do.
