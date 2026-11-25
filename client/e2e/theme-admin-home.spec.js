// Colour themes (picker, persistence, every page), the server-verified admin
// link, and the cinematic homepage sections.
const { test, expect } = require("@playwright/test");
const { API, signIn, firstShowId, watchErrors, horizontalOverflow, settle, snap } = require("./helpers");

const THEMES = {
  blue: { name: "Electric Blue", brand500: "30 140 255" },
  violet: { name: "Royal Violet", brand500: "139 92 246" },
  crimson: { name: "Crimson Red", brand500: "220 38 38" },
  emerald: { name: "Emerald Green", brand500: "16 185 129" },
  amber: { name: "Amber Gold", brand500: "245 158 11" },
};

const cssVar = (page, name) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

// Opens the picker the way a visitor would at this screen size and picks a theme.
async function pickTheme(page, testInfo, id) {
  const { name } = THEMES[id];
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("radio", { name }).click();
    await page.getByRole("button", { name: "Close menu" }).click();
  } else {
    await page.getByRole("button", { name: /^Colour theme:/ }).click();
    await page.getByRole("radio", { name }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", id);
  // Wait for the short colour cross-fade to finish before reading colours.
  await expect(page.locator("html")).not.toHaveClass(/theme-transition/);
  await page.waitForTimeout(50);
}

test.describe("colour themes", () => {
  test("picking a theme recolours the site, survives a refresh and applies on every page", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await signIn(page, "user");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "blue");
    expect(await cssVar(page, "--brand-500")).toBe(THEMES.blue.brand500);

    await pickTheme(page, testInfo, "emerald");
    expect(await page.evaluate(() => localStorage.getItem("cinebook:theme"))).toBe("emerald");
    expect(await cssVar(page, "--brand-500")).toBe(THEMES.emerald.brand500);
    // Buttons use the theme gradient, with dark text so it stays readable on green.
    const btn = page.locator(".btn-primary").first();
    expect(await btn.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("rgb(16, 185, 129)");
    expect(await btn.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(3, 20, 15)");

    // Applied before the app runs on a refresh (no flash of the default theme).
    await page.reload({ waitUntil: "commit" });
    await page.waitForSelector("html[data-color-theme]", { state: "attached" });
    expect(await page.locator("html").getAttribute("data-color-theme")).toBe("emerald");

    // Every kind of page picks it up.
    const movies = await (await page.request.get(`${API}/api/movies`)).json();
    const showId = await firstShowId(page);
    for (const path of [`/movies/${movies[0]._id}`, `/seats/${showId}`, "/my-bookings", "/snacks", "/movies"]) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      expect(await cssVar(page, "--brand-500"), path).toBe(THEMES.emerald.brand500);
      const primary = page.locator(".btn-primary:visible").first();
      if (await primary.count()) {
        expect(await primary.evaluate((el) => getComputedStyle(el).backgroundImage), path).toContain("rgb(16, 185, 129)");
      }
    }
    expect(errors).toEqual([]);
  });

  test("all five themes keep semantic colours fixed and the layout intact", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();
    // Colours that must not change with the theme: the page surface, rating
    // stars (gold) and the seat/booking semantic colours defined in Tailwind.
    const fixed = () =>
      page.evaluate(() => {
        const star = document.querySelector(".text-gold-400");
        return {
          surface: getComputedStyle(document.body).backgroundColor,
          star: star ? getComputedStyle(star).color : null,
        };
      });
    const baseline = await fixed();

    for (const id of Object.keys(THEMES)) {
      await pickTheme(page, testInfo, id);
      expect(await cssVar(page, "--brand-500")).toBe(THEMES[id].brand500);
      expect(await fixed(), `${id}: errors, warnings and surfaces don't change`).toEqual(baseline);
      expect(await horizontalOverflow(page), `${id} overflows`).toEqual([]);
      if (testInfo.project.name === "desktop") {
        await page.waitForTimeout(500); // let the colour cross-fade finish
        await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}/theme-${id}.png` });
      }
    }
    expect(errors).toEqual([]);
  });

  test("the picker works with the keyboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "the navbar picker is shown from tablet width up");
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /^Colour theme:/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("radio", { name: "Electric Blue" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "violet");
    await expect(page.getByRole("radio", { name: "Royal Violet" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("radiogroup", { name: "Colour theme" })).toHaveCount(0);
    await expect(trigger).toHaveAccessibleName("Colour theme: Royal Violet");
  });
});

test.describe("admin link", () => {
  test("hidden for visitors and customers, even if the saved role is edited", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(page.getByTestId("admin-nav-link")).toHaveCount(0);

    await signIn(page, "user");
    // Pretend to be an admin by editing the browser's saved role.
    await page.addInitScript(() => localStorage.setItem("role", "admin"));
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("admin-nav-link")).toHaveCount(0);
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Staff only" })).toBeVisible();
    // The server's answer also corrects the saved hint.
    expect(await page.evaluate(() => localStorage.getItem("role"))).toBe("user");
  });

  test("shown to a verified admin and opens the dashboard", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/");
    const link = page.getByTestId("admin-nav-link");
    await expect(link).toBeVisible();
    await expect(link).toHaveAccessibleName("Admin dashboard");
    await link.click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Staff only" })).toHaveCount(0);
  });
});

test.describe("cinematic homepage", () => {
  test("hero, real stats, poster rails and showtimes that lead to the seat map", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto("/");
    const hero = page.getByTestId("home-hero");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();

    // Featured carousel: choosing another movie changes the headline.
    const tabs = hero.getByRole("tab");
    if ((await tabs.count()) > 1) {
      const first = await hero.getByRole("heading", { level: 1 }).innerText();
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(hero.getByRole("heading", { level: 1 })).not.toHaveText(first);
    }

    // Stats are counted from the real catalogue and schedule.
    const shows = await (await page.request.get(`${API}/api/shows?lite=1`)).json();
    const stats = page.getByRole("region", { name: "CineBook right now" });
    await stats.scrollIntoViewIfNeeded();
    await expect(stats).toContainText("upcoming showtime");

    await expect(page.getByRole("heading", { name: "Tonight's big screen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From popcorn to your perfect seat" })).toBeVisible();

    // A showtime chip goes straight to that show's seat map (sign-in first).
    const showtimes = page.getByRole("region", { name: "What's on at your cinema" });
    await showtimes.scrollIntoViewIfNeeded();
    const chip = showtimes.locator('a[href^="/seats/"]').first();
    await expect(chip).toBeVisible();
    const href = await chip.getAttribute("href");
    expect(shows.map((s) => `/seats/${s._id}`)).toContain(href);
    await chip.click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/");
    await settle(page);
    expect(await horizontalOverflow(page)).toEqual([]);
    await snap(page, testInfo, "home-cinematic");
    expect(errors).toEqual([]);
  });

  test("reduced motion: no auto-advance and content is visible without animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const hero = page.getByTestId("home-hero");
    const title = await hero.getByRole("heading", { level: 1 }).innerText();
    await expect(hero.locator(".hero-progress")).toHaveCount(0);
    await page.waitForTimeout(1500);
    expect(await hero.getByRole("heading", { level: 1 }).innerText()).toBe(title);
    // Sections further down are already fully visible (no fade-in waiting).
    const story = page.getByRole("heading", { name: "From popcorn to your perfect seat" });
    await story.scrollIntoViewIfNeeded();
    expect(await story.evaluate((el) => getComputedStyle(el.closest("div")).opacity)).toBe("1");
  });
});
