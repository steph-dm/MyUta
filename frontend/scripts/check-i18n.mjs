// Checks the translation files:
//  1. every language has the same keys (plural forms _one/_other count as one key),
//  2. the same {{placeholders}} are used in every language,
//  3. every literal t("ns:key") / t("key") in the source exists.
// Run: npm run check:i18n  (also in CI)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../src/", import.meta.url).pathname;
const localeDir = join(root, "i18n/locales");
const languages = readdirSync(localeDir);
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, "");
const vars = (s) =>
  [...String(s).matchAll(/\{\{(\w+)\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

const data = {};
for (const lng of languages) {
  for (const file of readdirSync(join(localeDir, lng))) {
    const ns = file.replace(/\.json$/, "");
    for (const [k, v] of flat(JSON.parse(readFileSync(join(localeDir, lng, file), "utf8")))) {
      (data[lng] ??= {})[`${ns}:${k}`] = v;
    }
  }
}

let problems = 0;
const report = (msg) => {
  problems++;
  console.error(`✗ ${msg}`);
};
const [ref, ...others] = languages;
const keysOf = (lng) => new Set(Object.keys(data[lng]).map(base));
for (const lng of others) {
  const a = keysOf(ref);
  const b = keysOf(lng);
  for (const k of a) if (!b.has(k)) report(`${lng} is missing ${k}`);
  for (const k of b) if (!a.has(k)) report(`${ref} is missing ${k}`);
  for (const [k, v] of Object.entries(data[ref])) {
    if (k in data[lng] && vars(v) !== vars(data[lng][k]))
      report(`${k}: placeholders differ between ${ref} and ${lng}`);
  }
}

// Literal keys used in the code.
const known = keysOf(ref);
const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== "gql" && f !== "locales") walk(p);
    } else if (/\.(ts|tsx)$/.test(f) && !f.endsWith(".test.tsx") && !f.endsWith(".test.ts"))
      files.push(p);
  }
};
walk(root);
for (const file of files) {
  const src = readFileSync(file, "utf8");
  // The namespace of a t() call is the one of the closest useTranslation() before it
  // (each component calls the hook itself; withTranslation() defaults to "common").
  const hooks = [...src.matchAll(/useTranslation\((?:"(\w+)")?\)|withTranslation\(\)/g)].map(
    (m) => ({ at: m.index, ns: m[1] ?? "common" }),
  );
  for (const m of src.matchAll(/\bt\(\s*"([\w.:-]+)"/g)) {
    const raw = m[1];
    const hook = hooks.filter((h) => h.at < m.index).pop();
    const key = raw.includes(":") ? raw : `${hook?.ns ?? "common"}:${raw}`;
    if (!known.has(key))
      report(`${file.replace(root, "src/")}: unknown key "${raw}" (looked up as ${key})`);
  }
}

if (problems) {
  console.error(`\n${problems} translation problem(s).`);
  process.exit(1);
}
console.log(
  `Translations OK: ${languages.join(", ")} · ${known.size} keys · ${files.length} source files checked.`,
);
