// End-to-end flows through the real API: booking, keyboard use and reduced motion.
const { test, expect } = require("@playwright/test");
const { API, signIn, firstShowId, watchErrors, horizontalOverflow, settle, snap } = require("./helpers");

// Each viewport books a different seat so the runs don't collide.
const SEAT_FOR = { desktop: "E1", tablet: "E2", mobile: "E3" };

test("book a seat with extras, then open the ticket", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await signIn(page, "user");
  const seat = SEAT_FOR[testInfo.project.name];
  await page.goto(`/seats/${await firstShowId(page)}`);

  const seatButton = page.getByRole("button", { name: new RegExp(`^Seat ${seat},`) });
  await seatButton.scrollIntoViewIfNeeded();
  await seatButton.click();
  await expect(seatButton).toHaveAttribute("aria-pressed", "true");

  // Continue places a server-side hold, then opens checkout.
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/addons\//);
  await expect(page.getByTestId("hold-timer")).toHaveText(/^[78]:\d\d$/);

  await page.getByRole("button", { name: "Add Salted Popcorn" }).click();
  await page.getByRole("button", { name: /Car parking/ }).click();
  const confirm = page.getByRole("button", { name: /Confirm demo booking/ });
  await expect(confirm).toContainText("₹520"); // 220 seat + 220 popcorn + 80 parking
  await settle(page);
  expect(await horizontalOverflow(page)).toEqual([]);
  await snap(page, testInfo, "checkout");

  await confirm.click();
  await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  await expect(page.getByText("Total (demo, not charged)")).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "booking-confirmed");

  await page.getByRole("link", { name: /View my tickets/ }).click();
  await expect(page).toHaveURL(/my-bookings/);
  expect(errors).toEqual([]);
});

test("someone else's hold shows as reserved and can't be booked", async ({ page, request }, testInfo) => {
  const seat = { desktop: "J1", tablet: "J2", mobile: "J3" }[testInfo.project.name];
  // Another customer (the admin account, for convenience) holds the seat via the API.
  const other = await (await request.post(`${API}/api/auth/login`, { data: { email: "admin@e2e.test", password: "AdminPass123" } })).json();
  const showId = await firstShowId(page);
  const hold = await request.post(`${API}/api/shows/${showId}/holds`, {
    headers: { Authorization: `Bearer ${other.token}` },
    data: { seats: [seat] },
  });
  expect(hold.ok()).toBeTruthy();

  await signIn(page, "user");
  await page.goto(`/seats/${showId}`);
  const btn = page.getByRole("button", { name: `Seat ${seat}, reserved by another customer` });
  await expect(btn).toBeDisabled();
});

test("keyboard: skip link and seat selection", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard flow checked once on desktop");
  await signIn(page, "user");
  await page.goto(`/seats/${await firstShowId(page)}`);
  await page.getByRole("region", { name: "Seat map" }).waitFor();

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();

  const seat = page.getByRole("button", { name: /^Seat K5,/ });
  await seat.focus();
  await page.keyboard.press("Enter");
  await expect(seat).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(seat).toHaveAttribute("aria-pressed", "false");
});

test("works with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const duration = await page.evaluate(() => getComputedStyle(document.querySelector(".btn-primary") || document.body).transitionDuration);
  expect(parseFloat(duration)).toBeLessThan(0.05);
  expect(errors).toEqual([]);
});
