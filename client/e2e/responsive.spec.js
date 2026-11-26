// Extra breakpoints the three device projects don't cover: 768 px (small
// tablet) and 1280 px (laptop). Key public, customer, booking and admin pages
// in all five colour themes, checking the theme is applied, nothing overflows
// sideways, and the console stays clean. Runs once (in the desktop project),
// resizing the viewport itself.
const { test, expect } = require("@playwright/test");
const { adminSignIn, signIn, firstShowId, useSeatView, watchErrors, horizontalOverflow, settle, snap } = require("./helpers");

const WIDTHS = [768, 1280];
const THEMES = ["blue", "violet", "crimson", "emerald", "amber"];

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Sets its own viewport widths; one run is enough.");
});

for (const width of WIDTHS) {
  test(`${width}px: customer and booking pages in every theme`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await useSeatView(page, "2d");
    await signIn(page, "user2");
    const showId = await firstShowId(page);
    const errors = watchErrors(page);
    for (const theme of THEMES) {
      await page.addInitScript((t) => localStorage.setItem("cinebook:theme", t), theme);
      for (const [name, path] of [["home", "/"], ["movies", "/movies"], ["seats", `/seats/${showId}`], ["bookings", "/my-bookings"], ["snacks", "/snacks"]]) {
        await page.goto(path);
        await settle(page);
        await expect(page.locator("html")).toHaveAttribute("data-color-theme", theme);
        expect(await horizontalOverflow(page), `${name} at ${width}px (${theme})`).toEqual([]);
        if (theme === "blue" || name === "seats") await snap(page, testInfo, `w${width}-${theme}-${name}`);
      }
    }
    expect(errors).toEqual([]);
  });

  test(`${width}px: admin pages`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await adminSignIn(page);
    const errors = watchErrors(page);
    for (const [name, path] of [
      ["dashboard", "/admin/dashboard"],
      ["shows", "/admin/shows"],
      ["auditoriums", "/admin/auditoriums"],
      ["venues", "/admin/venues"],
      ["promotions", "/admin/promotions"],
      ["analytics", "/admin/analytics"],
    ]) {
      await page.goto(path);
      await settle(page);
      expect(await horizontalOverflow(page), `${name} at ${width}px`).toEqual([]);
      await snap(page, testInfo, `w${width}-admin-${name}`);
    }
    expect(errors).toEqual([]);
  });
}
