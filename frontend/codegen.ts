import type { CodegenConfig } from "@graphql-codegen/cli";

// Types are generated from the backend schema file, no running server needed.
// Run `npm run codegen` after changing backend/schema.graphql or any document.
const config: CodegenConfig = {
  schema: "../backend/schema.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/gql/**/*"],
  ignoreNoDocuments: false,
  generates: {
    "src/gql/": {
      preset: "client",
      presetConfig: { fragmentMasking: false },
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        strictScalars: true,
        scalars: { Date: "string", DateTime: "string", Upload: "File" },
      },
    },
  },
  hooks: { afterAllFileWrite: ["prettier --write"] },
};

export default config;
