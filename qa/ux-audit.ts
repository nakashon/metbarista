/**
 * mbrista UX QA Audit Script
 * Browses every page, screenshots full-page, checks for UX issues.
 * READ-ONLY — never modifies source files, never touches git.
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "../qa-screenshots");
const MACHINE_IP = "192.168.86.28";

interface Finding {
  page: string;
  severity: "error" | "warn" | "info";
  message: string;
}

const findings: Finding[] = [];
const screenshots: { page: string; file: string }[] = [];

function find(page: string, severity: Finding["severity"], message: string) {
  findings.push({ page, severity, message });
}

async function shot(page: Page, name: string, label: string) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push({ page: label, file });
  console.log(`  📸 ${label} → ${path.basename(file)}`);
}

async function checkPage(page: Page, url: string, label: string) {
  console.log(`\n🔍 ${label} (${url})`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 12000 });
  await page.waitForTimeout(600);

  // Check background is dark (not white)
  const bg = await page.evaluate(() =>
    window.getComputedStyle(document.body).backgroundColor
  );
  if (bg === "rgb(255, 255, 255)" || bg === "rgba(0, 0, 0, 0)") {
    find(label, "error", `Background is white/transparent: ${bg} — dark theme not applied`);
  } else {
    find(label, "info", `✓ Dark bg: ${bg}`);
  }

  // Check for "undefined" text visible on page
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (bodyText.match(/\bundefined\b/) && !bodyText.includes("font-undefined")) {
    find(label, "warn", `"undefined" text visible on page`);
  }

  // Check no horizontal overflow
  const hasOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  if (hasOverflow) {
    find(label, "warn", `Horizontal overflow detected`);
  }

  await shot(page, label, label);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });

  // Inject machine IP into localStorage before any page loads
  await context.addInitScript((ip) => {
    localStorage.setItem("mbrista_machine_ip", ip);
  }, MACHINE_IP);

  const page = await context.newPage();

  console.log("=".repeat(60));
  console.log("  mbrista UX Audit — READ ONLY, NO GIT CHANGES");
  console.log("  Base:", BASE, "| Machine IP:", MACHINE_IP);
  console.log("=".repeat(60));

  // 1. Landing
  await checkPage(page, `${BASE}/`, "01-home");
  const heroText = await page.locator("h1").first().innerText().catch(() => "");
  find("01-home", heroText.length > 5 ? "info" : "warn", `Hero h1: "${heroText.slice(0, 70)}"`);
  const ctaCount = await page.locator("button, a").filter({ hasText: /connect|browse|profile/i }).count();
  find("01-home", ctaCount >= 2 ? "info" : "warn", `CTA elements: ${ctaCount}`);

  // 2. Dashboard — wait for API
  await checkPage(page, `${BASE}/dashboard`, "02-dashboard");
  await page.waitForTimeout(3000);
  await shot(page, "02-dashboard-loaded", "02-dashboard-loaded");
  const machineVisible = await page.locator("text=MeticulousDelectablePressure").count();
  find("02-dashboard", machineVisible > 0 ? "info" : "warn",
    machineVisible > 0 ? "✓ Machine name loaded" : "Machine name not found (API unreachable from headless?)");
  const actionBtns = await page.locator("button").filter({ hasText: /preheat|tare|purge|start|stop/i }).count();
  find("02-dashboard", actionBtns >= 3 ? "info" : "error", `Action buttons: ${actionBtns} (need ≥3)`);

  // 3. History
  await checkPage(page, `${BASE}/history`, "03-history");
  await page.waitForTimeout(2500);
  await shot(page, "03-history-loaded", "03-history-loaded");
  const shotLinks = await page.locator("a[href*='/shot']").count();
  find("03-history", shotLinks > 0 ? "info" : "warn", `Shot rows: ${shotLinks}`);

  // 4. Shot detail
  const firstShot = await page.locator("a[href*='/shot']").first().getAttribute("href").catch(() => null);
  if (firstShot) {
    await checkPage(page, `${BASE}${firstShot}`, "04-shot");
    await page.waitForTimeout(1500);
    await shot(page, "04-shot-loaded", "04-shot-loaded");
    const charts = await page.locator("svg.recharts-surface").count();
    find("04-shot", charts > 0 ? "info" : "error", `Recharts charts: ${charts}`);
    const statCards = await page.locator("text=/duration|weight|pressure|flow/i").count();
    find("04-shot", statCards >= 4 ? "info" : "warn", `Stat labels visible: ${statCards}`);
  }

  // 5. Profiles
  await checkPage(page, `${BASE}/profiles`, "05-profiles");
  await page.waitForTimeout(2500);
  await shot(page, "05-profiles-loaded", "05-profiles-loaded");
  const profileLinks = await page.locator("a[href*='/profile']").count();
  find("05-profiles", profileLinks > 0 ? "info" : "warn", `Profile cards: ${profileLinks}`);

  // Test filter interaction
  const filterBtn = await page.locator("button").filter({ hasText: /^pressure$/i }).first();
  if (await filterBtn.count() > 0) {
    await filterBtn.click();
    await page.waitForTimeout(400);
    await shot(page, "05-profiles-filtered", "05-profiles-filtered");
    find("05-profiles", "info", "✓ Filter pill interaction works");
  }

  // 6. Profile detail
  const firstProfile = await page.locator("a[href*='/profile']").first().getAttribute("href").catch(() => null);
  if (firstProfile) {
    await checkPage(page, `${BASE}${firstProfile}`, "06-profile");
    await page.waitForTimeout(1000);
    await shot(page, "06-profile-loaded", "06-profile-loaded");
    const stageItems = await page.locator("text=/over (time|weight|piston)/i").count();
    find("06-profile", stageItems > 0 ? "info" : "warn", `Stage items: ${stageItems}`);
  }

  // 7. Share card
  const profileId = firstProfile?.match(/id=([^&]+)/)?.[1];
  if (profileId) {
    await checkPage(page, `${BASE}/share?id=${profileId}`, "07-share");
    await page.waitForTimeout(1500);
    await shot(page, "07-share-loaded", "07-share-loaded");
    const oepf = await page.locator("text=OEPF").count();
    find("07-share", oepf > 0 ? "info" : "warn", `OEPF badge: ${oepf > 0 ? "✓" : "missing"}`);
    const copyBtns = await page.locator("button").filter({ hasText: /copy/i }).count();
    find("07-share", copyBtns >= 1 ? "info" : "warn", `Copy buttons: ${copyBtns}`);
  }

  // 8. Compare — select 2 shots
  await checkPage(page, `${BASE}/compare`, "08-compare");
  await page.waitForTimeout(2500);
  await shot(page, "08-compare-loaded", "08-compare-loaded");
  // Click first 2 selectable shot rows
  const selectableRows = await page.locator("button").filter({ hasText: /#\d/ }).all();
  if (selectableRows.length >= 2) {
    await selectableRows[0].click(); await page.waitForTimeout(200);
    await selectableRows[1].click(); await page.waitForTimeout(800);
    await shot(page, "08-compare-chart", "08-compare-chart");
    const chart = await page.locator("svg.recharts-surface").count();
    find("08-compare", chart > 0 ? "info" : "error", `Comparison chart: ${chart > 0 ? "✓ rendered" : "not rendered"}`);
  }

  // 9. Live
  await checkPage(page, `${BASE}/live`, "09-live");
  await page.waitForTimeout(1000);
  const liveIndicator = await page.locator("text=/connecting|connected|no machine/i").count();
  find("09-live", liveIndicator > 0 ? "info" : "warn", `Live status indicator: ${liveIndicator > 0 ? "✓" : "missing"}`);

  // 10. Community
  await checkPage(page, `${BASE}/community`, "10-community");
  const discordLinks = await page.locator("a[href*='discord']").count();
  find("10-community", discordLinks > 0 ? "info" : "warn", `Discord links: ${discordLinks}`);

  // 11. Mobile (390px iPhone 14)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot(page, "11-mobile-home", "11-mobile-home");

  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await shot(page, "11-mobile-dashboard", "11-mobile-dashboard");

  await page.goto(`${BASE}/history`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await shot(page, "11-mobile-history", "11-mobile-history");

  const mobileOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  find("11-mobile", mobileOverflow ? "error" : "info",
    mobileOverflow ? "❌ Horizontal overflow on mobile" : "✓ No horizontal overflow on mobile");

  await browser.close();

  // ── Final Report ──
  console.log("\n" + "=".repeat(60));
  console.log("  UX AUDIT REPORT");
  console.log("=".repeat(60));

  const errors = findings.filter((f) => f.severity === "error");
  const warns  = findings.filter((f) => f.severity === "warn");
  const infos  = findings.filter((f) => f.severity === "info");

  if (errors.length) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach((f) => console.log(`   [${f.page}] ${f.message}`));
  }
  if (warns.length) {
    console.log(`\n⚠️  WARNINGS (${warns.length}):`);
    warns.forEach((f) => console.log(`   [${f.page}] ${f.message}`));
  }
  console.log(`\nℹ️  PASSING (${infos.length}):`);
  infos.forEach((f) => console.log(`   [${f.page}] ${f.message}`));

  console.log(`\n📸 ${screenshots.length} screenshots → ${OUT}`);
  screenshots.forEach((s) => console.log(`   ${s.page}`));

  console.log("\n" + "=".repeat(60));
  console.log(`  ${errors.length === 0 ? "✅" : "❌"} ${errors.length} errors · ${warns.length} warnings · ${infos.length} passing`);
  console.log("  ⛔ NO SOURCE FILES MODIFIED. Awaiting human approval before push.");
  console.log("=".repeat(60) + "\n");

  if (errors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("QA audit failed:", e);
  process.exit(1);
});
