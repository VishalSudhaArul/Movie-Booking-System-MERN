// Shared helpers for the browser tests.
const { expect } = require("@playwright/test");

const API = "http://localhost:5000";

const ACCOUNTS = {
  user: { email: "user@e2e.test", password: "UserPass123" },
  user2: { email: "user2@e2e.test", password: "UserPass123" },
  admin: { email: "admin@e2e.test", password: "AdminPass123" },
};

// Matches e2e/stack.js. Test-only; the real one lives in the server environment.
const ADMIN_PASSWORD = "E2e-Admin-Access-7Qx!";

// Opens an admin session through the real API (password only) and stores it
// the way the Admin Access page does, in this tab's sessionStorage.
async function adminSignIn(page) {
  const res = await page.request.post(`${API}/api/auth/admin/login`, { data: { password: ADMIN_PASSWORD } });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  await page.addInitScript((d) => {
    sessionStorage.setItem("cinebook:adminToken", d.token);
    sessionStorage.setItem("cinebook:adminExpiresAt", d.expiresAt);
  }, data);
  return data;
}

// Picks the seat map view before the page loads ("2d" or "3d").
async function useSeatView(page, view) {
  await page.addInitScript((v) => localStorage.setItem("cinebook:seatView", v), view);
}

// Signs in through the real API and stores the session the way the app does.
async function signIn(page, who) {
  const res = await page.request.post(`${API}/api/auth/login`, { data: ACCOUNTS[who] });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  await page.addInitScript((d) => {
    localStorage.setItem("token", d.token);
    localStorage.setItem("userId", d._id);
    localStorage.setItem("role", d.role);
    localStorage.setItem("userName", d.name);
  }, data);
  return data;
}

async function firstShowId(page) {
  const shows = await (await page.request.get(`${API}/api/shows?lite=1`)).json();
  return shows[0]._id;
}

// Collects console errors and failed requests, ignoring ones a test expects.
function watchErrors(page, ignore = []) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ignore.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

// Elements sticking out past the right edge of the viewport, ignoring content
// inside its own scroll container (e.g. a seat map that scrolls sideways on purpose).
async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollsX = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
      }
      return false;
    };
    const offenders = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.visibility === "hidden") return;
      if (r.right > vw + 1 && !scrollsX(el)) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(r.right - vw)}px`);
      }
    });
    return offenders.slice(0, 5);
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle");
  // Scroll through the page so lazy-loaded images below the fold load, like
  // they would for a visitor, then return to the top.
  await page.evaluate(async () => {
    // Half-screen steps, so sections that fade in as they scroll into view
    // are seen at least once (as they would be by a person scrolling).
    const step = Math.round(window.innerHeight / 2);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  // Let entry animations finish so screenshots are stable.
  await page.waitForTimeout(400);
}

async function snap(page, testInfo, name) {
  await page.screenshot({
    path: `e2e/screenshots/${testInfo.project.name}/${name}.png`,
    fullPage: true,
  });
}

module.exports = { API, ACCOUNTS, ADMIN_PASSWORD, adminSignIn, useSeatView, signIn, firstShowId, watchErrors, horizontalOverflow, settle, snap };
