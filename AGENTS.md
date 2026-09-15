Sky-quality app: takes browser geolocation, scores today's sky (cloud cover, humidity, visibility) and renders a sunrise/sunset phase timeline. Vanilla static site plus Vercel serverless functions in `api/`; no framework, no bundler, no build step.

## Rules for Codex (Astra v2 lane)

Read `CLAUDE.md` in full before starting; it carries the stack, the conventions and the deploy rule.
This section is the short version that applies to every task you take on this repository.

**Where you work.** You are given a pull request. Work only on that PR's branch. Never push to
`main` or `release`, never open a second PR for the same task, never rebase or force-push.

**Verify before you finish.** Run, in this order, and paste each command's last 20 lines in the
PR body under a `## Gates` heading:
```
no gates: static site
```
`npm run build` is not run here: the Vercel preview build on your PR is the build gate, the reviewer checks it.
A red gate means the task is not done. Do not weaken or skip a test to make it pass.

**Paths you never change.** `drizzle/`, `supabase/`, `prisma/`, `db/migrations/`,
`cloud/db/migrations/`, `.github/`, `.vercel/`, `.infisical.json`, any `.env*`, `package-lock.json`
except as a side effect of a dependency the task explicitly asks for. If a task needs a schema
change, write the migration file, do not run it, and say so in the PR body under `## Migration`.
The review rejects any PR that touches these paths without that heading.

**No credentials.** This environment has none and you must not look for any: no database URL, no
API key, no token. Tests run against in-process or local stores only. A test that needs a hosted
service is skipped, and you say which under `## Skipped`.

**Scope.** Do exactly what the PR's task asks. No adjacent cleanup, no refactors, no new
dependencies unless the task names them, no new abstractions. One logical change per commit, plain
commit messages, no co-author or generated-with trailers.

**PR body contract.** Keep the task text at the top. Then `## What changed` (one line per file),
`## Gates`, `## Skipped` (or "none"), `## Migration` (or "none"), `## Questions` (anything you
could not decide; the reviewer answers as a PR comment and re-triggers you with `@codex`).

**Platform parity.** If the app has more than one surface (phone and desktop layouts, web and
native), the change lands on all of them or the PR says why it cannot.
