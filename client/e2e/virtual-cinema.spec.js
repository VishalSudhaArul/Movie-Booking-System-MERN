// Virtual Cinema 2.0 features, end to end against the real API and build:
// the seat advisor (geometry-based recommendations, heatmaps, comparison),
// wheelchair spaces from the hall's layout, walk-through mode with collision
// limits, the speaker layout, graphics quality levels, ticket wayfinding from
// published venue data, food search and pickup instructions, and the admin
// layout editor, venues, promotions and reconciled analytics.
const { test, expect } = require("@playwright/test");
const { API, ACCOUNTS, adminSignIn, useSeatView, signIn, watchErrors, snap } = require("./helpers");

const state = (page) => page.evaluate(() => window.__cinema3d.getState());
const seatButton = (page, n) => page.getByTestId("seat-map-scroll").getByRole("button", { name: new RegExp(`^Seat ${n},`) });
const BOOKED = ["H5", "H6", "G7", "C3", "C4"];

async function token(request, who) {
  const res = await request.post(`${API}/api/auth/login`, { data: ACCOUNTS[who] });
  return (await res.json()).token;
}
async function shows(request) {
  return (await request.get(`${API}/api/shows?lite=1`)).json();
}
async function clearHolds(request, showId, t) {
  await request.delete(`${API}/api/shows/${showId}/holds`, { headers: { Authorization: `Bearer ${t}` } });
}

async function openSeats(page, view, { who = "user2", reducedMotion = true } = {}) {
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await useSeatView(page, view);
  const session = await signIn(page, who);
  const [first] = await shows(page.request);
  await clearHolds(page.request, first._id, session.token);
  await page.goto(`/seats/${first._id}`);
  if (view === "3d") {
    await page.waitForFunction(() => window.__cinema3d && window.__cinema3d.getState().timings.firstFrame, null, { timeout: 20000, polling: 100 });
  } else {
    await expect(page.getByTestId("seat-map-scroll")).toBeVisible();
  }
  return { showId: first._id, session };
}

test.describe("seat advisor (2D map)", () => {
  test.afterEach(async ({ request }) => {
    const [first] = await shows(request);
    await clearHolds(request, first._id, await token(request, "user2"));
  });

  test("recommends free seats from the hall's geometry, with reasons, and selects them", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await openSeats(page, "2d");
    const advisor = page.getByTestId("seat-advisor");
    await expect(advisor).toBeVisible();
    const recs = advisor.getByTestId("recommendation");
    await expect(recs.first()).toBeVisible();
    expect(await recs.count()).toBeGreaterThan(0);
    await expect(recs.first()).toContainText(/^1Row [A-Z], Seats? \d+/);
    await expect(recs.first()).toContainText(/View score \d+\/100/);
    expect(await advisor.textContent()).not.toMatch(/\bAI\b/);

    // Select the top recommendation: those seats become selected on the map.
    const label = await recs.first().getByRole("button", { name: /^Select / }).getAttribute("aria-label");
    const picked = label.replace(/^Select /, "").split(", ");
    picked.forEach((n) => expect(BOOKED).not.toContain(n));
    await recs.first().getByRole("button", { name: /^Select / }).click();
    for (const n of picked) await expect(seatButton(page, n)).toHaveAttribute("aria-pressed", "true");

    // Group size changes the recommendation.
    await advisor.getByRole("button", { name: "More seats" }).click();
    await expect(advisor.getByTestId("advisor-count")).toHaveText(String(picked.length + 1));

    // Wheelchair access: spaces come from the layout (row L of the classic hall).
    await advisor.getByRole("button", { name: "Wheelchair access" }).click();
    await expect(recs.first()).toContainText("wheelchair space");
    await recs.first().getByRole("button", { name: /^Select / }).click();
    await expect(page.getByTestId("seat-map-scroll").getByRole("button", { name: /^Seat L(1|12), wheelchair space/ }).first()).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("access-note")).toContainText("Wheelchair spaces");
    await snap(page, testInfo, "seat-advisor-2d");
    expect(errors).toEqual([]);
  });

  test("heatmaps recolour only free seats; compare puts up to three seats side by side", async ({ page }, testInfo) => {
    await openSeats(page, "2d");
    const advisor = page.getByTestId("seat-advisor");
    await advisor.getByRole("tab", { name: "Heatmap" }).click();
    await advisor.getByRole("button", { name: "View score" }).click();
    await expect(advisor.getByTestId("heatmap-legend")).toContainText("Viewing score");
    const bg = (n) => seatButton(page, n).evaluate((el) => el.style.background);
    expect(await bg("F3")).not.toBe("");
    expect(await bg("H5")).toBe(""); // booked stays "unavailable"
    await advisor.getByRole("button", { name: "Seat category" }).click();
    await expect(advisor.getByTestId("heatmap-legend")).toContainText("First Class");
    await snap(page, testInfo, "seat-heatmap-2d");
    await advisor.getByRole("button", { name: "Availability" }).click();
    expect(await bg("F3")).toBe("");

    await advisor.getByRole("tab", { name: "Compare" }).click();
    await advisor.getByRole("button", { name: "Compare mode" }).click();
    for (const n of ["F1", "F6", "K3"]) await seatButton(page, n).click();
    const table = advisor.getByTestId("compare-table");
    await expect(table.getByRole("columnheader")).toHaveCount(4); // label column + 3 seats
    await expect(table).toContainText("Distance to screen");
    // Comparing doesn't select seats.
    await expect(seatButton(page, "F1")).toHaveAttribute("aria-pressed", "false");
    await seatButton(page, "J2").click();
    await expect(page.getByText("You can compare up to three seats")).toBeVisible();
    await advisor.getByRole("button", { name: "Select these seats" }).click();
    await expect(seatButton(page, "F6")).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("3D hall: walk-through, sound layout, quality", () => {
  test.afterEach(async ({ request }) => {
    const [first] = await shows(request);
    await clearHolds(request, first._id, await token(request, "user2"));
  });

  test("walk mode moves only through aisles, then walks to the selected seat and sits in it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Keyboard walking is covered on desktop and tablet; phones use the joystick test below.");
    const errors = watchErrors(page);
    await openSeats(page, "3d");
    const seat = testInfo.project.name === "desktop" ? "F3" : "F10";
    await page.getByPlaceholder("Go to seat, e.g. F6").fill(seat);
    await page.getByRole("button", { name: "Find seat" }).click();
    await expect.poll(async () => (await state(page)).viewSeat).toBe(seat);

    const toolbar = page.getByRole("toolbar", { name: "Camera views" });
    await toolbar.getByRole("button", { name: "Walk" }).click();
    await expect.poll(async () => (await state(page)).walking).toBe(true);
    const walkPanel = page.getByTestId("walk-panel");
    await expect(walkPanel.getByTestId("walk-position")).toHaveText("Rear cross-aisle");
    const start = (await state(page)).walkPose;

    // Forward (towards the screen) into the centre aisle.
    await page.getByTestId("auditorium-3d").focus();
    // Hold W until the visitor has left the cross-aisle for the seating rows
    // (frame timing varies in headless Chrome, so don't assume a distance per second).
    await page.keyboard.down("KeyW");
    await expect(walkPanel.getByTestId("walk-position")).toHaveText(/^Row [A-Z] · centre aisle$/, { timeout: 15000 });
    await page.keyboard.up("KeyW");
    const ahead = (await state(page)).walkPose;
    expect(ahead.z).toBeLessThan(start.z - 0.6);

    // Sidestep for a while: the seats on either side stop you at the aisle's edge.
    await page.keyboard.down("KeyA");
    await page.waitForTimeout(1500);
    await page.keyboard.up("KeyA");
    const side = (await state(page)).walkPose;
    expect(Math.abs(side.x - ahead.x)).toBeLessThan(0.5);
    expect(side.y).toBeGreaterThan(1.5); // standing eye height above the raked floor

    // Walk to the selected seat (reduced motion: straight there), then sit in it.
    await walkPanel.getByRole("button", { name: `Walk to ${seat}` }).click();
    await expect(walkPanel.getByRole("button", { name: `Sit in ${seat}` })).toBeVisible();
    await expect(walkPanel).toContainText(`${seat} is`);
    await snap(page, testInfo, "walk-mode-at-seat");
    await walkPanel.getByRole("button", { name: `Sit in ${seat}` }).click();
    const view = page.getByTestId("seat-view-panel");
    await expect(view).toBeVisible();
    await expect(view).toContainText(`Row F · Seat ${seat.slice(1)}`);
    await expect(view.getByTestId("seat-view-access")).toContainText("Nearest door");
    await expect.poll(async () => (await state(page)).walking).toBe(false);
    expect(errors).toEqual([]);
  });

  test("phones and tablets walk with the touch joystick; Escape-free exit works", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "Touch joystick only appears on touch screens.");
    await openSeats(page, "3d");
    await page.getByRole("toolbar", { name: "Camera views" }).getByRole("button", { name: "Walk" }).click();
    const stick = page.getByTestId("walk-joystick");
    await expect(stick).toBeVisible();
    await expect.poll(async () => (await stick.boundingBox()).y + 120 <= page.viewportSize().height).toBe(true);
    const start = (await state(page)).walkPose;
    const box = await stick.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.waitForTimeout(1000);
    await page.mouse.up();
    expect((await state(page)).walkPose.z).toBeLessThan(start.z - 0.4);
    await snap(page, testInfo, "walk-mode-touch");
    await page.getByTestId("walk-panel").getByRole("button", { name: "Leave walk mode" }).click();
    await expect.poll(async () => (await state(page)).walking).toBe(false);
  });

  test("speaker layout overlay, graphics quality levels and advisor previews", async ({ page }, testInfo) => {
    await openSeats(page, "3d");
    const toolbar = page.getByRole("toolbar", { name: "Camera views" });
    await toolbar.getByRole("button", { name: "Sound" }).click();
    await expect(page.getByTestId("sound-panel")).toContainText("Approximate layout");
    await expect.poll(async () => (await state(page)).sound).toBe(true);
    expect((await state(page)).doors).toBe(4);
    await snap(page, testInfo, "sound-layout-3d");
    await page.getByTestId("sound-panel").getByRole("button", { name: "Hide the speaker layout" }).click();

    for (const level of ["High", "Lite", "Balanced"]) {
      await page.getByRole("group", { name: "Graphics quality" }).getByRole("button", { name: level }).click();
      await page.waitForFunction((q) => window.__cinema3d && window.__cinema3d.getState().quality === q && window.__cinema3d.getState().timings.firstFrame, level.toLowerCase(), { timeout: 20000, polling: 100 });
      expect((await state(page)).lowPower).toBe(level === "Lite");
    }

    // A recommendation can be previewed from its seat in 3D.
    const rec = page.getByTestId("recommendation").first();
    await rec.getByRole("button", { name: /^Preview the view from row/ }).click();
    await expect(page.getByTestId("seat-view-panel")).toBeVisible();
  });
});

test.describe("tickets: finding your seat", () => {
  test("shows row, seat and nearest door, plus directions only where the venue published them", async ({ page, request }, testInfo) => {
    const t = await token(request, "user2");
    // The seeded "Chronos Rift" showtimes: one at IMAX (directions published), one at KS Cinemas (none).
    const movies = await (await request.get(`${API}/api/movies`)).json();
    const chronos = (Array.isArray(movies) ? movies : movies.movies || []).find((m) => m.title === "Chronos Rift");
    const list = (await shows(request)).filter((s) => String(s.movieId) === chronos._id);
    const imax = list.find((s) => s.theatre === "IMAX");
    const ks = list.find((s) => s.theatre === "KS Cinemas");
    const n = { desktop: "3", tablet: "5", mobile: "7" }[testInfo.project.name];
    for (const s of [imax, ks]) {
      const res = await request.post(`${API}/api/bookings`, { headers: { Authorization: `Bearer ${t}` }, data: { showId: s._id, seats: [`A${n}`] } });
      expect(res.status()).toBe(201);
    }
    await signIn(page, "user2");
    await page.goto("/my-bookings");

    const open = async (theatre) => {
      const card = page.locator("article", { hasText: `A${n}` }).filter({ hasText: theatre }).first();
      await card.getByRole("button", { name: "View ticket" }).click();
      return page.getByTestId("venue-guide");
    };
    let guide = await open("IMAX");
    await expect(guide).toContainText(`Row A, Seat ${n}`);
    await expect(guide).toContainText("nearest door");
    await expect(guide).toContainText("Main gate");
    await expect(guide).toContainText("Snack counter");
    await snap(page, testInfo, "ticket-venue-guide");
    await page.keyboard.press("Escape");

    guide = await open("KS Cinemas");
    await expect(guide).toContainText("hasn't published venue directions");
    await expect(guide).not.toContainText("Main gate");
  });
});

test("food menu: search filters items and pickup uses the venue's food counter", async ({ page }) => {
  await signIn(page, "user2");
  await page.goto("/snacks");
  await page.getByLabel("Theatre").selectOption("IMAX");
  await page.getByLabel("Search the menu").fill("pop");
  await expect(page.getByRole("button", { name: "Add Salted Popcorn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Loaded Nachos" })).toHaveCount(0);
  await page.getByRole("button", { name: "Add Salted Popcorn" }).click();
  await expect(page.getByTestId("pickup-hint")).toContainText("Snack counter");
  await page.getByLabel("Search the menu").fill("zzz");
  await expect(page.getByText("No matches")).toBeVisible();
});

test.describe("admin: halls, venues, promotions, analytics", () => {
  test.beforeEach(async ({ page }) => {
    await adminSignIn(page);
  });

  test("layout editor previews a hall on the server, saves it, and removes it while unused", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto("/admin/auditoriums");
    const name = `E2E hall ${testInfo.project.name}`;
    await page.getByLabel("Hall name").fill(name);
    await page.getByRole("button", { name: "Remove row J" }).click();
    await expect(page.getByTestId("editor-stats")).toContainText("144 seats");
    await page.getByLabel("Row A, block 2 seats").fill("10");
    await expect(page.getByTestId("editor-stats")).toContainText("146 seats");
    await expect(page.getByTestId("editor-stats")).toContainText("wheelchair spaces A1, A18");
    await snap(page, testInfo, "admin-layout-editor");
    await page.getByRole("button", { name: "Save hall" }).click();
    const row = page.getByTestId("hall-row").filter({ hasText: name });
    await expect(row).toContainText("Custom");
    await expect(row).toContainText("146 seats");
    await row.getByRole("button", { name: "Plan" }).click();
    await expect(row.getByTestId("hall-preview")).toBeVisible();
    await row.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Remove hall" }).click();
    await expect(page.getByTestId("hall-row").filter({ hasText: name })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("venues page lists published directions", async ({ page }) => {
    await page.goto("/admin/venues");
    await expect(page.getByText("Published venues")).toBeVisible();
    await expect(page.locator("li", { hasText: "IMAX" }).first()).toContainText("4 places");
    await expect(page.getByText(/No directions yet for: .*KS Cinemas/)).toBeVisible();
  });

  test("promotions: create a code, then switch it off", async ({ page }, testInfo) => {
    await page.goto("/admin/promotions");
    const code = `E2E${testInfo.project.name.toUpperCase()}`;
    await page.getByRole("textbox", { name: "Code", exact: true }).fill(code);
    await page.getByLabel("Amount off").fill("40");
    await page.getByRole("button", { name: "Create code" }).click();
    const item = page.locator("li", { hasText: code });
    await expect(item).toContainText("₹40 off");
    await item.getByRole("button", { name: `${code}: switch off` }).click();
    await expect(item).toContainText("Off");
    await expect(page.getByRole("heading", { name: "Recent reviews" })).toBeVisible();
  });

  test("analytics reconciles gross, discounts, refunds and net", async ({ page }, testInfo) => {
    await page.goto("/admin/analytics");
    const panels = page.getByTestId("finance-panels");
    await expect(panels).toBeVisible();
    await expect(panels).toContainText("Revenue reconciliation");
    await expect(panels).toContainText("bookings reconcile");
    await expect(panels).toContainText("Occupancy");
    await expect(panels).toContainText("refunds are zero");
    await snap(page, testInfo, "admin-analytics-reconciliation");
  });
});
