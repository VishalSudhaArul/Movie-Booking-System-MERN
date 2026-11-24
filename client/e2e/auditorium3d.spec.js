// The 3D auditorium, end to end against the real API:
// loading and scroll-driven flight, camera navigation (mouse, keyboard, touch),
// direct seat selection by clicking in 3D, first-person preview, the floating
// booking panel, automatic server-side holds (debounced, latest selection wins,
// released on clear/leave), two customers competing for a seat, and checkout.
// Seats are clicked with the real mouse at their projected screen position, so
// this exercises the actual raycasting, not a shortcut.
const { test, expect } = require("@playwright/test");
const { API, ACCOUNTS, useSeatView, signIn, firstShowId, watchErrors, settle, snap } = require("./helpers");

const state = (page) => page.evaluate(() => window.__cinema3d.getState());
const panel = (page) => page.getByTestId("booking-panel");
const dist = (s) => Math.hypot(...s.position.map((v, i) => v - s.target[i]));

// Different seats per screen size so the desktop and tablet runs don't collide.
const pick = (testInfo, seats) => seats[testInfo.project.name] || seats.desktop;

async function login(request, who) {
  const res = await request.post(`${API}/api/auth/login`, { data: ACCOUNTS[who] });
  return res.json();
}

/** Seat states as the server reports them (optionally as a signed-in user). */
async function serverSeats(request, showId, token) {
  const res = await request.get(`${API}/api/shows/single/${showId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  const show = await res.json();
  return Object.fromEntries(show.seats.map((s) => [s.seatNumber, s]));
}

async function open3D(page, { reducedMotion = true, who = "user" } = {}) {
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await useSeatView(page, "3d");
  const session = await signIn(page, who);
  const showId = await firstShowId(page);
  // Start every test from a clean slate: no holds left over from other tests.
  await page.request.delete(`${API}/api/shows/${showId}/holds`, { headers: { Authorization: `Bearer ${session.token}` } });
  await page.goto(`/seats/${showId}`);
  // Wait for the app's own "first frame drawn" mark (interval polling: rAF-based
  // polling lags in headless Chrome when nothing on the page is animating).
  await page.waitForFunction(() => window.__cinema3d && window.__cinema3d.getState().timings.firstFrame, null, { timeout: 20000, polling: 100 });
  const stage = page.getByTestId("auditorium-3d");
  await expect(stage.locator("canvas")).toBeVisible();
  const s = await state(page);
  console.log(`[3d startup] first frame ${Math.round(s.timings.firstFrame)}ms after page start, renderer "${s.renderer}", lowPower ${s.lowPower}`);
  return { stage, session, showId };
}

// Waits until the camera has stopped moving, so positions on screen are final.
async function settled(page) {
  let last = null;
  await expect
    .poll(
      async () => {
        const pos = (await state(page)).position.map((v) => v.toFixed(3)).join(",");
        const still = pos === last;
        last = pos;
        await page.waitForTimeout(150);
        return still;
      },
      { timeout: 10000 }
    )
    .toBe(true);
}

async function clickSeat(page, seatNumber) {
  await settled(page);
  const p = await page.evaluate((n) => window.__cinema3d.project(n), seatNumber);
  expect(p && p.visible, `${seatNumber} should be in view`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
}

async function findSeat(page, seatNumber) {
  const input = panel(page).getByLabel("Seat number");
  await input.fill(seatNumber);
  await input.press("Enter");
}

const heldTimer = (page) => panel(page).getByTestId("seat-hold-timer");

test.describe("desktop and tablet", () => {
  test.skip(({ isMobile }) => isMobile, "phones default to the 2D map (checked below)");

  test("loads without errors and the scroll flies the camera from the screen to the seats", async ({ page }, testInfo) => {
    const errors = watchErrors(page, [/THREE\.Clock: This module has been deprecated/]);
    await open3D(page, { reducedMotion: false });
    const start = await state(page);
    expect(start.mode).toBe("intro");
    expect(start.position[2]).toBeLessThan(4); // on the stage, by the screen
    await expect(page.getByText("Scroll to fly from the screen to the seats")).toBeVisible();

    // Plain wheel scrolls the page; stop as soon as the flight has finished.
    for (let i = 0; i < 30 && !(await state(page)).introDone; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(60);
    }
    await expect.poll(async () => (await state(page)).introDone).toBe(true);
    await page.waitForTimeout(200);
    const end = await state(page);
    expect(end.mode).toBe("overview");
    expect(end.position[2]).toBeGreaterThan(18); // high at the back of the hall
    expect(end.position[1]).toBeGreaterThan(8);

    // The page doesn't jump when the intro's scroll space is removed.
    const top = await page.getByTestId("auditorium-3d").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - 84)).toBeLessThan(40);
    await snap(page, testInfo, "3d-overview");
    expect(errors).toEqual([]);
  });

  test("mouse: drag rotates all the way round; plain wheel scrolls the page, Ctrl+wheel zooms", async ({ page }) => {
    const { stage } = await open3D(page);
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    const cx = box.x + box.width * 0.35; // left of the floating panel
    const cy = box.y + box.height / 2;

    let total = 0;
    for (let i = 0; i < 4; i++) {
      const a0 = (await state(page)).azimuth;
      await page.mouse.move(cx - 150, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 150, cy, { steps: 12 });
      await page.mouse.up();
      await settled(page);
      total += Math.abs((await state(page)).azimuth - a0);
    }
    expect(total).toBeGreaterThan(2 * Math.PI);
    expect((await state(page)).mode).toBe("free");

    await page.getByRole("button", { name: "Reset camera" }).click();
    await settled(page);
    const d0 = dist(await state(page));
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
    expect(Math.abs(dist(await state(page)) - d0)).toBeLessThan(0.05);

    await stage.scrollIntoViewIfNeeded();
    const b2 = await stage.boundingBox();
    await page.mouse.move(b2.x + b2.width * 0.35, b2.y + b2.height / 2);
    const y1 = await page.evaluate(() => window.scrollY);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -300);
    await page.keyboard.up("Control");
    await settled(page);
    expect(dist(await state(page))).toBeLessThan(d0 - 1);
    expect(await page.evaluate(() => window.scrollY)).toBe(y1);
  });

  test("keyboard: look around, zoom, views, pick a seat by number, leave the seat view", async ({ page }, testInfo) => {
    const { stage } = await open3D(page);
    const seat = pick(testInfo, { desktop: "G2", tablet: "G3" });
    await stage.focus();
    await expect(stage).toBeFocused();

    const a0 = (await state(page)).azimuth;
    await page.keyboard.press("ArrowRight");
    await settled(page);
    expect((await state(page)).azimuth - a0).toBeGreaterThan(0.2);

    const d0 = dist(await state(page));
    await page.keyboard.press("+");
    await settled(page);
    expect(dist(await state(page))).toBeLessThan(d0 - 1);

    await page.keyboard.press("2");
    await expect.poll(async () => (await state(page)).mode).toBe("map");
    await page.keyboard.press("0");
    await expect.poll(async () => (await state(page)).mode).toBe("overview");

    // Keyboard-only seat selection through the seat finder.
    await findSeat(page, seat.toLowerCase());
    await expect.poll(async () => (await state(page)).viewSeat).toBe(seat);
    await expect(panel(page)).toContainText(seat);
    await stage.focus();
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await state(page)).mode).toBe("map");

    // Unknown and booked seats are explained, not selected.
    await findSeat(page, "Z99");
    await expect(panel(page).getByRole("alert")).toHaveText(/no seat Z99/i);
    await findSeat(page, "H5");
    await expect(panel(page).getByRole("alert")).toHaveText(/H5 is already booked/);
  });

  test("click seats in 3D: selected, the camera moves to each seat, compare and return", async ({ page }, testInfo) => {
    const { stage } = await open3D(page);
    const [a, b] = pick(testInfo, { desktop: ["K4", "B3"], tablet: ["K5", "B4"] });
    await page.getByRole("button", { name: "Seat map", exact: true }).click();

    // Hover shows row, seat, category, price and state.
    await settled(page);
    const p = await page.evaluate((n) => window.__cinema3d.project(n), a);
    await page.mouse.move(p.x, p.y);
    await expect(stage.getByText(`Row K · Seat ${a.slice(1)}`)).toBeVisible();
    await expect(stage.getByText(/Second Class · ₹160 · Available/)).toBeVisible();

    await clickSeat(page, a);
    await expect.poll(async () => (await state(page)).viewSeat).toBe(a);
    const s = await state(page);
    expect(s.mode).toBe("seat");
    // The camera sits at the seat's real position: row K is the second row from
    // the screen (about 6.6 m back) at seated eye height.
    expect(s.position[2]).toBeGreaterThan(5.5);
    expect(s.position[2]).toBeLessThan(8);
    expect(s.position[1]).toBeGreaterThan(1);
    expect(s.position[1]).toBeLessThan(2);
    const view = page.getByTestId("seat-view-panel");
    await expect(view).toContainText("View from your seat");
    await expect(view).toContainText(/\d+(\.\d)? m/);
    await snap(page, testInfo, "3d-seat-view");
    await expect(panel(page)).toContainText(a);

    await view.getByRole("button", { name: "Back to the auditorium" }).click();
    await clickSeat(page, b);
    await expect.poll(async () => (await state(page)).viewSeat).toBe(b);
    // Compare: switch between the two seats from the seat-view panel.
    await view.getByRole("button", { name: a, exact: true }).click();
    await expect.poll(async () => (await state(page)).viewSeat).toBe(a);
    // …and from the booking panel's preview button.
    await panel(page).getByRole("button", { name: `Preview the view from ${b}` }).click();
    await expect.poll(async () => (await state(page)).viewSeat).toBe(b);

    // Escape returns to the auditorium; clicking a selected seat deselects it.
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await state(page)).mode).toBe("map");
    await clickSeat(page, a);
    await expect(panel(page)).not.toContainText(a);
    expect((await state(page)).mode).toBe("map");
  });

  test("booked seats can't be selected in 3D", async ({ page }) => {
    const { stage } = await open3D(page);
    await page.getByRole("button", { name: "Seat map", exact: true }).click();
    await settled(page);
    const p = await page.evaluate(() => window.__cinema3d.project("H5")); // booked in the fixture
    await page.mouse.move(p.x, p.y);
    await expect(stage.getByText(/· Booked/)).toBeVisible();
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(300);
    expect((await state(page)).mode).toBe("map");
    await expect(panel(page)).toContainText("0 tickets");
  });

  test("3D selection → automatic hold → checkout → confirmed booking", async ({ page, request }, testInfo) => {
    const { showId } = await open3D(page);
    // Two balcony seats that are still free on the server (this test really books them).
    const free = Object.values(await serverSeats(request, showId))
      .filter((s) => /^[CD]\d+$/.test(s.seatNumber) && !s.isBooked && !s.isHeld)
      .map((s) => s.seatNumber);
    const seats = testInfo.project.name === "tablet" ? free.slice(-2) : free.slice(0, 2);
    expect(seats).toHaveLength(2);
    await page.getByRole("button", { name: "Seat map", exact: true }).click();

    await clickSeat(page, seats[0]);
    await expect.poll(async () => (await state(page)).viewSeat).toBe(seats[0]);
    await page.getByTestId("seat-view-panel").getByRole("button", { name: "Back to the auditorium" }).click();
    await clickSeat(page, seats[1]);

    // The panel lists each seat with its category and price, and the total.
    for (const n of seats) {
      await expect(panel(page)).toContainText(n);
    }
    await expect(panel(page)).toContainText("Balcony");
    await expect(panel(page)).toContainText("₹640"); // 2 × ₹320
    await expect(panel(page)).toContainText("2 tickets");
    // The hold is placed automatically and the countdown starts at ~8 minutes.
    await expect(heldTimer(page)).toHaveText(/^[78]:\d\d$/);

    // The server agrees: other people see both seats as held.
    const anon = await serverSeats(request, showId);
    for (const n of seats) expect(anon[n].isHeld).toBe(true);

    await panel(page).getByRole("button", { name: /^Continue/ }).click();
    await expect(page).toHaveURL(/\/addons\//);
    const confirm = page.getByRole("button", { name: /Confirm demo booking/ });
    await expect(confirm).toContainText("₹640");
    await confirm.click();
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
    await expect(page.getByText(seats.join(", "))).toBeVisible();

    const after = await serverSeats(request, showId);
    for (const n of seats) {
      expect(after[n].isBooked).toBe(true);
      expect(after[n].isHeld).toBe(false);
    }
  });

  test("rapid selection changes: the server ends up holding exactly the latest selection", async ({ page, request }, testInfo) => {
    const { session, showId } = await open3D(page);
    const [s1, s2, s3] = pick(testInfo, { desktop: ["A1", "A2", "A3"], tablet: ["A6", "A7", "A8"] });

    // Select, select, remove, select: faster than the debounce and the requests.
    await findSeat(page, s1);
    await findSeat(page, s2);
    await panel(page).getByRole("button", { name: `Remove ${s1}` }).click();
    await findSeat(page, s3);
    await expect(heldTimer(page)).toBeVisible();

    await expect
      .poll(async () => {
        const mine = await serverSeats(request, showId, session.token);
        return Object.values(mine).filter((s) => s.heldByMe).map((s) => s.seatNumber).sort().join(",");
      })
      .toBe([s2, s3].sort().join(","));
    // And the stale seat is free again for everyone.
    expect((await serverSeats(request, showId))[s1].isHeld).toBe(false);

    // Clearing the selection releases the hold.
    await panel(page).getByRole("button", { name: "Clear selection" }).click();
    await expect
      .poll(async () => {
        const anon = await serverSeats(request, showId);
        return [s2, s3].some((n) => anon[n].isHeld);
      })
      .toBe(false);
  });

  test("leaving the booking flow releases the hold", async ({ page, request }, testInfo) => {
    const { showId } = await open3D(page);
    const seat = pick(testInfo, { desktop: "B7", tablet: "B8" });
    await findSeat(page, seat);
    await expect(heldTimer(page)).toBeVisible();
    expect((await serverSeats(request, showId))[seat].isHeld).toBe(true);

    // In-app navigation away from the booking flow (the logo is visible at every width).
    await page.getByRole("link", { name: "CineBook home" }).first().click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect.poll(async () => (await serverSeats(request, showId))[seat].isHeld).toBe(false);
  });

  test("two customers competing for the same seats", async ({ page, browser, request }, testInfo) => {
    const { showId } = await open3D(page, { who: "user" });
    const [x, y] = pick(testInfo, { desktop: ["K9", "K10"], tablet: ["K11", "K12"] });

    // Customer A holds seat x.
    await findSeat(page, x);
    await expect(heldTimer(page)).toBeVisible();

    // Customer B, in a separate browser session, sees x as taken.
    const ctxB = await browser.newContext({ viewport: page.viewportSize() });
    const pageB = await ctxB.newPage();
    const { session: sessionB } = await open3D(pageB, { who: "user2" });
    await findSeat(pageB, x);
    await expect(panel(pageB).getByRole("alert")).toHaveText(`${x} is being held by someone else.`);
    await expect(panel(pageB)).toContainText("0 tickets");

    // Both go for seat y at the same moment: the server lets exactly one win.
    await Promise.all([findSeat(page, y), findSeat(pageB, y)]);
    await page.waitForTimeout(1500);
    const aHas = async () => (await panel(page).textContent()).includes(y);
    const bHas = async () => (await panel(pageB).textContent()).includes(y);
    await expect.poll(async () => Number(await aHas()) + Number(await bHas()), { timeout: 10000 }).toBe(1);
    const loser = (await aHas()) ? pageB : page;
    await expect(loser.getByText(`${y} was just taken by someone else`)).toBeVisible();
    // The server agrees with what the winner sees.
    const mineB = await serverSeats(request, showId, sessionB.token);
    expect(mineB[y].heldByMe === true).toBe(await bHas());

    // A lets go of x; after a refresh B can take it.
    if (await aHas()) await panel(page).getByRole("button", { name: `Remove ${y}` }).click();
    await panel(page).getByRole("button", { name: `Remove ${x}` }).click();
    await expect.poll(async () => (await serverSeats(request, showId))[x].isHeld).toBe(false);
    await pageB.getByRole("button", { name: "Refresh seat availability" }).click();
    await findSeat(pageB, x);
    await expect(panel(pageB)).toContainText(x);
    await expect(heldTimer(pageB)).toBeVisible();
    await expect.poll(async () => (await serverSeats(request, showId, sessionB.token))[x].heldByMe === true).toBe(true);
    await ctxB.close();
  });

  test("reduced motion skips the scroll intro", async ({ page }) => {
    await open3D(page);
    const s = await state(page);
    expect(s.introDone).toBe(true);
    expect(s.mode).toBe("overview");
    await expect(page.getByText("Scroll to fly from the screen to the seats")).toHaveCount(0);
  });

  test("the 2D/3D choice is remembered, and without WebGL the 2D map is used", async ({ page, context }) => {
    await open3D(page);
    await page.getByRole("button", { name: "2D map" }).click();
    await expect(page.getByTestId("seat-map-scroll")).toBeVisible();
    // A new tab in the same browser (no test set-up scripts) keeps the 2D choice.
    const again = await context.newPage();
    await again.goto(page.url());
    await expect(again.getByTestId("seat-map-scroll")).toBeVisible();
    await expect(again.getByTestId("auditorium-3d")).toHaveCount(0);
    await again.close();

    const noGl = await context.newPage();
    await noGl.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/i.test(type) ? null : orig.call(this, type, ...rest);
      };
      localStorage.setItem("cinebook:seatView", "3d");
    });
    await noGl.goto(page.url());
    await expect(noGl.getByTestId("seat-map-scroll")).toBeVisible();
    await expect(noGl.getByRole("group", { name: "Seat view" })).toHaveCount(0);
  });
});

test.describe("touch (tablet)", () => {
  test.skip(({ hasTouch, isMobile }) => !hasTouch || isMobile, "touch navigation is checked on the tablet project");

  test("swipe scrolls the page until you choose to explore; then drag rotates and pinch zooms; tap selects", async ({ page }, testInfo) => {
    const { stage } = await open3D(page);
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches), "tablet should report a coarse pointer").toBe(true);
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    const x = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.5;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([px, py], id) => ({ x: px, y: py, id })) });
    const drag = async (dx) => {
      await touch("touchStart", [[x, y]]);
      for (let i = 1; i <= 10; i++) await touch("touchMove", [[x + (dx * i) / 10, y]]);
      await touch("touchEnd", []);
    };

    // Not exploring yet: a one-finger drag doesn't turn the camera.
    const a0 = (await state(page)).azimuth;
    await drag(200);
    await page.waitForTimeout(300);
    expect(Math.abs((await state(page)).azimuth - a0)).toBeLessThan(0.01);

    // Browsers drop a tap that lands within a few ms of the end of a swipe (to avoid
    // accidental taps); a person can't tap that fast, so pause like one would.
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Explore in 3D" }).tap();
    await expect(page.getByRole("button", { name: "Done exploring" })).toBeVisible();
    await drag(200);
    await settled(page);
    expect(Math.abs((await state(page)).azimuth - a0)).toBeGreaterThan(0.2);

    // Two-finger pinch out zooms in.
    const d0 = dist(await state(page));
    await touch("touchStart", [[x - 40, y], [x + 40, y]]);
    for (let i = 1; i <= 10; i++) await touch("touchMove", [[x - 40 - i * 15, y], [x + 40 + i * 15, y]]);
    await touch("touchEnd", []);
    await settled(page);
    expect(dist(await state(page))).toBeLessThan(d0 - 0.5);

    // Back to normal: tapping a seat selects it.
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Done exploring" }).tap();
    await page.getByRole("button", { name: "Seat map", exact: true }).tap();
    await settled(page);
    const seat = "J9";
    const p = await page.evaluate((n) => window.__cinema3d.project(n), seat);
    await page.touchscreen.tap(p.x, p.y);
    await expect(panel(page)).toContainText(seat);
    await snap(page, testInfo, "3d-touch-selected");
  });
});

test.describe("phones", () => {
  test.skip(({ isMobile }) => !isMobile, "phone-only check");
  test("phones start on the 2D map, with 3D one tap away", async ({ page }) => {
    await signIn(page, "user");
    await page.goto(`/seats/${await firstShowId(page)}`);
    await expect(page.getByTestId("seat-map-scroll")).toBeVisible();
    await expect(page.getByRole("button", { name: "3D hall" })).toBeVisible();
    await settle(page);
  });
});
