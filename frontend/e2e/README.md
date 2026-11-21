# Browser smoke test

Drives the real app in headless Chromium: login with `?next=`, dashboard, logging a take,
song page with chart, language switch, the Android share target (PNG, and HEIC when a sample
is given), the session-expiry dialog, the mobile menu and the public 404 page.

```bash
make up && make seed                     # or any running stack with the demo data
cd frontend
npm i --no-save puppeteer-core @sparticuz/chromium   # or set CHROME_PATH to a local Chrome
mkdir -p e2e/shots
BASE_URL=http://localhost:3000 \
E2E_DATABASE_URL=postgresql://myuser:…@localhost:5432/myuta \
E2E_HEIC_FILE=/path/to/photo.heic \
node e2e/smoke.mjs
```

`E2E_DATABASE_URL` (optional) lets the test reset the demo user's language and delete
sessions for the expiry step; it deletes **all** sessions, so never point it at production.
Screenshots are written to `e2e/shots/`. The share steps need the production build (the
service worker is not registered by `npm run dev`).
