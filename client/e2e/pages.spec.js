// Every major page at desktop, tablet and mobile widths: it renders its main
// content, nothing overflows sideways, no console errors, and a screenshot is saved.
const { test, expect } = require("@playwright/test");
const { API, useSeatView, signIn, firstShowId, watchErrors, horizontalOverflow, settle, snap } = require("./helpers");

// Pages and the element that proves each one rendered real content.
const PUBLIC_PAGES = [
  { name: "home", path: "/", ready: (p) => p.getByRole("heading", { level: 1 }).first() },
  { name: "movies", path: "/movies", ready: (p) => p.getByRole("link", { name: /Neon Skyline/ }).first() },
  { name: "login", path: "/login", ready: (p) => p.getByRole("heading", { name: /welcome back/i }) },
  { name: "register", path: "/register", ready: (p) => p.getByRole("heading", { name: /create your account/i }) },
  { name: "snacks", path: "/snacks", ready: (p) => p.getByRole("heading", { level: 1 }).first() },
  { name: "gift-cards", path: "/gift-cards", ready: (p) => p.getByRole("heading", { level: 1 }).first() },
  { name: "loyalty", path: "/loyalty", ready: (p) => p.getByRole("heading", { level: 1 }).first() },
  { name: "not-found", path: "/this-page-does-not-exist", ready: (p) => p.getByRole("heading", { name: /page not found/i }) },
];

const ADMIN_PAGES = [
  { name: "admin-dashboard", path: "/admin/dashboard" },
  { name: "admin-movies", path: "/admin/movies" },
  { name: "admin-shows", path: "/admin/shows" },
  { name: "admin-snacks", path: "/admin/snacks" },
  { name: "admin-parking", path: "/admin/parking" },
  { name: "admin-analytics", path: "/admin/analytics" },
  { name: "admin-scan", path: "/admin/scan" },
  { name: "admin-iot", path: "/admin/iot" },
  { name: "scanner", path: "/scanner" },
];

async function checkPage(page, testInfo, name, errors) {
  await settle(page);
  expect(await horizontalOverflow(page), `${name} overflows sideways`).toEqual([]);
  await snap(page, testInfo, name);
  expect(errors, `${name} console errors`).toEqual([]);
}

test.describe("public pages", () => {
  for (const pg of PUBLIC_PAGES) {
    test(pg.name, async ({ page }, testInfo) => {
      const errors = watchErrors(page);
      await page.goto(pg.path);
      await expect(pg.ready(page)).toBeVisible();
      await checkPage(page, testInfo, pg.name, errors);
    });
  }

  test("movie details", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    const movies = await (await page.request.get(`${API}/api/movies`)).json();
    const movie = movies.find((m) => m.title === "Neon Skyline");
    await page.goto(`/movies/${movie._id}`);
    await expect(page.getByRole("heading", { name: movie.title, level: 1 })).toBeVisible();
    // Showtimes for this movie are listed and bookable.
    await expect(page.getByText("IMAX").first()).toBeVisible();
    await checkPage(page, testInfo, "movie-details", errors);
  });
});

test.describe("signed-in user pages", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "user");
  });

  test("seat selection (2D map)", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await useSeatView(page, "2d");
    await page.goto(`/seats/${await firstShowId(page)}`);
    await expect(page.getByRole("region", { name: "Seat map" })).toBeVisible();
    // Booked seats from the fixture show as booked.
    await expect(page.getByRole("button", { name: "Seat H5, booked" })).toBeDisabled();
    await checkPage(page, testInfo, "seats", errors);

    // On tablet and desktop the whole seat map fits without sideways scrolling.
    if (testInfo.project.name !== "mobile") {
      const fits = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="seat-map-scroll"]');
        return el.scrollWidth <= el.clientWidth;
      });
      expect(fits, "seat map needs sideways scrolling").toBe(true);
    }
  });

  test("my bookings", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto("/my-bookings");
    await expect(page.getByText("Neon Skyline").first()).toBeVisible();
    await checkPage(page, testInfo, "my-bookings", errors);
  });

  test("watchlist", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto("/watchlist");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await checkPage(page, testInfo, "watchlist", errors);
  });

  test("ticket view (owner)", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    const session = await signIn(page, "user");
    const bookings = await (
      await page.request.get(`${API}/api/bookings/user/${session._id}`, { headers: { Authorization: `Bearer ${session.token}` } })
    ).json();
    await page.goto(`/verify/${bookings[0]._id}`);
    await expect(page.getByText("Neon Skyline").first()).toBeVisible();
    await checkPage(page, testInfo, "ticket-owner", errors);
  });

  test("staff links are hidden and admin pages are blocked", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "My bookings" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Ticket scanner" })).toHaveCount(0);
    await expect(footer.getByRole("link", { name: "Admin console" })).toHaveCount(0);
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Staff only" })).toBeVisible();
  });
});

test.describe("admin pages", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "admin");
  });

  for (const pg of ADMIN_PAGES) {
    test(pg.name, async ({ page }, testInfo) => {
      const errors = watchErrors(page);
      await page.goto(pg.path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await checkPage(page, testInfo, pg.name, errors);
    });
  }

  test("staff see staff links in the footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer").getByRole("link", { name: "Admin console" })).toBeVisible();
  });
});
