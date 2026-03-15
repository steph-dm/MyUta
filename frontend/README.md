# MyUta Frontend

React + Vite + Tailwind + shadcn/ui. GraphQL via Apollo Client.

## Running it

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`. Backend needs to be running on port 4000. The Vite dev server proxies `/graphql` requests to the backend automatically.

## GraphQL codegen

Types and hooks are generated from the backend schema. Config is in `codegen.yml`.

After schema changes, with the backend running:

```bash
npm run codegen
```

## i18n

English and Japanese. Translation files are in `src/i18n/locales/{en,ja}/`, using i18next.
