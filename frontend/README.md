# MyUta frontend

React 19 + TypeScript + Vite. Needs Node 22 and **npm 11** (`npm install -g npm@11`; npm 10
fails on vitest's optional peer dependencies).

```bash
npm ci
npm run dev          # http://localhost:3000, proxies /graphql and /export to :4000
npm run codegen      # types from ../backend/schema.graphql into src/gql (commit them)
npm test             # vitest
npm run lint         # ESLint (hooks, accessibility)
npm run format       # Prettier
npm run check:i18n   # translation parity, placeholders, keys used in code
npm run build        # build/ with precompressed .gz files
npm run check        # all of the above except build
```

Structure: see `../docs/architecture.md`. Translations live in `src/i18n/locales/{en,ja}`;
machine metadata in `src/lib/machines.ts` (see `../docs/adding-a-machine.md`).

Build-time variables: `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID` (analytics, optional),
`VITE_GRAPHQL_URL` (default `/graphql`).
