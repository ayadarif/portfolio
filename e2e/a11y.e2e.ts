// Accessibility checks with axe (WCAG 2.0, 2.1 and 2.2 AA rules), in light and dark, at phone and desktop width.
// Plus a reflow check (no sideways page scroll at 320px) and a keyboard check (every tab stop shows a visible focus ring).
// Automated checks catch only some problems; docs/a11y-manual-check.md lists what a person must test.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = ["/", "/experiment-readout", "/feedback-triage", "/pmex-calculator", "/work/loyalty-program", "/work/experiment-readout"];
const themes = ["light", "dark"] as const;
const widths = [320, 1280] as const;

for (const path of pages) {
  for (const theme of themes) {
    for (const width of widths) {
      test(`axe: ${path} ${theme} ${width}px`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
        if (width === 320) {
          // Reflow: the page itself must not scroll sideways (tables scroll inside their own region).
          const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(over).toBeLessThanOrEqual(0);
        }
      });
    }
  }
}

for (const path of ["/", "/pmex-calculator", "/experiment-readout"]) {
  test(`keyboard: ${path} every tab stop has a visible focus ring and is on screen`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const visibleRing = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
        return { tag: el.tagName, ring: visibleRing, onScreen: r.bottom > 0 && r.top < innerHeight && r.width > 0, label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) };
      });
      if (info) {
        expect(info.ring, `focus ring on ${info.tag} "${info.label}"`).toBe(true);
        expect(info.onScreen, `on screen: ${info.tag} "${info.label}"`).toBe(true);
      }
    }
  });
}

// The states that appear after the tool runs: readout (verdict, chart, tables) and the simulator result.
for (const theme of themes) {
  for (const width of widths) {
    test(`axe: readout results and simulator ${theme} ${width}px`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/experiment-readout");
      await page.waitForLoadState("networkidle");
      await page.locator("button", { hasText: /early peek/i }).first().click();
      await expect(page.getByText("Verdict", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Run simulation" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Done." })).toBeVisible({ timeout: 30_000 });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
      if (width === 320) expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
}

test("theme toggle switches the class and remembers the choice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dark" }).click();
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  await page.getByRole("button", { name: "Light" }).click();
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
});
