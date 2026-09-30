# Agents and skills for Levl

What runs today, what to add later and when, and what we deliberately leave out.
Written on 30 September 2026 from the build history of v7 to v9 and a web survey of
how software and consumer-app teams use agents (sources at the end).

## How we decide

- **Start from repeated pain.** Add a helper when the same brief or the same manual
  steps come up a third time, not because other teams have one.
- **Cheapest thing that works:** a script beats a skill, a skill beats an agent.
  Deterministic steps (checks, screenshots, releases) are code. Agents are for work
  that needs judgement and would flood the main conversation.
- **One agent, one job.** No overlapping roles, no generic "PM", "architect" or
  "tester" agents. The main conversation already plans, designs and reviews.
- **People approve side effects.** Anything that deploys, deletes, sends or changes
  stored data waits for the user's word in the conversation.
- **Every agent names the Levl risk it reduces and the trigger that justifies it.**

## In use now

| Name | Kind | Job | Human checkpoint |
|---|---|---|---|
| `CLAUDE.md` | Rules file | Conventions, commands, test policy, workflow. Every session and agent reads it | Changes reviewed in the conversation |
| `npm run verify` / `verify:full` | Scripts | Type check, full unit suite, em dash check (about 10 s), plus the build | None, they pass or fail |
| `npm run qa` (`scripts/qa/`) | Script | Starts the app, signs in over HTTP, seeds data, screenshots routes at 390 and 1440, reports console errors and overflow | Screenshots are looked at |
| CI (`.github/workflows/ci.yml`) | GitHub check | `verify` and the build on every push | A red check blocks the release |
| `levl-builder` | Agent (Sonnet) | Builds one signed-off plan stage: code, tests, docs, verify, local commit | Main conversation reviews the diff and pushes |
| `levl-ui-check` | Agent (Sonnet, read-only tools) | Screenshots routes and flows, compares with the board, reports differences. Never edits code | Findings go back to the main conversation |
| `levl-release` | Skill | Fast-forward `main`, verify, push, wait for the deploy, report | Only when the user says to merge |
| `levl-board` | Skill | Conventions for design boards and rounds | The user signs off every board |
| `/code-review`, `/security-review` | Built in | Fresh-context review of a diff | Used when a change touches auth, data or money |

Design, planning and review stay in the main conversation with the user. That is where
decisions are made, so it is not delegated.

## Add later, when the trigger fires

Ordered by how soon the trigger is likely. None of these should be built early.

### 1. XP integrity check (skill plus a script)
- **Trigger:** the next change to scoring, badges, goal rewards or rank thresholds.
- **Why Levl needs it:** XP and rank are the product. A rule change silently
  re-scores everyone's history (it happened in v8). Strava had to build integrity
  checks once leaderboards mattered.
- **Job:** a script replays fixture histories (`tests/fixtures/`) under the old and
  new rules and prints the XP, level and rank change per person; the skill has the
  reviewer look for farming loopholes against `docs/design/xp-reference.html`.
- **Checkpoint:** the user signs off the before and after table.

### 2. Migration review (skill)
- **Trigger:** any change to the stored state shape or Redis keys.
- **Why:** one bad migration loses real training history. The v8 plan removal needed
  a backup key, a migration on read and idempotence tests; a well-known 2025 incident
  had an agent wipe a production database.
- **Job:** checklist and dry run against fixtures: backup written once, migration
  idempotent, old clients still read, rollback path written down. It never touches
  production data.
- **Checkpoint:** the user approves; the backup exists before release.

### 3. Weekly product report (scheduled routine plus skill)
- **Trigger:** about 20 active testers, so Insights groups clear the 5-person rule.
- **Job:** every Monday, read the aggregate Insights numbers and write a short report:
  active people, workouts per week, retention by signup week, rank spread, where
  people stop. Read-only.
- **Checkpoint:** the founder reads it and decides.

### 4. Feedback and waitlist triage (agent)
- **Trigger:** public launch, or more than about 30 feedback items a week.
- **Needs first:** an in-app feedback box (not built yet).
- **Job:** group feedback and waitlist answers into themes with counts and quotes,
  draft replies.
- **Checkpoint:** a person sends every reply. No auto-replies about accounts or
  health data.

### 5. Error triage (agent)
- **Trigger:** error monitoring is set up and real users are on it.
- **Job:** from an error and the recent commits, find the likely cause and draft a
  fix on a branch.
- **Checkpoint:** normal review; nothing merges on its own.

### 6. Privacy request helper (script plus skill)
- **Trigger:** the first data access or deletion request, and before India's DPDP
  Rules apply in full (about May 2027 by the survey's reading; confirm with counsel).
- **Job:** list every key for a person (`state`, `profile`, backups), export them as
  JSON, and produce a deletion checklist.
- **Better still:** build in-app export and account deletion (see below), so this is
  rarely needed.

### 7. Pull request review in CI
- **Trigger:** a second contributor, or moving to pull requests for every change.
- **Job:** the built-in review on each pull request, told to flag correctness and
  missed requirements only. Studies show many AI review comments are rejected as noise
  when reviewers are asked for everything.

## Not adding, and why

- **Generic PM, architect or tester agents.** They overlap with the main conversation
  and with each other. The survey found single-job agents work and overlapping roles
  confuse routing.
- **A support chatbot that answers users.** Tiny user base, health-adjacent data, and
  public cases where AI support quality dropped. Draft-only triage (item 4) comes first.
- **Marketing, app store and SEO content agents.** No store listing yet. Revisit at
  store launch.
- **Community moderation.** There are no social features.
- **Lifecycle messaging agents.** Needs notifications and enough users to run
  experiments. Duolingo's results come from huge scale and human-written messages.
- **Localisation.** English only for now.
- **A performance agent.** A bundle size budget in CI is a script, not an agent.

## What this suggests for the next scopes

What growing consumer fitness apps invest in beyond features, mapped to Levl:

1. **Account deletion and data export in the app.** Required by both app stores if
   accounts can be created, expected under the DPDP Act and GDPR, and it replaces the
   email-only process in the Privacy Policy. A launch blocker.
2. **In-app feedback.** A "Send feedback" entry in Settings, stored per person. The
   cheapest source of roadmap signal, and the input item 4 needs.
3. **Product analytics events.** Privacy-friendly events for sign-up, first workout,
   week 1 and week 4 retention, shares. Owner Insights covers totals; events show where
   people drop.
4. **Error monitoring.** Catch crashes on phones we cannot test automatically. Enables
   item 5.
5. **XP integrity guards.** Flag implausible entries (a 400 kg curl, a 3-minute 20 km
   run) before any leaderboard or social feature exists.
6. **Reminders.** Web push for a weekly goal nudge, then simple experiments once there
   are enough people.
7. **Store readiness.** Packaging the web app for the stores later, with items 1 and 4
   done first.

## Sources

Vendor figures are the vendor's own claims.

- Claude Code docs: [subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), [best practices](https://code.claude.com/docs/en/best-practices), [GitHub Actions](https://code.claude.com/docs/en/github-actions)
- Anthropic: [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), [automated security reviews](https://www.anthropic.com/news/automate-security-reviews-with-claude-code)
- AI code review acceptance study: [arXiv 2607.03316](https://arxiv.org/abs/2607.03316)
- DORA 2025, AI-assisted software development: [report](https://research.google/pubs/dora-2025-state-of-ai-assisted-software-development-report/)
- Error triage: [Sentry Seer](https://blog.sentry.io/seer-sentrys-ai-debugger-is-generally-available/) (vendor)
- Support: [Klarna brings back human agents](https://www.fortune.com/2025/05/09/klarna-ai-humans-return-on-investment)
- Database incident: [Replit agent wiped a production database](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure)
- Leaderboard integrity: [Strava on AI against cheating](https://techcrunch.com/2024/05/16/strava-taps-ai-to-weed-out-leaderboard-cheats-unveils-family-plan-dark-mode-and-more)
- Lifecycle: [Duolingo notification bandit (KDD 2020)](https://research.duolingo.com/papers/yancey.kdd20.pdf)
- Account deletion: [Google Play policy](https://support.google.com/googleplay/android-developer/answer/13327111)
- DPDP Rules 2025 summary: [SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/) (not legal advice)
