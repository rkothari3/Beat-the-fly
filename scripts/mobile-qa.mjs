/**
 * Mobile viewport smoke QA for Beat the Fly.
 *
 * Requires: `npm i playwright` (or run from a temp dir that has it) and a
 * running Vite server at APP_URL (default http://127.0.0.1:5173).
 *
 *   OUT_DIR=/opt/cursor/artifacts/screenshots node scripts/mobile-qa.mjs
 *
 * Why this exists: phone layout is JS-breakpoint driven; this catches
 * regressions in home stacking, hop pad, watch mode, and desktop ≥900px.
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.APP_URL || "http://127.0.0.1:5173";
const OUT = process.env.OUT_DIR || "/tmp/beat-the-fly-mobile-qa";

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("SHOT", file);
}

async function waitPlaying(page) {
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return !t.includes("Outscore a real fly brain") && /0:\d{2}/.test(t);
  }, { timeout: 45000 });
  await page.locator('[aria-label="Hop forward"]').waitFor({ state: "visible", timeout: 10000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

  const context = await browser.newContext({ ...devices["iPhone 12 Pro"] });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  if (!(await page.evaluate(() => matchMedia("(max-width: 899px)").matches))) {
    throw new Error("Expected narrow layout on iPhone 12 Pro");
  }
  if ((await page.getByText("Tap ↑ ← · → to hop").count()) < 1) {
    throw new Error("Missing mobile hop hint");
  }
  await shot(page, "mobile-home-390.png");

  await page.locator('input[placeholder="Anonymous"]').fill("MobileDemo");
  await page.getByRole("button", { name: "Play full pathway AL to MB to CX" }).click();
  await waitPlaying(page);
  await shot(page, "mobile-playing.png");

  const before = Number(
    ((await page.locator("header").first().innerText()).match(/YOU\s+(\d+)/) || [])[1]
  );
  for (let i = 0; i < 8; i++) {
    await page.locator('[aria-label="Hop forward"]').click();
    await page.waitForTimeout(260);
  }
  const after = Number(
    ((await page.locator("header").first().innerText()).match(/YOU\s+(\d+)/) || [])[1]
  );
  console.log("score_before_after", before, after);
  if (!(after >= before)) throw new Error(`Hop pad score regress ${before} -> ${after}`);
  await shot(page, "mobile-after-hops.png");

  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator('input[placeholder="Anonymous"]').fill("");
  await page.getByRole("button", { name: "Play full pathway AL to MB to CX" }).click();
  await page.waitForFunction(() => /watch mode/i.test(document.body.innerText), {
    timeout: 45000,
  });
  await shot(page, "mobile-watch.png");
  await context.close();

  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p3 = await desk.newPage();
  await p3.goto(BASE, { waitUntil: "networkidle" });
  const narrowDesk = await p3.evaluate(() => matchMedia("(max-width: 899px)").matches);
  const deskHint = await p3.getByText("← ↑ → to hop").count();
  const mobHint = await p3.getByText("Tap ↑ ← · → to hop").count();
  if (narrowDesk || deskHint < 1 || mobHint > 0) throw new Error("Desktop layout regress");
  await shot(p3, "desktop-home-1280.png");
  await desk.close();
  await browser.close();
  console.log("MOBILE_QA_OK");
}

main().catch((e) => {
  console.error("MOBILE_QA_FAIL", e);
  process.exit(1);
});
