// The single-level 800-seat Grand hall, end to end against the real API:
// every server seat is drawn in 3D and on the 2D map, there is no balcony
// anywhere, the cross-aisle shows in both views, walk-through reaches the back
// recliner rows across the cross-aisle, recommendations and heatmaps cover the
// whole hall, and a back-row premium seat is held, booked and then unavailable.
const { test, expect } = require("@playwright/test");
const { API, ADMIN_PASSWORD, useSeatView, signIn, watchErrors, snap } = require("./helpers");

const PRICES = { balconyPrice: 560, firstClassPrice: 360, secondClassPrice: 240 };
const state = (page) => page.evaluate(() => window.__cinema3d.getState());
const panel = (page) => page.getByTestId("booking-panel");
const dayFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
let showId;

test.beforeAll(async ({ request }) => {
  const existing = await (await request.get(`${API}/api/shows?lite=1`)).json();
  const found = existing.find((s) => s.theatre === "Grand Screen 800");
  if (found) {
    showId = found._id;
    return;
  }
  const token = (await (await request.post(`${API}/api/auth/admin/login`, { data: { password: ADMIN_PASSWORD } })).json()).token;
  const movies = await (await request.get(`${API}/api/movies`)).json();
  // No layoutId: new showtimes get the 800-seat Grand hall by default.
  const res = await request.post(`${API}/api/shows`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { movieId: movies[0]._id, theatre: "Grand Screen 800", date: dayFromNow(31), time: "20:00", ...PRICES },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.layoutId).toBe("grand-800");
  showId = body._id;
});

test.afterEach(async ({ page }) => {
  await page.close();
});

const waitFirstFrame = (page) =>
  page.waitForFunction(() => window.__cinema3d && window.__cinema3d.getState().timings.firstFrame, null, { timeout: 30000, polling: 100 });

async function open3D(page, testInfo) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await useSeatView(page, "3d");
  const session = await signIn(page, "user2");
  await page.request.delete(`${API}/api/shows/${showId}/holds`, { headers: { Authorization: `Bearer ${session.token}` } });
  const t0 = Date.now();
  await page.goto(`/seats/${showId}`);
  if (testInfo.project.name === "mobile" && !(await page.getByTestId("auditorium-3d").count())) await page.getByRole("button", { name: "3D hall" }).tap();
  await waitFirstFrame(page);
  return { session, loadMs: Date.now() - t0 };
}

const measureFrames = (page, frames = 90) =>
  page.evaluate(async (n) => {
    const times = [];
    let last = performance.now();
    for (let i = 0; i < n; i++) {
      window.__cinema3d.rotate(2);
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      times.push(now - last);
      last = now;
    }
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return { avgMs: +avg.toFixed(1), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(1), fps: +(1000 / avg).toFixed(0) };
  }, frames);

test("800 seats on one level: every server seat in 3D, no balcony, smooth rendering", async ({ page, request }, testInfo) => {
  const errors = watchErrors(page, [/THREE\.Clock: This module has been deprecated/]);
  const { loadMs } = await open3D(page, testInfo);
  const server = await (await request.get(`${API}/api/shows/single/${showId}`)).json();
  expect(server.seats).toHaveLength(800);
  expect(server.layout.rows.every((r) => r.tier === "stalls")).toBe(true);
  const s = await state(page);
  expect(s).toMatchObject({ seats: 800, rows: 25, layout: "grand-800", doors: 6 });
  await expect(page.locator("body")).not.toContainText(/balcony/i);

  await page.evaluate(() => window.__cinema3d.goTo("overview"));
  const frames = await measureFrames(page);
  const after = await state(page);
  console.log(`[perf] ${testInfo.project.name} grand-800 ${JSON.stringify({ loadMs, firstFrameMs: Math.round(s.timings.firstFrame), drawCalls: after.drawCalls, triangles: after.triangles, geometries: after.memory.geometries, textures: after.memory.textures, quality: after.quality, ...frames })}`);
  // Instanced seats: draw calls stay in the same range as the 136-seat hall.
  expect(after.drawCalls).toBeLessThan(80);
  expect(frames.avgMs).toBeLessThan(60);
  await snap(page, testInfo, "grand-800-overview");

  // Lite graphics: simpler chairs (same positions), no shadows, lower resolution.
  await page.getByRole("group", { name: "Graphics quality" }).getByRole("button", { name: "Lite" }).click();
  await page.waitForFunction(() => window.__cinema3d && window.__cinema3d.getState().quality === "lite" && window.__cinema3d.getState().timings.firstFrame, null, { timeout: 30000, polling: 100 });
  await page.evaluate(() => window.__cinema3d.goTo("overview"));
  const liteFrames = await measureFrames(page);
  const lite = await state(page);
  console.log(`[perf] ${testInfo.project.name} grand-800 lite ${JSON.stringify({ drawCalls: lite.drawCalls, triangles: lite.triangles, ...liteFrames })}`);
  expect(lite.triangles).toBeLessThan(after.triangles * 0.7);
  expect(lite.seats).toBe(800);
  expect(errors).toEqual([]);
});

test("the 2D map shows all 800 seats, the cross-aisle and Premium (not Balcony)", async ({ page }, testInfo) => {
  await useSeatView(page, "2d");
  await signIn(page, "user2");
  await page.goto(`/seats/${showId}`);
  const map = page.getByTestId("seat-map-scroll");
  await expect(map.getByRole("button", { name: /^Seat [A-Z]+\d+/ })).toHaveCount(800);
  await expect(map.getByTestId("cross-aisle-2d")).toHaveCount(1);
  await expect(map).toContainText("Premium");
  await expect(page.locator("body")).not.toContainText(/balcony/i);
  await expect(map.getByRole("button", { name: /^Seat A1, wheelchair space/ })).toBeVisible();
  // Recommendations and heatmaps cover the whole 800-seat hall.
  const advisor = page.getByTestId("seat-advisor");
  await expect(advisor.getByTestId("recommendation").first()).toContainText(/^1Row [A-Z]/);
  await advisor.getByRole("button", { name: "Premium" }).click();
  await expect(advisor.getByTestId("recommendation").first()).toContainText(/Row (Y|Z)/);
  await advisor.getByRole("tab", { name: "Heatmap" }).click();
  await advisor.getByRole("button", { name: "Viewing angle" }).click();
  expect(await map.getByRole("button", { name: /^Seat Z1,/ }).evaluate((el) => el.style.background)).not.toBe("");
  await snap(page, testInfo, "grand-800-2d");
});

test("walk across the cross-aisle to a back-row recliner, then hold and book it", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Keyboard and seat-finder walk is covered on desktop and tablet.");
  await open3D(page, testInfo);
  const server = await (await request.get(`${API}/api/shows/single/${showId}`)).json();
  const lastRow = server.layout.rows.at(-1);
  const n = Math.ceil(lastRow.seats / 2) + (testInfo.project.name === "desktop" ? 0 : 1);
  const seat = `${lastRow.label}${n}`;
  expect(server.seats.find((x) => x.seatNumber === seat).isBooked).toBe(false);

  await panel(page).getByLabel("Seat number").fill(seat);
  await panel(page).getByLabel("Seat number").press("Enter");
  await expect(panel(page)).toContainText(seat);
  await expect(panel(page)).toContainText("Premium");

  await page.getByRole("toolbar", { name: "Camera views" }).getByRole("button", { name: "Walk" }).click();
  const walk = page.getByTestId("walk-panel");
  await expect(walk.getByTestId("walk-position")).toHaveText("Rear cross-aisle");
  // Walk forward into the hall: through the recliner rows towards the middle cross-aisle.
  await page.getByTestId("auditorium-3d").focus();
  // Hold Shift to hurry (frame rate varies between emulated devices).
  await page.keyboard.down("Shift");
  await page.keyboard.down("KeyW");
  await expect(walk.getByTestId("walk-position")).toHaveText(/^Cross-aisle before row [A-Z]$/, { timeout: 30000 });
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Shift");
  // Running, you can overshoot the 1.6 m cross-aisle by a step: tap back into it.
  for (let i = 0; i < 20 && !/^Cross-aisle/.test(await walk.getByTestId("walk-position").textContent()); i++) {
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(120);
    await page.keyboard.up("KeyS");
    await page.waitForTimeout(150);
  }
  await expect(walk.getByTestId("walk-position")).toHaveText(/^Cross-aisle/);
  // Sideways along the cross-aisle is open floor.
  const before = (await state(page)).walkPose;
  await page.keyboard.down("KeyD");
  await expect.poll(async () => (await state(page)).walkPose.x, { timeout: 15000 }).toBeGreaterThan(before.x + 1);
  await page.keyboard.up("KeyD");
  await expect(walk.getByTestId("walk-position")).toHaveText(/^Cross-aisle/);

  await walk.getByRole("button", { name: `Walk to ${seat}` }).click();
  await expect(walk.getByRole("button", { name: `Sit in ${seat}` })).toBeVisible();
  await walk.getByRole("button", { name: `Sit in ${seat}` }).click();
  await expect(page.getByTestId("seat-view-panel")).toContainText(`Row ${lastRow.label} · Seat ${n}`);
  await snap(page, testInfo, "grand-800-back-row-view");

  await panel(page).getByRole("button", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/addons\//);
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  await expect(page.getByTestId("venue-guide")).toContainText(`Row ${lastRow.label}, Seat ${n}`);
  const after = await (await request.get(`${API}/api/shows/single/${showId}`)).json();
  expect(after.seats.find((x) => x.seatNumber === seat).isBooked).toBe(true);
});

test("seat picking stays accurate across all 800 seats (top-down seat map)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Mouse picking; phones use tap + seat finder.");
  await open3D(page, testInfo);
  await page.getByRole("toolbar", { name: "Camera views" }).getByRole("button", { name: "Seat map" }).click();
  await page.waitForTimeout(600);
  const result = await page.evaluate(() => {
    const c = window.__cinema3d;
    const all = c.seatsWhere({});
    let visible = 0;
    let correct = 0;
    const wrong = [];
    all.forEach((n) => {
      const p = c.project(n);
      if (!p || !p.visible) return;
      visible += 1;
      const hit = c.hitAt(p.x, p.y);
      if (hit === n) correct += 1;
      else if (wrong.length < 5) wrong.push(`${n}->${hit}`);
    });
    return { total: all.length, visible, correct, wrong };
  });
  console.log(`[picking] ${testInfo.project.name} grand-800 ${JSON.stringify(result)}`);
  expect(result.total).toBe(800);
  expect(result.correct / result.total).toBeGreaterThanOrEqual(0.98);

  // Real clicks select exactly the seat under the pointer.
  const targets = await page.evaluate(() => ["A10", "M15", "Z12"].map((n) => ({ n, p: window.__cinema3d.project(n) })));
  for (const { n, p } of targets) {
    if ((await page.evaluate(([x, y]) => window.__cinema3d.hitAt(x, y), [p.x, p.y])) !== n) continue;
    await page.mouse.click(p.x, p.y);
    await expect(panel(page)).toContainText(n);
  }
});
