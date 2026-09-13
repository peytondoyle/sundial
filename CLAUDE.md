# sundial
Sky-quality app: takes browser geolocation, scores today's sky (cloud cover, humidity, visibility) and renders a sunrise/sunset phase timeline.

## Stack
- Vanilla static site — `index.html`, `script.js`, `style.css`. No framework, no bundler, no build step.
- Vercel serverless functions in `api/` (plain ESM handlers, `req`/`res`).
- Only dependency: `node-cache`. `package.json` has no `scripts` block.
- Vercel project linked in `.vercel/project.json`; remote `peytondoyle/Sundial`, branch `main`.

## How it works
- `script.js` reads coords from `navigator.geolocation`, then calls `/api/weather`, `/api/suntimes`, `/api/forecast`. It also reverse-geocodes via Nominatim directly from the browser.
- `api/weather.js` and `api/forecast.js` cascade through four providers in order: Tomorrow.io → OpenWeather → WeatherAPI → Open-Meteo. All three keys must be set or the handler 400s before any fetch: `TOMORROW_API_KEY`, `OPENWEATHER_API_KEY`, `WEATHERAPI_KEY`.
- `api/suntimes.js` hits sunrise-sunset.org (no key).
- In-handler caching is gated on `NODE_ENV !== "production"` — production is uncached.
- `api/ok.ts` is a stray env-check endpoint listing Supabase/R2 vars this app doesn't use, and imports `@vercel/node`, which isn't a declared dependency. Ignore it unless asked.

## Verify
No build, test, or lint command exists. After editing JS, syntax-check:
`for f in script.js api/*.js; do node --check "$f" || break; done`
For anything behavioral, run `vercel dev` and load the page — `/api/*` only exists under the Vercel runtime, so opening `index.html` from the filesystem gives a broken app.

## Danger Zones
- **Paid weather APIs**: every page load fans out to Tomorrow.io / OpenWeather / WeatherAPI, and production has no cache. Don't add polling, auto-refresh, or retry loops around `/api/weather` or `/api/forecast`.
- **`node_modules` is committed** and absent from `.gitignore`. It is currently missing from disk, so `git status` shows 18 pending deletions — a blanket `git add -A` will stage them. Stage files explicitly.

## Secrets

Values live in Infisical project `sundial` (envs `dev` / `staging` / `prod`), synced to the
Vercel project `sundial` (development / preview / production). There is no local dev script —
`package.json` has no `scripts` block — so there is no local runner; secrets are only exercised
through `vercel dev` or a live Vercel deployment, both pulling from Infisical. Never hand-edit
Vercel env and never print a value: the rules are in the workspace CLAUDE.md
(`~/Documents/Development/CLAUDE.md`, `## Secrets`).
