// Large multiplex halls (300, 400 and 500 seats) in the 3D auditorium, end to
// end against the real API: the hall matches the server's seats, seats in the
// front/middle/rear and left/centre/right blocks are picked by clicking in 3D
// (real raycasting), holds and bookings stay in sync with the server, the
// camera views and limits, the trailer while navigating, rendering numbers,
// and that opening and closing the hall doesn't leak memory.
// The shows are created through the admin API in the throwaway e2e database.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { API, ADMIN_PASSWORD, useSeatView, signIn, watchErrors, snap } = require("./helpers");

const CAPACITIES = [300, 400, 500];
const PRICES = { balconyPrice: 420, firstClassPrice: 300, secondClassPrice: 180 };
const YT_ORIGIN = "https://www.youtube-nocookie.com";
const MAGENTA = ([r, g, b]) => r > 190 && g < 90 && b > 190;
const PERF_FILE = path.join(__dirname, "report", "multiplex-perf.json");

const state = (page) => page.evaluate(() => window.__cinema3d.getState());
const panel = (page) => page.getByTestId("booking-panel");
const dist = (s) => Math.hypot(...s.position.map((v, i) => v - s.target[i]));
const dayFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

let adminToken;
let movieId;
const showIds = {};

test.beforeAll(async ({ request }) => {
  adminToken = (await (await request.post(`${API}/api/auth/admin/login`, { data: { password: ADMIN_PASSWORD } })).json()).token;
  const movies = await (await request.get(`${API}/api/movies`)).json();
  movieId = movies[0]._id;
  const existing = await (await request.get(`${API}/api/shows?lite=1`)).json();
  for (const capacity of CAPACITIES) {
    const theatre = `Mega Screen ${capacity}`;
    const found = existing.find((s) => s.theatre === theatre);
    if (found) {
      showIds[capacity] = found._id;
      continue;
    }
    const res = await request.post(`${API}/api/shows`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      // Later than the seeded shows, so other tests' "first show" stays the same.
      data: { movieId, theatre, date: dayFromNow(30), time: "19:00", ...PRICES, layoutId: `multiplex-${capacity}` },
    });
    expect(res.status()).toBe(201);
    showIds[capacity] = (await res.json())._id;
  }
});

// Close the page ourselves and time it, so a slow shutdown shows up as its own
// step (page close vs. the rest of the context teardown) instead of a timeout.
test.afterEach(async ({ page }, testInfo) => {
  const t = Date.now();
  await page.close();
  const ms = Date.now() - t;
  if (ms > 2000) console.log(`[cleanup] ${testInfo.project.name} "${testInfo.title}": page.close took ${ms} ms`);
});

async function serverSeats(request, showId) {
  const show = await (await request.get(`${API}/api/shows/single/${showId}`)).json();
  return Object.fromEntries(show.seats.map((s) => [s.seatNumber, s]));
}

async function open3D(page, testInfo, capacity, { reducedMotion = true } = {}) {
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await useSeatView(page, "3d");
  const session = await signIn(page, "user");
  await page.request.delete(`${API}/api/shows/${showIds[capacity]}/holds`, { headers: { Authorization: `Bearer ${session.token}` } });
  await page.goto(`/seats/${showIds[capacity]}`);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "3D hall" }).tap();
  await waitFirstFrame(page);
  return session;
}

const waitFirstFrame = (page) =>
  page.waitForFunction(() => window.__cinema3d && window.__cinema3d.getState().timings.firstFrame, null, { timeout: 30000, polling: 100 });

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

/** A free seat of this depth band and block whose spot on screen is clear of the overlays. */
async function clickableSeat(page, request, showId, depth, block, taken) {
  const free = await serverSeats(request, showId);
  const candidates = await page.evaluate((q) => window.__cinema3d.seatsWhere(q), { depth, block });
  for (const n of candidates) {
    if (taken.includes(n) || free[n].isBooked || free[n].isHeld) continue;
    const p = await page.evaluate((x) => window.__cinema3d.project(x), n);
    if (!p || !p.visible) continue;
    const clear = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return !!el && el.tagName === "CANVAS" && !!el.closest("[data-testid=auditorium-3d]");
    }, [p.x, p.y]);
    if (clear) return { n, p };
  }
  return null;
}

function recordPerf(testInfo, entry) {
  fs.mkdirSync(path.dirname(PERF_FILE), { recursive: true });
  const all = fs.existsSync(PERF_FILE) ? JSON.parse(fs.readFileSync(PERF_FILE, "utf8")) : [];
  all.push({ project: testInfo.project.name, ...entry });
  fs.writeFileSync(PERF_FILE, JSON.stringify(all, null, 2));
  console.log(`[perf] ${testInfo.project.name} ${JSON.stringify(entry)}`);
}

/** Average time per rendered frame while the camera keeps turning. */
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

for (const capacity of CAPACITIES) {
  test(`${capacity}-seat hall: every server seat is in the 3D hall, and it renders smoothly`, async ({ page, request }, testInfo) => {
    const errors = watchErrors(page, [/THREE\.Clock: This module has been deprecated/]);
    const t0 = Date.now();
    await open3D(page, testInfo, capacity);
    const loadMs = Date.now() - t0;
    const s = await state(page);
    const server = await serverSeats(request, showIds[capacity]);
    expect(Object.keys(server)).toHaveLength(capacity);
    expect(s.seats).toBe(capacity);
    expect(s.layout).toBe(`multiplex-${capacity}`);
    expect(s.rows).toBeGreaterThanOrEqual(20);
    expect(s.rows).toBeLessThanOrEqual(25);
    // Every seat the server has is in the hall, and nothing else.
    const inHall = await page.evaluate(() => window.__cinema3d.seatsWhere({}));
    expect(inHall.sort()).toEqual(Object.keys(server).sort());
    for (const block of ["left", "centre", "right"]) {
      expect((await page.evaluate((b) => window.__cinema3d.seatsWhere({ block: b }), block)).length).toBeGreaterThan(capacity / 5);
    }
    await expect(panel(page)).toContainText(`of ${capacity} seats still available`);

    await page.evaluate(() => window.__cinema3d.goTo("overview"));
    await settled(page);
    const overview = await state(page);
    const frames = await measureFrames(page);
    recordPerf(testInfo, {
      capacity,
      rows: s.rows,
      renderer: s.renderer,
      lowPower: s.lowPower,
      pageToFirstFrameMs: Math.round(s.timings.firstFrame - s.timings.mounted),
      navigationToFirstFrameMs: loadMs,
      shaderCompile: s.timings.shaders,
      drawCalls: overview.drawCalls,
      triangles: overview.triangles,
      programs: overview.programs,
      geometries: overview.memory.geometries,
      textures: overview.memory.textures,
      ...frames,
    });
    // Instancing keeps the draw calls flat however many seats there are.
    expect(overview.drawCalls).toBeLessThan(90);
    await snap(page, testInfo, `multiplex-${capacity}-overview`);
    await page.evaluate(() => window.__cinema3d.goTo("map"));
    await settled(page);
    await snap(page, testInfo, `multiplex-${capacity}-map`);
    expect(errors).toEqual([]);
  });
}

test("500 seats: front, middle and rear seats in the left, centre and right blocks are picked in 3D and held on the server", async ({ page, request }, testInfo) => {
  const session = await open3D(page, testInfo, 500);
  const showId = showIds[500];
  const picked = [];
  const clickToSelectedMs = [];
  if (testInfo.project.name === "mobile") {
    // Phones: the bottom sheet covers most of the hall, so use the seat finder.
    for (const depth of ["front", "middle", "rear"]) {
      for (const block of ["left", "centre", "right"]) {
        const free = await serverSeats(request, showId);
        const n = (await page.evaluate((q) => window.__cinema3d.seatsWhere(q), { depth, block })).find((x) => !free[x].isBooked && !free[x].isHeld && !picked.includes(x));
        const input = panel(page).getByLabel("Seat number");
        if (!(await input.isVisible())) await panel(page).getByRole("button", { name: /Show seats/ }).tap();
        await input.fill(n);
        await input.press("Enter");
        // Picking a seat shows the view from it; go back to the hall.
        await expect.poll(async () => (await state(page)).viewSeat).toBe(n);
        picked.push(n);
        await page.getByTestId("seat-view-panel").getByRole("button", { name: "Back to the auditorium" }).tap();
        await expect.poll(async () => (await state(page)).mode).toBe("map");
      }
    }
  } else {
    await page.getByRole("button", { name: "Seat map", exact: true }).click();
    await settled(page);
    for (const depth of ["front", "middle", "rear"]) {
      for (const block of ["left", "centre", "right"]) {
        const target = await clickableSeat(page, request, showId, depth, block, picked);
        expect(target, `a clickable ${depth} ${block} seat`).toBeTruthy();
        // Hover names the seat, its row and block.
        await page.mouse.move(target.p.x, target.p.y);
        const blockName = { left: "Left", centre: "Centre", right: "Right" }[block];
        await expect(page.getByTestId("auditorium-3d").getByText(new RegExp(`^${target.n} · Row`))).toBeVisible();
        await expect(page.getByTestId("auditorium-3d").getByText(new RegExp(`${blockName} block`))).toBeVisible();
        // Responsiveness: time from the click to the seat showing as selected in the panel.
        const tClick = Date.now();
        await page.mouse.click(target.p.x, target.p.y);
        await expect(panel(page).getByText(target.n, { exact: true })).toBeVisible();
        clickToSelectedMs.push(Date.now() - tClick);
        await expect.poll(async () => (await state(page)).viewSeat).toBe(target.n);
        picked.push(target.n);
        await page.getByTestId("seat-view-panel").getByRole("button", { name: "Back to the auditorium" }).click();
        await expect.poll(async () => (await state(page)).mode).toBe("map");
        await settled(page);
      }
    }
  }
  expect(picked).toHaveLength(9);
  if (clickToSelectedMs.length) {
    const sorted = [...clickToSelectedMs].sort((a, b) => a - b);
    recordPerf(testInfo, {
      capacity: 500,
      seatSelection: { clicks: sorted.length, medianMs: sorted[Math.floor(sorted.length / 2)], maxMs: sorted[sorted.length - 1] },
    });
  }
  await expect(panel(page)).toContainText("9 tickets");
  await expect(panel(page).getByTestId("seat-hold-timer")).toHaveText(/^[78]:\d\d$/);

  // The server holds exactly these seats for this customer; everyone else sees them taken.
  await expect
    .poll(async () => {
      const mine = await (await request.get(`${API}/api/shows/single/${showId}`, { headers: { Authorization: `Bearer ${session.token}` } })).json();
      return mine.seats.filter((x) => x.heldByMe).map((x) => x.seatNumber).sort().join(",");
    })
    .toBe([...picked].sort().join(","));
  const anon = await serverSeats(request, showId);
  picked.forEach((n) => expect(anon[n].isHeld).toBe(true));
  await snap(page, testInfo, "multiplex-500-nine-seats");

  // Releasing them frees them for everyone again.
  await panel(page).getByRole("button", { name: "Clear selection" }).click();
  await expect.poll(async () => Object.values(await serverSeats(request, showId)).filter((x) => x.isHeld).length).toBe(0);
});

test("500 seats: book a rear seat in the right block end to end", async ({ page, request }, testInfo) => {
  await open3D(page, testInfo, 500);
  const showId = showIds[500];
  const free = await serverSeats(request, showId);
  const rear = (await page.evaluate(() => window.__cinema3d.seatsWhere({ depth: "rear", block: "right" }))).filter((n) => !free[n].isBooked);
  const seat = testInfo.project.name === "desktop" ? rear[0] : testInfo.project.name === "tablet" ? rear[1] : rear[2];
  if (testInfo.project.name === "mobile") await panel(page).getByRole("button", { name: /Show seats/ }).tap();
  const input = panel(page).getByLabel("Seat number");
  await input.fill(seat);
  await input.press("Enter");
  await expect(panel(page)).toContainText(seat);
  await expect(panel(page).getByTestId("seat-hold-timer")).toBeVisible();
  await panel(page).getByRole("button", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/addons\//);
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  expect((await serverSeats(request, showId))[seat].isBooked).toBe(true);

  // Back in the hall, the seat shows as unavailable and can't be picked.
  await page.goto(`/seats/${showId}`);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "3D hall" }).tap();
  await waitFirstFrame(page);
  if (testInfo.project.name === "mobile") await panel(page).getByRole("button", { name: /Show seats/ }).tap();
  await panel(page).getByLabel("Seat number").fill(seat);
  await panel(page).getByLabel("Seat number").press("Enter");
  await expect(panel(page).getByRole("alert")).toHaveText(`${seat} is already booked.`);
});

test("camera views and limits in the 500-seat hall", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "mouse navigation is checked on desktop and tablet");
  await open3D(page, testInfo, 500);
  const toolbar = page.getByRole("toolbar", { name: "Camera views" });
  for (const label of ["Overview", "Front", "Centre", "Rear", "Seat map"]) {
    await expect(toolbar.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await expect(toolbar.getByRole("button", { name: "Reset view" })).toBeVisible();

  const z = {};
  for (const [label, mode] of [["Front", "front"], ["Centre", "centre"], ["Rear", "rear"]]) {
    await toolbar.getByRole("button", { name: label, exact: true }).click();
    await settled(page);
    const s = await state(page);
    expect(s.mode).toBe(mode);
    await expect(toolbar.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
    z[mode] = s.position[2];
    await snap(page, testInfo, `multiplex-500-${mode}`);
  }
  // Front, centre and rear views really are front, centre and rear of the seating.
  expect(z.front).toBeLessThan(z.centre);
  expect(z.centre).toBeLessThan(z.rear);

  // No extreme angles: dragging far up or down stays between just above the
  // floor and straight down; zooming stays between the limits.
  const box = await page.getByTestId("auditorium-3d").boundingBox();
  const cx = box.x + box.width * 0.35;
  const cy = box.y + box.height * 0.5;
  await toolbar.getByRole("button", { name: "Overview", exact: true }).click();
  await settled(page);
  for (const dy of [600, -600]) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + dy, { steps: 15 });
    await page.mouse.up();
    await settled(page);
    const s = await state(page);
    expect(s.polar).toBeGreaterThanOrEqual(0.15 - 0.001);
    expect(s.polar).toBeLessThanOrEqual(Math.PI / 2);
  }
  for (let i = 0; i < 15; i++) await toolbar.getByRole("button", { name: "Zoom in" }).click();
  await settled(page);
  expect(dist(await state(page))).toBeGreaterThanOrEqual(2.5 - 0.01);
  for (let i = 0; i < 25; i++) await toolbar.getByRole("button", { name: "Zoom out" }).click();
  await settled(page);
  const out = await state(page);
  expect(dist(out)).toBeLessThanOrEqual(out.maxDistance + 0.01);
  // The camera never leaves the building.
  expect(Math.abs(out.target[0])).toBeLessThanOrEqual(13.01);

  await toolbar.getByRole("button", { name: "Reset view" }).click();
  await settled(page);
  expect((await state(page)).mode).toBe("overview");
});

test("the trailer keeps playing on the big screen while you look around and pick seats (500 seats)", async ({ page, request }, testInfo) => {
  const original = (await (await request.get(`${API}/api/movies/${movieId}`)).json()).trailerUrl || "";
  const setTrailer = (url) =>
    request.put(`${API}/api/movies/${movieId}`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { trailerUrl: url } });
  await setTrailer("https://www.youtube.com/watch?v=goodtrailer");
  try {
    // A stand-in for YouTube that speaks its player protocol and is solid magenta.
    await page.route(`${YT_ORIGIN}/embed/**`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><body style="margin:0;background:#ff00ff"><script>
          const send = (m) => parent.postMessage(JSON.stringify(m), "*");
          addEventListener("message", (e) => { let d; try { d = JSON.parse(e.data); } catch (x) { return; }
            if (d.event === "listening") send({ event: "onReady" });
            if (d.event === "command" && d.func === "playVideo") send({ event: "onStateChange", info: 1 });
            if (d.event === "command" && d.func === "pauseVideo") send({ event: "onStateChange", info: 2 }); });
        </script></body>`,
      })
    );
    await open3D(page, testInfo, 500, { reducedMotion: false });
    const bar = page.getByTestId("trailer-controls");
    await expect(bar).toBeVisible();
    if ((await bar.getAttribute("data-status")) === "ready") await bar.getByRole("button", { name: "Play trailer" }).click();
    await expect(bar).toHaveAttribute("data-status", "playing", { timeout: 15000 });

    // Look around and pick a seat; the trailer never stops.
    for (const view of ["overview", "rear", "front", "map", "centre"]) {
      await page.evaluate((v) => window.__cinema3d.goTo(v), view);
      await settled(page);
      await page.evaluate(() => window.__cinema3d.rotate(20));
      await expect(bar).toHaveAttribute("data-status", "playing");
    }
    if (testInfo.project.name === "mobile") await panel(page).getByRole("button", { name: /Show seats/ }).tap();
    await panel(page).getByLabel("Seat number").fill("M10");
    await panel(page).getByLabel("Seat number").press("Enter");
    await expect(panel(page)).toContainText("M10");
    await expect(bar).toHaveAttribute("data-status", "playing");

    // From the centre of the hall the picture is on the screen (a real screenshot pixel).
    await page.evaluate(() => window.__cinema3d.goTo("centre"));
    await settled(page);
    const p = await page.evaluate(() => window.__cinema3d.projectScreen(0, 0.3));
    const png = await page.screenshot({ clip: { x: Math.round(p.x) - 2, y: Math.round(p.y) - 2, width: 4, height: 4 } });
    const rgb = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      return Array.from(c.getContext("2d").getImageData(1, 1, 1, 1).data.slice(0, 3));
    }, png.toString("base64"));
    expect(MAGENTA(rgb), `screen pixel ${rgb}`).toBe(true);
    await snap(page, testInfo, "multiplex-500-trailer");
  } finally {
    await setTrailer(original);
  }
});

test("opening and closing the 500-seat hall repeatedly doesn't leak, and Lite mode is lighter", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "memory is measured once, on desktop");
  await open3D(page, testInfo, 500);
  const cdp = await page.context().newCDPSession(page);
  const heap = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(300);
    await cdp.send("HeapProfiler.collectGarbage");
    return (await cdp.send("Runtime.getHeapUsage")).usedSize;
  };
  const first = await state(page);
  const heap0 = await heap();

  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "2D map" }).click();
    await expect(page.getByTestId("seat-map-scroll")).toBeVisible();
    await expect(page.getByTestId("auditorium-3d")).toHaveCount(0);
    await page.getByRole("button", { name: "3D hall" }).click();
    await waitFirstFrame(page);
  }
  const again = await state(page);
  const heap1 = await heap();
  const growthMb = (heap1 - heap0) / 1048576;
  // The same scene again: no extra geometries or textures held by the renderer.
  expect(again.memory.geometries).toBe(first.memory.geometries);
  expect(again.memory.textures).toBe(first.memory.textures);
  expect(await page.locator("canvas").count()).toBe(1);
  expect(growthMb).toBeLessThan(25);

  // Lite mode: no shadows, lower resolution.
  await page.getByRole("button", { name: "Lite" }).click();
  await waitFirstFrame(page);
  await expect.poll(async () => (await state(page)).lowPower).toBe(true);
  await page.evaluate(() => window.__cinema3d.goTo("overview"));
  await settled(page);
  const lite = await state(page);
  const liteFrames = await measureFrames(page);
  recordPerf(testInfo, {
    capacity: 500,
    memoryCheck: {
      cycles: 5,
      heapBeforeMb: +(heap0 / 1048576).toFixed(1),
      heapAfterMb: +(heap1 / 1048576).toFixed(1),
      growthMb: +growthMb.toFixed(1),
      geometries: [first.memory.geometries, again.memory.geometries],
      textures: [first.memory.textures, again.memory.textures],
    },
    lite: { drawCalls: lite.drawCalls, triangles: lite.triangles, ...liteFrames },
  });
  expect(lite.drawCalls).toBeLessThan(first.drawCalls + 1);
  // Back to full quality for other tests.
  await page.getByRole("button", { name: "Lite" }).click();
  await waitFirstFrame(page);
});

test("the 2D map shows all 500 seats too, in three blocks per row", async ({ page }, testInfo) => {
  await useSeatView(page, "2d");
  await signIn(page, "user");
  await page.goto(`/seats/${showIds[500]}`);
  const map = page.getByTestId("seat-map-scroll");
  await expect(map).toBeVisible();
  await expect(map.getByRole("button", { name: /^Seat [A-Z]+\d+/ })).toHaveCount(500);
  await snap(page, testInfo, "multiplex-500-2d");
});
