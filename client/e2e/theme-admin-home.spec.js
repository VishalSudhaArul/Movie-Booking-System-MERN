// Colour themes (picker, persistence, every page), the server-verified admin
// link, and the cinematic homepage sections.
const { test, expect } = require("@playwright/test");
const { API, ADMIN_PASSWORD, signIn, firstShowId, watchErrors, horizontalOverflow, settle, snap } = require("./helpers");

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

// Clicks the Admin entry the way a visitor would at this screen size:
// the navbar link on desktop, the menu drawer on tablets and phones.
async function openAdminEntry(page, testInfo) {
  if (testInfo.project.name === "desktop") {
    const link = page.getByTestId("admin-nav-link");
    await expect(link).toBeVisible();
    await expect(link).toHaveAccessibleName("Admin");
    await link.click();
  } else {
    await expect(page.getByTestId("admin-nav-link")).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    const item = page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: /^Admin/ });
    await expect(item).toBeVisible();
    await item.click();
  }
}

const passwordField = (page) => page.getByLabel("Admin password", { exact: true });
const enterAdminPassword = async (page, password) => {
  await passwordField(page).fill(password);
  await page.getByTestId("admin-access").getByRole("button", { name: "Sign in", exact: true }).click();
};
// Everything the browser keeps for this site, to prove no password is stored.
const storedEverywhere = (page) =>
  page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
const adminToken = (page) => page.evaluate(() => sessionStorage.getItem("cinebook:adminToken"));

test.describe("admin access", () => {
  test("Admin opens a password-only page; wrong and empty passwords are refused; the right one opens the dashboard", async ({ page }, testInfo) => {
    // The refused sign-ins below log the browser's usual "failed to load" lines.
    const errors = watchErrors(page, [/status of 40[01]/]);
    if (testInfo.project.name === "desktop") {
      // The narrowest width with the full desktop navbar still fits.
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto("/");
      await expect(page.getByTestId("admin-nav-link")).toBeVisible();
      expect(await horizontalOverflow(page)).toEqual([]);
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();
    // No customer account is signed in at any point in this test.
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    await openAdminEntry(page, testInfo);
    await expect(page).toHaveURL(/\/admin\/login$/);

    // Only branding, the password field (with show/hide) and Sign in.
    const card = page.getByTestId("admin-access");
    await expect(card.getByRole("link", { name: "CineBook home" })).toBeVisible();
    await expect(passwordField(page)).toBeVisible();
    await expect(passwordField(page)).toBeFocused();
    // Exactly one input, and it's the password: no email or username field.
    await expect(card.locator("input")).toHaveCount(1);
    await expect(card.locator("input")).toHaveAttribute("type", "password");
    await expect(card.getByRole("button")).toHaveCount(2); // show/hide, Sign in
    await expect(card.getByRole("button", { name: "Show password" })).toBeVisible();
    await expect(card).not.toContainText(/email|customer|account/i);
    expect(await horizontalOverflow(page)).toEqual([]);
    await snap(page, testInfo, "admin-access");

    // Show / hide the password.
    await passwordField(page).fill("peek-a-boo");
    await card.getByRole("button", { name: "Show password" }).click();
    await expect(passwordField(page)).toHaveAttribute("type", "text");
    await card.getByRole("button", { name: "Hide password" }).click();
    await expect(passwordField(page)).toHaveAttribute("type", "password");

    // Empty: stopped in the browser, nothing sent.
    await passwordField(page).fill("");
    let sent = 0;
    page.on("request", (r) => r.url().endsWith("/api/auth/admin/login") && (sent += 1));
    await card.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter the admin password.")).toBeVisible();
    expect(sent).toBe(0);

    // Wrong password: refused, field cleared, nothing saved.
    await enterAdminPassword(page, "Not-The-Password-1");
    await expect(page.getByRole("alert")).toHaveText("Incorrect admin password");
    await expect(passwordField(page)).toHaveValue("");
    expect(await adminToken(page)).toBeNull();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await snap(page, testInfo, "admin-access-wrong");

    // The right password: into the existing dashboard.
    await enterAdminPassword(page, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(await adminToken(page)).toBeTruthy();
    // The password is kept nowhere in the browser, and no customer session appeared.
    expect(await storedEverywhere(page)).not.toContain(ADMIN_PASSWORD);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();

    // Now the entry goes straight to the dashboard.
    await page.goto("/");
    await openAdminEntry(page, testInfo);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    expect(errors).toEqual([]);
  });

  test("protected admin URLs send visitors to Admin access and back afterwards", async ({ page }) => {
    for (const path of ["/admin/dashboard", "/admin/movies", "/admin/scan", "/scanner"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
      await expect(passwordField(page)).toBeVisible();
    }
    await page.goto("/admin/shows");
    await enterAdminPassword(page, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/shows$/);
  });

  test("a signed-in customer still gets Admin access, never the dashboard; customer tokens can't use admin APIs", async ({ page }) => {
    await signIn(page, "user");
    // Pretend to be an admin by editing the browser's saved role.
    await page.addInitScript(() => localStorage.setItem("role", "admin"));
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(passwordField(page)).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem("token"));
    const auth = { Authorization: `Bearer ${token}` };
    for (const path of ["/api/bookings/all", "/api/analytics", "/api/snack-orders/all", "/api/parking/all"]) {
      expect((await page.request.get(`${API}${path}`, { headers: auth })).status()).toBe(403);
    }
    expect((await page.request.post(`${API}/api/movies`, { headers: auth, data: {} })).status()).toBe(403);
    expect((await page.request.get(`${API}/api/auth/admin/session`, { headers: auth })).status()).toBe(401);
    expect((await page.request.get(`${API}/api/bookings/all`)).status()).toBe(401);

    // Signing in to admin leaves the customer session as it was.
    await enterAdminPassword(page, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(token);
  });

  test("signing out ends the admin session on the server", async ({ page }, testInfo) => {
    await page.goto("/admin/login");
    await enterAdminPassword(page, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    const token = await adminToken(page);
    await page.getByTestId("admin-sign-out").click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(await adminToken(page)).toBeNull();
    expect((await page.request.get(`${API}/api/analytics`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login$/);
    if (testInfo.project.name === "desktop") {
      await page.goto("/");
      await expect(page.getByTestId("admin-nav-link")).toHaveAttribute("href", "/admin/login");
    }
  });

  test("an expired or revoked session goes back to Admin access with a notice", async ({ page }) => {
    const errors = watchErrors(page, [/status of 401/]);
    await page.goto("/admin/login");
    await enterAdminPassword(page, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);

    // Revoked on the server (e.g. signed out in another tab): the next check notices.
    const token = await adminToken(page);
    await page.request.post(`${API}/api/auth/admin/logout`, { headers: { Authorization: `Bearer ${token}` } });
    await page.goto("/admin/movies");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByTestId("admin-expired-notice")).toBeVisible();

    // Expired in the browser: dropped the moment it runs out, even while on a page.
    await enterAdminPassword(page, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/movies$/);
    await page.evaluate(() => {
      sessionStorage.setItem("cinebook:adminExpiresAt", new Date(Date.now() + 1500).toISOString());
      window.dispatchEvent(new Event("cinebook:admin-session"));
    });
    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 8000 });
    await expect(page.getByTestId("admin-expired-notice")).toBeVisible();
    expect(await adminToken(page)).toBeNull();
    expect(errors).toEqual([]);
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
