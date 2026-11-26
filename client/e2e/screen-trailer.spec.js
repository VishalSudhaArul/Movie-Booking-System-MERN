// The movie trailer on the 3D auditorium's screen.
//
// YouTube is replaced by a small fake player at the same address that speaks
// the IFrame API's postMessage protocol and fills itself with pure magenta, so
// these tests run offline and can prove from real screenshots that the trailer
// is visible *on the 3D screen* (and that the poster is shown otherwise).
// Direct video files are recorded in the browser (solid magenta WebM) and served
// through a route, so the VideoTexture path is exercised with a real decoder.
const { test, expect } = require("@playwright/test");
const { API, ACCOUNTS, useSeatView, signIn, watchErrors, snap } = require("./helpers");

const YT_ORIGIN = "https://www.youtube-nocookie.com";
const MAGENTA = ([r, g, b]) => r > 190 && g < 90 && b > 190;

const fakePlayer = (id) => `<!doctype html><html><body style="margin:0;background:#ff00ff">
<script>
  const id = ${JSON.stringify(id)};
  const send = (m) => parent.postMessage(JSON.stringify(m), "*");
  addEventListener("message", (e) => {
    let d; try { d = JSON.parse(e.data); } catch (err) { return; }
    if (d.event === "listening") {
      if (id === "neverready1") return;            // never answers
      send({ event: "onReady" });
      if (id === "brokenvideo") send({ event: "onError", info: 150 }); // embedding refused
    }
    if (d.event === "command") {
      send({ event: "commandEcho", func: d.func });
      if (id === "brokenvideo") return;
      if (d.func === "playVideo") send({ event: "onStateChange", info: 1 });
      if (d.func === "pauseVideo") send({ event: "onStateChange", info: 2 });
    }
  });
</script></body></html>`;

let admin;
let shows; // two shows of different movies
const original = new Map();

test.beforeAll(async ({ request }) => {
  admin = await (await request.post(`${API}/api/auth/login`, { data: ACCOUNTS.admin })).json();
  const all = await (await request.get(`${API}/api/shows?lite=1`)).json();
  const byMovie = new Map();
  all.forEach((s) => byMovie.has(String(s.movieId)) || byMovie.set(String(s.movieId), s));
  shows = [...byMovie.values()].slice(0, 2).map((s) => ({ id: s._id, movieId: String(s.movieId) }));
  expect(shows).toHaveLength(2);
  for (const s of shows) {
    const movie = await (await request.get(`${API}/api/movies/${s.movieId}`)).json();
    original.set(s.movieId, movie.trailerUrl || "");
  }
});

// Put every movie back the way the seed data had it.
test.afterAll(async ({ request }) => {
  for (const [movieId, trailerUrl] of original) await setTrailer(request, movieId, trailerUrl);
});

async function setTrailer(request, movieId, trailerUrl) {
  const res = await request.put(`${API}/api/movies/${movieId}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: { trailerUrl },
  });
  expect(res.ok()).toBeTruthy();
}

const state = (page) => page.evaluate(() => window.__cinema3d.getState());
const controlsBar = (page) => page.getByTestId("trailer-controls");
const frames = (page) => page.getByTestId("screen-trailer-frame");

async function routes(page, { webm } = {}) {
  await page.route(`${YT_ORIGIN}/embed/**`, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    route.fulfill({ contentType: "text/html", body: fakePlayer(id) });
  });
  await page.route("**/e2e-trailers/**", (route) => {
    if (webm && route.request().url().endsWith("/magenta.webm")) {
      return route.fulfill({ status: 200, contentType: "video/webm", body: webm });
    }
    return route.fulfill({ status: 404, body: "" });
  });
  // Record what the page asks the player to do.
  await page.addInitScript((origin) => {
    window.__yt = [];
    addEventListener("message", (e) => {
      if (e.origin !== origin) return;
      try {
        const d = JSON.parse(e.data);
        if (d.event === "commandEcho") window.__yt.push(d.func);
      } catch (err) {
        /* not ours */
      }
    });
  }, YT_ORIGIN);
}

async function open3D(page, testInfo, showId, { reducedMotion = false } = {}) {
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await useSeatView(page, "3d");
  await signIn(page, "user");
  await page.goto(`/seats/${showId}`);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "3D hall" }).tap();
  await page.waitForFunction(() => window.__cinema3d && window.__cinema3d.getState().timings.firstFrame, null, { timeout: 20000, polling: 100 });
}

/** Points the camera at the screen and waits for it to stop. */
async function lookAtScreen(page) {
  await page.evaluate(() => window.__cinema3d.goTo("screen"));
  let last = "";
  await expect
    .poll(async () => {
      const pos = (await state(page)).position.map((v) => v.toFixed(3)).join();
      const still = pos === last;
      last = pos;
      await page.waitForTimeout(150);
      return still;
    }, { timeout: 10000 })
    .toBe(true);
}

/** The colour on the page at the middle of the cinema screen, from a real screenshot. */
async function screenColour(page, u = 0, v = 0) {
  const p = await page.evaluate(([a, b]) => window.__cinema3d.projectScreen(a, b), [u, v]);
  expect(p.visible).toBeTruthy();
  const png = await page.screenshot({ clip: { x: Math.round(p.x) - 3, y: Math.round(p.y) - 3, width: 6, height: 6 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return Array.from(ctx.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data.slice(0, 3));
  }, png.toString("base64"));
}

/** Presses Play only if the trailer is waiting for it (autoplay off). */
async function startIfWaiting(page) {
  const bar = controlsBar(page);
  await expect(bar).toBeVisible();
  if ((await bar.getAttribute("data-status")) === "ready") await bar.getByRole("button", { name: "Play trailer" }).click();
}

/** Low-power devices (and reduced motion) wait for Play; press it if needed. */
async function ensurePlaying(page) {
  const bar = controlsBar(page);
  await expect(bar).toBeVisible();
  await expect(bar).not.toHaveAttribute("data-status", "loading", { timeout: 10000 }).catch(() => {});
  if ((await bar.getAttribute("data-status")) === "ready") await bar.getByRole("button", { name: "Play trailer" }).click();
  await expect(bar).toHaveAttribute("data-status", "playing", { timeout: 10000 });
}

// A two-second, solid magenta VP8 WebM, made in the browser with WebCodecs and a
// minimal WebM (EBML) writer. (MediaRecorder gets no frames in headless Chrome.)
async function makeMagentaWebm(page) {
  await page.goto("/");
  const b64 = await page.evaluate(async () => {
  const W = 320, H = 180, FPS = 10, N = 20;
  const chunks = [];
  const enc = new VideoEncoder({ output: (c) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); chunks.push({ key: c.type === "key", ts: c.timestamp, b }); }, error: (e) => { throw e; } });
  enc.configure({ codec: "vp8", width: W, height: H, bitrate: 200000, framerate: FPS });
  const c = new OffscreenCanvas(W, H); const ctx = c.getContext("2d");
  for (let i = 0; i < N; i++) {
    ctx.fillStyle = "#ff00ff"; ctx.fillRect(0, 0, W, H);
    const f = new VideoFrame(c, { timestamp: (i * 1e6) / FPS, duration: 1e6 / FPS });
    enc.encode(f, { keyFrame: i === 0 }); f.close();
  }
  await enc.flush();
  // ---- minimal WebM (EBML) muxer ----
  const id = (...b) => b;
  const size = (n) => { // 8-byte EBML size
    const out = [0x01]; for (let i = 6; i >= 0; i--) out.push(Math.floor(n / 2 ** (8 * i)) & 0xff); return out; };
  const el = (idBytes, data) => [...idBytes, ...size(data.length), ...data];
  const uint = (v, len = 4) => { const o = []; for (let i = len - 1; i >= 0; i--) o.push(Math.floor(v / 2 ** (8 * i)) & 0xff); return o; };
  const str = (s) => [...s].map((ch) => ch.charCodeAt(0));
  const ebml = el(id(0x1a, 0x45, 0xdf, 0xa3), [
    ...el([0x42, 0x86], uint(1, 1)), ...el([0x42, 0xf7], uint(1, 1)), ...el([0x42, 0xf2], uint(4, 1)), ...el([0x42, 0xf3], uint(8, 1)),
    ...el([0x42, 0x82], str("webm")), ...el([0x42, 0x87], uint(2, 1)), ...el([0x42, 0x85], uint(2, 1)) ]);
  const info = el([0x15, 0x49, 0xa9, 0x66], [...el([0x2a, 0xd7, 0xb1], uint(1000000)), ...el([0x44, 0x89], [0x40, 0x9f, 0x40, 0, 0, 0, 0, 0]) /* duration 2000.0 ms (float64) */,
    ...el([0x4d, 0x80], str("e2e")), ...el([0x57, 0x41], str("e2e"))]);
  const tracks = el([0x16, 0x54, 0xae, 0x6b], el([0xae], [
    ...el([0xd7], uint(1, 1)), ...el([0x73, 0xc5], uint(1, 1)), ...el([0x83], uint(1, 1)), ...el([0x86], str("V_VP8")),
    ...el([0xe0], [...el([0xb0], uint(W, 2)), ...el([0xba], uint(H, 2))]) ]));
  const blocks = [];
  for (const ch of chunks) {
    const t = Math.round(ch.ts / 1000); // ms
    blocks.push(...el([0xa3], [0x81, (t >> 8) & 0xff, t & 0xff, ch.key ? 0x80 : 0x00, ...ch.b]));
  }
  const cluster = el([0x1f, 0x43, 0xb6, 0x75], [...el([0xe7], uint(0)), ...blocks]);
  const segment = el([0x18, 0x53, 0x80, 0x67], [...info, ...tracks, ...cluster]);
  const bytes = new Uint8Array([...ebml, ...segment]);
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  });
  return Buffer.from(b64, "base64");
}

test.describe("trailer on the 3D screen", () => {
  test("a YouTube trailer plays on the screen; controls outside it; seats still work", async ({ page, request }, testInfo) => {
    const errors = watchErrors(page);
    await setTrailer(request, shows[0].movieId, "https://www.youtube.com/watch?v=goodtrailer");
    await routes(page);
    await open3D(page, testInfo, shows[0].id);

    await expect(frames(page)).toHaveCount(1);
    expect(await frames(page).getAttribute("src")).toContain(`${YT_ORIGIN}/embed/goodtrailer?`);
    expect(await frames(page).getAttribute("src")).toContain("mute=1");
    await ensurePlaying(page);
    expect(await page.evaluate(() => window.__yt)).toContain("mute"); // starts muted

    // Seen on the 3D screen itself, from a real screenshot.
    await lookAtScreen(page);
    await expect.poll(async () => MAGENTA(await screenColour(page)), { timeout: 5000 }).toBe(true);
    await snap(page, testInfo, "3d-trailer-playing");

    // The controls are outside the screen area and don't overlap it.
    const box = await controlsBar(page).boundingBox();
    const mid = await page.evaluate(() => window.__cinema3d.projectScreen(0, 0));
    expect(mid.y > box.y + box.height || mid.x > box.x + box.width).toBeTruthy();

    // Unmute, then pause and play again.
    await controlsBar(page).getByRole("button", { name: "Unmute trailer" }).click();
    await expect(controlsBar(page).getByRole("button", { name: "Mute trailer" })).toHaveAttribute("aria-pressed", "true");
    await controlsBar(page).getByRole("button", { name: "Pause trailer" }).click();
    await expect(controlsBar(page)).toHaveAttribute("data-status", "paused");
    await controlsBar(page).getByRole("button", { name: "Play trailer" }).click();
    await expect(controlsBar(page)).toHaveAttribute("data-status", "playing");
    const log = await page.evaluate(() => window.__yt);
    expect(log).toEqual(expect.arrayContaining(["unMute", "pauseVideo", "playVideo"]));

    // Seats can still be picked by clicking in 3D while the trailer plays.
    if (testInfo.project.name !== "mobile") {
      await page.evaluate(() => window.__cinema3d.goTo("overview"));
      await page.waitForTimeout(800);
      const free = Object.values(
        Object.fromEntries((await (await request.get(`${API}/api/shows/single/${shows[0].id}`)).json()).seats.map((s) => [s.seatNumber, s]))
      ).filter((s) => !s.isBooked && !s.isHeld);
      let picked = null;
      for (const s of free.reverse()) {
        const p = await page.evaluate((n) => window.__cinema3d.project(n), s.seatNumber);
        if (p && p.visible) {
          const r = await page.getByTestId("auditorium-3d").boundingBox();
          // Not under an overlay (toolbars at the top, booking panel on the right).
          // And actually visible there: a real raycast at that pixel hits this seat
          // (a backrest in the row behind can hide a cushion from this angle).
          const inArea = p.x > r.x + 40 && p.x < r.x + r.width - 330 && p.y > r.y + 120 && p.y < r.y + r.height - 40;
          if (inArea && (await page.evaluate(([x, y]) => window.__cinema3d.hitAt(x, y), [p.x, p.y])) === s.seatNumber) {
            await page.mouse.click(p.x, p.y);
            picked = s.seatNumber;
            break;
          }
        }
      }
      expect(picked, "a free seat in view").toBeTruthy();
      await expect(page.getByTestId("booking-panel")).toContainText(picked);
      await expect(page.getByTestId("booking-panel").getByTestId("seat-hold-timer")).toBeVisible();
      // On to checkout: the 3D view (and its player) is released.
      await page.getByTestId("booking-panel").getByRole("button", { name: /^Continue/ }).click();
      await expect(page).toHaveURL(/\/addons\//);
      await expect(frames(page)).toHaveCount(0);
      await page.request.delete(`${API}/api/shows/${shows[0].id}/holds`, {
        headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem("token"))}` },
      });
    }
    expect(errors).toEqual([]);
  });

  test("no trailer: the poster is shown and no player is loaded", async ({ page, request }, testInfo) => {
    const errors = watchErrors(page);
    await setTrailer(request, shows[0].movieId, "");
    await routes(page);
    await open3D(page, testInfo, shows[0].id);
    await expect(controlsBar(page)).toHaveCount(0);
    await expect(frames(page)).toHaveCount(0);
    expect((await state(page)).trailer).toBe("none");
    await lookAtScreen(page);
    expect(MAGENTA(await screenColour(page))).toBe(false);
    await snap(page, testInfo, "3d-poster");
    expect(errors).toEqual([]);
  });

  test("links that aren't a playable trailer fall back to the poster", async ({ page, request }, testInfo) => {
    await routes(page);
    for (const url of ["https://vimeo.com/123456", "https://www.youtube.com/watch?v=short", "not a link"]) {
      await setTrailer(request, shows[0].movieId, url);
      await open3D(page, testInfo, shows[0].id);
      await expect(controlsBar(page)).toHaveCount(0);
      await expect(frames(page)).toHaveCount(0);
    }
  });

  test("a trailer YouTube refuses to play, one that never loads, and a missing video file", async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page, [/status of 404/]);
    await routes(page);

    // Embedding refused: the player reports an error.
    await setTrailer(request, shows[0].movieId, "https://youtu.be/brokenvideo");
    await open3D(page, testInfo, shows[0].id);
    const bar = controlsBar(page);
    await startIfWaiting(page);
    await expect(bar).toHaveAttribute("data-status", "failed", { timeout: 10000 });
    await expect(bar).toContainText("Trailer unavailable");
    // No play/pause or sound controls for a trailer that can't play; only "Try again".
    await expect(bar.getByRole("button")).toHaveCount(1);
    await expect(bar.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(frames(page)).toHaveCount(0); // the player is removed
    await lookAtScreen(page);
    expect(MAGENTA(await screenColour(page))).toBe(false);

    // The player never answers: given up after the start timeout.
    await setTrailer(request, shows[0].movieId, "neverready1");
    await open3D(page, testInfo, shows[0].id);
    await startIfWaiting(page);
    await expect(controlsBar(page)).toHaveAttribute("data-status", "failed", { timeout: 25000 });
    await expect(frames(page)).toHaveCount(0);

    // A direct video file that doesn't exist.
    await setTrailer(request, shows[0].movieId, "http://localhost:3000/e2e-trailers/missing.mp4");
    await open3D(page, testInfo, shows[0].id);
    await startIfWaiting(page);
    await expect(controlsBar(page)).toHaveAttribute("data-status", "failed", { timeout: 20000 });
    expect(errors.filter((e) => !/404/.test(e))).toEqual([]);
  });

  test("a direct video file plays on the curved screen through a video texture", async ({ page, request }, testInfo) => {
    const webm = await makeMagentaWebm(page);
    expect(webm.length).toBeGreaterThan(500);
    await setTrailer(request, shows[0].movieId, "http://localhost:3000/e2e-trailers/magenta.webm");
    await routes(page, { webm });
    await open3D(page, testInfo, shows[0].id);
    await ensurePlaying(page);
    await expect(frames(page)).toHaveCount(0); // no iframe: it's drawn by WebGL
    await lookAtScreen(page);
    await expect.poll(async () => MAGENTA(await screenColour(page)), { timeout: 5000 }).toBe(true);
    // A video texture covers the whole curved screen, edges included. The left
    // edge: on tablets and phones the booking panel sits over the right side.
    // On a narrow phone the screen's ends are outside the viewport, so use the
    // widest point that is actually in view and not under an overlay.
    let u = null;
    for (const candidate of [-0.85, -0.6, -0.4]) {
      const edge = await page.evaluate((c) => window.__cinema3d.projectScreen(c, 0), candidate);
      const clear = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return !!el && !!el.closest("[data-testid=auditorium-3d]") && !el.closest(".glass");
      }, [edge.x, edge.y]);
      if (clear) {
        u = candidate;
        break;
      }
    }
    expect(u, "some of the screen away from its centre is in view").not.toBeNull();
    await expect.poll(async () => MAGENTA(await screenColour(page, u, 0)), { timeout: 5000 }).toBe(true);
  });

  test("reduced motion: the poster stays until Play is pressed", async ({ page, request }, testInfo) => {
    await setTrailer(request, shows[0].movieId, "goodtrailer");
    await routes(page);
    await open3D(page, testInfo, shows[0].id, { reducedMotion: true });
    const bar = controlsBar(page);
    await expect(bar).toHaveAttribute("data-status", "ready");
    await expect(frames(page)).toHaveCount(0); // nothing loaded until asked
    await lookAtScreen(page);
    expect(MAGENTA(await screenColour(page))).toBe(false);
    await bar.getByRole("button", { name: "Play trailer" }).click();
    await expect(bar).toHaveAttribute("data-status", "playing");
    await expect.poll(async () => MAGENTA(await screenColour(page)), { timeout: 5000 }).toBe(true);
  });

  test("switching to another movie's show swaps the trailer and releases the old player", async ({ page, request }, testInfo) => {
    const errors = watchErrors(page);
    await setTrailer(request, shows[0].movieId, "goodtrailer");
    await setTrailer(request, shows[1].movieId, "https://www.youtube.com/embed/secondmovie");
    await routes(page);
    await open3D(page, testInfo, shows[0].id);
    await ensurePlaying(page);
    expect(await frames(page).getAttribute("src")).toContain("/embed/goodtrailer?");

    // Client-side navigation: the same page component, a different movie.
    await page.evaluate((id) => {
      window.history.pushState({}, "", `/seats/${id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, shows[1].id);
    if (testInfo.project.name === "mobile" && (await page.getByRole("button", { name: "3D hall" }).count())) {
      await page.getByRole("button", { name: "3D hall" }).tap();
    }
    await expect(frames(page)).toHaveCount(1);
    await expect(frames(page)).toHaveAttribute("src", /\/embed\/secondmovie\?/);
    await ensurePlaying(page);

    // Back again: still exactly one player, for the right movie.
    await page.goBack();
    await expect(frames(page)).toHaveCount(1, { timeout: 15000 });
    await expect(frames(page)).toHaveAttribute("src", /\/embed\/goodtrailer\?/);
    expect(errors).toEqual([]);
  });
});

/** Points on the screen (u, v in -1..1) that are in view and not under an overlay. */
async function clearScreenPoints(page, points) {
  const out = [];
  for (const [u, v] of points) {
    const p = await page.evaluate(([a, b]) => window.__cinema3d.projectScreen(a, b), [u, v]);
    if (!p || !p.visible) continue;
    const clear = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return !!el && !!el.closest("[data-testid=auditorium-3d]") && !el.closest(".glass");
    }, [p.x, p.y]);
    if (clear) out.push([u, v]);
  }
  return out;
}

test.describe("giant 16:9 screen and fullscreen theatre", () => {
  const CORNERS = [[-0.92, 0.88], [0.92, 0.88], [-0.92, -0.88], [0.92, -0.88], [-0.5, 0.6], [0.5, -0.6]];

  test("the screen is a giant 16:9 and a YouTube trailer fills all of it (no side bars)", async ({ page, request }, testInfo) => {
    await setTrailer(request, shows[0].movieId, "https://www.youtube.com/watch?v=fillscreen1");
    await routes(page);
    await open3D(page, testInfo, shows[0].id);
    const s = await state(page);
    expect(s.screen.width / s.screen.height).toBeCloseTo(16 / 9, 1);
    expect(s.screen.width).toBeGreaterThanOrEqual(19.8); // was 14 m in the classic hall
    await ensurePlaying(page);
    // Only one player, at the screen's own 16:9 shape.
    await expect(frames(page)).toHaveCount(1);
    // Its declared size (offsetWidth is 0 inside a CSS 3D transform).
    const surface = await page.getByTestId("screen-trailer-surface").evaluate((el) => ({ w: parseFloat(el.style.width), h: parseFloat(el.style.height) }));
    expect(surface.w / surface.h).toBeCloseTo(16 / 9, 1);

    // From a real screenshot: the trailer's colour reaches the screen's corners
    // (with the old 2.35:1 screen these were black side bars).
    await page.evaluate(() => window.__cinema3d.goTo("rear"));
    await page.waitForTimeout(900);
    const points = await clearScreenPoints(page, CORNERS);
    expect(points.length).toBeGreaterThanOrEqual(2);
    for (const [u, v] of points) {
      await expect.poll(async () => MAGENTA(await screenColour(page, u, v)), { timeout: 5000, message: `screen point ${u},${v}` }).toBe(true);
    }
    await snap(page, testInfo, "giant-screen-youtube");

    // Volume: the slider reaches the player (desktop and tablet show it).
    if (testInfo.project.name !== "mobile") {
      await controlsBar(page).getByLabel("Trailer volume").fill("40");
      await expect.poll(() => page.evaluate(() => window.__yt)).toContain("setVolume");
      await expect(controlsBar(page).getByRole("button", { name: "Mute trailer" })).toBeVisible(); // volume > 0 unmutes
    }
  });

  test("a direct video fills the whole curved screen without distortion", async ({ page, request }, testInfo) => {
    const webm = await makeMagentaWebm(page); // 320 × 180: 16:9
    await setTrailer(request, shows[0].movieId, "http://localhost:3000/e2e-trailers/magenta.webm");
    await routes(page, { webm });
    await open3D(page, testInfo, shows[0].id);
    await ensurePlaying(page);
    await page.evaluate(() => window.__cinema3d.goTo("rear"));
    await page.waitForTimeout(900);
    const points = await clearScreenPoints(page, CORNERS);
    expect(points.length).toBeGreaterThanOrEqual(2);
    for (const [u, v] of points) {
      await expect.poll(async () => MAGENTA(await screenColour(page, u, v)), { timeout: 5000, message: `screen point ${u},${v}` }).toBe(true);
    }
  });

  test("fullscreen theatre: the whole 3D hall fills the display from the best seat; the trailer keeps playing; exit restores", async ({ page, request }, testInfo) => {
    const errors = watchErrors(page);
    await setTrailer(request, shows[0].movieId, "https://www.youtube.com/watch?v=theatremod1");
    await routes(page);
    await open3D(page, testInfo, shows[0].id);
    await ensurePlaying(page);
    const toolbar = page.getByRole("toolbar", { name: "Camera views" });
    await toolbar.getByRole("button", { name: "Fullscreen theatre" }).click();
    await expect.poll(async () => (await state(page)).fullscreen).toBeTruthy();
    const vp = page.viewportSize();
    await expect.poll(async () => {
      const b = await page.getByTestId("auditorium-3d").boundingBox();
      return Math.round(b.width) >= vp.width - 1 && Math.round(b.height) >= vp.height - 1;
    }).toBe(true);
    await expect.poll(async () => (await state(page)).mode).toBe("cinema");
    // Wait for the camera to arrive at the seat.
    let last = "";
    await expect
      .poll(async () => {
        const pos = (await state(page)).position.map((v) => v.toFixed(2)).join();
        const still = pos === last;
        last = pos;
        await page.waitForTimeout(200);
        return still;
      }, { timeout: 10000 })
      .toBe(true);
    await expect(page.getByTestId("booking-panel")).toBeHidden();
    // Centred on the hall's middle line, looking at the middle of the screen, unshifted.
    const seatView = await state(page);
    console.log(`[theatre] ${testInfo.project.name} ${JSON.stringify({ position: seatView.position, target: seatView.target, focalOffset: seatView.focalOffset })}`);
    expect(Math.abs(seatView.position[0])).toBeLessThan(0.05);
    expect(Math.abs(seatView.target[0])).toBeLessThan(0.05);
    expect(Math.abs(seatView.focalOffset[0])).toBeLessThan(0.05);
    // Same player, still playing: switching views never starts a second one.
    await expect(frames(page)).toHaveCount(1);
    await expect(controlsBar(page)).toHaveAttribute("data-status", "playing");
    // The screen is in view from the best seat.
    const mid = await page.evaluate(() => window.__cinema3d.projectScreen(0, 0));
    expect(mid.visible).toBe(true);
    await expect.poll(async () => MAGENTA(await screenColour(page)), { timeout: 5000 }).toBe(true);
    await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}/fullscreen-theatre.png` });

    // Camera moves while playing; the player stays.
    await page.evaluate(() => window.__cinema3d.rotate(10));
    await expect(frames(page)).toHaveCount(1);

    await toolbar.getByRole("button", { name: "Exit fullscreen theatre" }).click();
    await expect.poll(async () => (await state(page)).fullscreen).toBe(false);
    await expect(page.getByTestId("booking-panel")).toBeVisible();
    const after = await page.getByTestId("auditorium-3d").boundingBox();
    expect(after.height).toBeLessThan(vp.height);
    await expect(controlsBar(page)).toHaveAttribute("data-status", "playing");
    expect(errors).toEqual([]);
  });

  test("a failed trailer offers Try again, which reloads a single player", async ({ page, request }, testInfo) => {
    await setTrailer(request, shows[0].movieId, "https://www.youtube.com/watch?v=brokenvideo");
    await routes(page);
    let loads = 0;
    page.on("request", (r) => r.url().includes("/embed/brokenvideo") && (loads += 1));
    await open3D(page, testInfo, shows[0].id);
    await startIfWaiting(page);
    await expect(controlsBar(page)).toHaveAttribute("data-status", "failed", { timeout: 15000 });
    const before = loads;
    await controlsBar(page).getByRole("button", { name: "Try again" }).click();
    // The player is loaded again, once; it's refused again, so the poster returns.
    await expect.poll(() => loads).toBe(before + 1);
    await expect(controlsBar(page)).toHaveAttribute("data-status", "failed", { timeout: 15000 });
    await expect(frames(page)).toHaveCount(0);
  });
});
