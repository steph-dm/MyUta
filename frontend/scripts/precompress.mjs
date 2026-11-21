// Writes .gz next to the built assets so nginx serves them pre-compressed
// (gzip_static), at maximum compression, instead of compressing on every request.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dir = new URL("../build/", import.meta.url).pathname;
const walk = (d) =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );

let count = 0;
for (const file of walk(dir)) {
  if (!/\.(js|css|html|svg|json|txt|webmanifest)$/.test(file)) continue;
  const buf = readFileSync(file);
  if (buf.length < 1024) continue;
  writeFileSync(`${file}.gz`, gzipSync(buf, { level: 9 }));
  count++;
}
console.log(`precompressed ${count} files`);
