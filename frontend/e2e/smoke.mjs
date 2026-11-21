// Browser smoke test of a running stack (frontend through nginx + backend + database).
// See README.md in this folder. Not part of CI (needs a seeded database and a browser).
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL ?? EMAIL;
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo-karaoke-2026";
const DB = process.env.E2E_DATABASE_URL; // optional: enables the session-expiry step
const PNG = new URL("../public/logo192.png", import.meta.url).pathname;
const HEIC = process.env.E2E_HEIC_FILE; // optional: a .heic photo for the conversion step
const psql = (sql) => {
  const r = spawnSync("psql", [DB, "-q", "-c", sql]);
  if (r.status !== 0) throw new Error("psql: " + r.stderr);
};
async function launch() {
  if (process.env.CHROME_PATH)
    return puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const { default: chromium } = await import("@sparticuz/chromium");
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    problems.push(`${m.type()}: ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => {
  if (!r.url().includes("youtube"))
    problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
});
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("youtube"))
    problems.push(`HTTP ${r.status()} ${r.url()}`);
});
const step = async (name, fn) => {
  try {
    await fn();
    console.log("✓", name);
  } catch (e) {
    console.log("✗", name, "-", e.message.split("\n")[0]);
    process.exitCode = 1;
    await page.screenshot({ path: `shots/fail-${name.replace(/\W+/g, "_")}.png` }).catch(() => {});
    await page.goto("about:blank").catch(() => {});
  }
};
const text = () => page.evaluate(() => document.body.innerText);

if (DB) psql(`UPDATE users SET language = 'en' WHERE email = '${EMAIL}'`);
await step("landing renders", async () => {
  await page.goto(B + "/", { waitUntil: "networkidle0" });
  await page.waitForSelector("h1");
  const h1 = await page.$eval("h1", (e) => e.textContent);
  if (!/karaoke|カラオケ/i.test(h1)) throw new Error("h1: " + h1);
  await page.screenshot({ path: "shots/1-landing.png" });
});
await step("protected route redirects with ?next=", async () => {
  await page.goto(B + "/songs?x=1", { waitUntil: "networkidle0" });
  if (!page.url().includes("/login?next=%2Fsongs%3Fx%3D1")) throw new Error(page.url());
});
await step("login returns to the requested page", async () => {
  await page.type("#login-email", EMAIL);
  await page.type("#login-password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/songs" && location.search === "?x=1", {
    timeout: 8000,
  });
  await page.waitForFunction(() => document.body.innerText.includes("songs in your library"));
  await page.screenshot({ path: "shots/2-songs.png" });
});
await step("dashboard stats and machine sections", async () => {
  await page.goto(B + "/dashboard", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("Recent takes"));
  const t = await text();
  for (const s of ["Takes", "Singing days", "DAM", "JOYSOUND", "K-STAGE"])
    if (!t.includes(s)) throw new Error("missing " + s);
  const current = await page.$eval('nav a[aria-current="page"]', (e) => e.textContent);
  if (!current.includes("Dashboard")) throw new Error("aria-current " + current);
  await page.screenshot({ path: "shots/3-dashboard.png", fullPage: true });
});
await step("log a take with a new song", async () => {
  await page.goto(B + "/reviews", { waitUntil: "networkidle0" });
  await page.click("xpath/.//button[contains(., 'Log a take')]");
  await page.waitForSelector('[role="dialog"]');
  await page.click('[role="dialog"] button[role="combobox"]'); // artist
  await page.keyboard.type("YOASOBI");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[cmdk-item]")].some((e) => !e.textContent.startsWith("Add")),
  );
  await page.evaluate(() =>
    [...document.querySelectorAll("[cmdk-item]")]
      .find((e) => !e.textContent.startsWith("Add"))
      .click(),
  );
  const combos = await page.$$('[role="dialog"] button[role="combobox"]');
  await combos[1].click(); // song
  await page.keyboard.type(`E2Eテスト曲 ${Date.now() % 100000}`);
  await page.click("xpath/.//*[@cmdk-item][contains(., 'Add')]");
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]').innerText.includes("Genres"),
  );
  const combos2 = await page.$$('[role="dialog"] button[role="combobox"]');
  await combos2[2].click(); // genres
  await page.click("xpath/.//*[@cmdk-item][contains(., 'Pop')]");
  await page.keyboard.press("Escape");
  await page.type('[role="dialog"] input[type="number"][max="100"][step="0.001"]', "87.654");
  await page.click("xpath/.//button[@role='radio'][contains(., 'K-STAGE')]");
  await page.click("xpath/.//button[@type='submit'][contains(., 'Save take')]");
  await page.waitForFunction(() => document.body.innerText.includes("Take saved"), {
    timeout: 8000,
  });
  await page.screenshot({ path: "shots/4-after-log.png" });
});
await step("new song page with lazy chart", async () => {
  await page.goto(B + "/songs", { waitUntil: "networkidle0" });
  await page.type('input[type="search"]', "e2eてすと");
  await page.waitForFunction(() => document.body.innerText.includes("E2Eテスト曲"));
  await page.click("xpath/(.//a[contains(., 'E2Eテスト曲')])[1]");
  await page.waitForFunction(() => location.pathname.startsWith("/songs/"));
  await page.waitForSelector(".recharts-surface", { timeout: 8000 });
  await page.screenshot({ path: "shots/5-song.png", fullPage: true });
});
await step("switch to Japanese (saved to profile, html lang)", async () => {
  await page.goto(B + "/profile", { waitUntil: "networkidle0" });
  await page.click("xpath/.//label[.//span[@lang='ja']]");
  await page.waitForFunction(
    () =>
      document.documentElement.lang === "ja" && document.body.innerText.includes("ダッシュボード"),
  );
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "shots/6-profile-ja.png" });
  await page.click("xpath/.//label[.//span[@lang='en']]");
  await page.waitForFunction(
    () => document.documentElement.lang === "en" && document.body.innerText.includes("Dashboard"),
  );
});
await step("Android share target: shared photo opens Log a take with it attached", async () => {
  await page.goto(B + "/dashboard", { waitUntil: "networkidle0" });
  // wait until the service worker controls the page (as in the installed PWA)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller)))
    await page.reload({ waitUntil: "networkidle0" });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller)))
    throw new Error("no service worker control");
  // Android sends a multipart POST navigation to share_target.action; reproduce it with a form.
  await page.evaluate(() => {
    const f = document.createElement("form");
    f.method = "POST";
    f.action = "/share-target";
    f.enctype = "multipart/form-data";
    f.id = "share-sim";
    const i = document.createElement("input");
    i.type = "file";
    i.name = "image";
    f.appendChild(i);
    const t = document.createElement("input");
    t.type = "hidden";
    t.name = "title";
    t.value = "Photo";
    f.appendChild(t);
    document.body.appendChild(f);
  });
  const input = await page.$("#share-sim input[type=file]");
  await input.uploadFile(PNG);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.$eval("#share-sim", (f) => f.submit()),
  ]);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[role="group"]')].some(
        (g) =>
          g.getAttribute("aria-label") === "Result photo" && g.textContent.includes("logo192.png"),
      ),
    { timeout: 8000 },
  );
  const url = await page.evaluate(() => location.pathname + location.search);
  if (url !== "/reviews") throw new Error("url not cleaned: " + url);
  const dialog = await page.$eval('[role="dialog"]', (d) => d.innerText);
  // This test server has no Anthropic key, so the dialog says reading is disabled; with a key it says "Photo received from Share".
  if (
    !dialog.includes("Log a take") ||
    !/Photo received from Share|not enabled on this server/.test(dialog)
  )
    throw new Error("dialog: " + dialog.slice(0, 300));
  const cached = await page.evaluate(
    async () => (await (await caches.open("myuta-share")).keys()).length,
  );
  if (cached !== 0) throw new Error("shared image left in cache: " + cached);
  await page.screenshot({ path: "shots/9-share-target.png" });
  await page.keyboard.press("Escape"); // dirty dialog asks before discarding
  await page.click("xpath/.//button[contains(., 'Discard')]");
});
if (HEIC)
  await step("Android share target: HEIC photo is converted to JPEG and previewed", async () => {
    await page.goto(B + "/dashboard", { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      const f = document.createElement("form");
      f.method = "POST";
      f.action = "/share-target";
      f.enctype = "multipart/form-data";
      f.id = "share-heic";
      const i = document.createElement("input");
      i.type = "file";
      i.name = "image";
      f.appendChild(i);
      document.body.appendChild(f);
    });
    const input = await page.$("#share-heic input[type=file]");
    await input.uploadFile(HEIC);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.$eval("#share-heic", (f) => f.submit()),
    ]);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="group"]')].some((g) =>
          g.textContent.includes("example.jpg"),
        ),
      { timeout: 30000 },
    );
    const preview = await page.waitForFunction(
      () => {
        const img = document.querySelector('[role="group"] img');
        return img && img.complete && img.naturalWidth > 0
          ? { w: img.naturalWidth, h: img.naturalHeight }
          : null;
      },
      { timeout: 10000 },
    );
    console.log("   HEIC preview decoded:", JSON.stringify(await preview.jsonValue()));
    await page.screenshot({ path: "shots/10-share-heic.png" });
    await page.keyboard.press("Escape");
    await page.click("xpath/.//button[contains(., 'Discard')]");
  });
if (DB)
  await step("session expiry shows the re-login dialog and keeps the page", async () => {
    await page.goto(B + "/reviews", { waitUntil: "networkidle0" });
    psql("DELETE FROM sessions");
    await new Promise((r) => setTimeout(r, 11000)); // server-side session cache is 10 s
    await page.click("xpath/.//button[contains(., 'Log a take')]");
    await page.waitForSelector('[role="dialog"]');
    await page.click('[role="dialog"] button[role="combobox"]'); // artist search -> request -> session expired
    await page.waitForFunction(() => document.body.innerText.includes("Your session has ended"), {
      timeout: 8000,
    });
    const email = await page.$eval("#login-email", (e) => e.value);
    if (email !== EMAIL) throw new Error("e-mail not prefilled: " + email);
    const focused = await page.evaluate(() => document.activeElement?.id);
    if (focused !== "login-password") throw new Error("focus on " + focused);
    if (!page.url().endsWith("/reviews")) throw new Error("navigated away: " + page.url());
    await page.screenshot({ path: "shots/7-reauth.png" });
    await page.keyboard.type(PASSWORD);
    await page.click("xpath/.//button[@type='submit'][contains(., 'Sign in')]");
    await page.waitForFunction(() => !document.body.innerText.includes("Your session has ended"), {
      timeout: 8000,
    });
  });
await step("mobile: closed drawer is inert, opens with the menu button", async () => {
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(B + "/dashboard", { waitUntil: "networkidle0" });
  const inert = await page.$eval("#app-sidebar", (e) => e.inert);
  if (!inert) throw new Error("drawer not inert");
  await page.click('button[aria-controls="app-sidebar"]');
  await page.waitForFunction(() => !document.getElementById("app-sidebar").inert);
  await page.screenshot({ path: "shots/8-mobile-menu.png" });
});
await step("404 is public", async () => {
  const cdp = await page.createCDPSession();
  await cdp.send("Network.clearBrowserCookies"); // signed out
  await page.goto(B + "/no/such/page", { waitUntil: "networkidle0" });
  if (!(await page.evaluate(() => document.body.innerText)).includes("404"))
    throw new Error("no 404");
  if (!page.url().endsWith("/no/such/page")) throw new Error("redirected: " + page.url());
});
const failed = process.exitCode;
console.log(
  "\nconsole/network problems:",
  problems.length ? "\n  " + [...new Set(problems)].join("\n  ") : "none",
);
await browser.close();
