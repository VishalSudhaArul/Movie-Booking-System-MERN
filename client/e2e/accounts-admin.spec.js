// Registration, sign-in and sign-out through the real forms, and the main admin
// workflows (catalogue, showtimes, snacks, parking, ticket scanning), all
// against the real API and the throwaway test database.
const { test, expect } = require("@playwright/test");
const { API, adminSignIn, watchErrors } = require("./helpers");

const dayFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

test("register, sign out and sign back in through the forms", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  const email = `new.${testInfo.project.name}.${Date.now()}@e2e.test`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Kiran Rao");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible(); // validated before sending

  await page.getByLabel("Password", { exact: true }).fill("GoodPass123");
  await page.getByLabel("Confirm password").fill("GoodPass123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  expect(await page.evaluate(() => localStorage.getItem("role"))).toBe("user");

  // Sign out (desktop: account menu; smaller screens: the menu drawer).
  if (testInfo.project.name === "desktop") {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
  } else {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).filter({ visible: true }).first().click();
  }
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();

  // Wrong password, then the right one; the email is matched case-insensitively.
  await page.getByLabel("Email address").fill(email.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill("WrongPass123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("alert")).toContainText("don't match");
  await page.getByLabel("Password", { exact: true }).fill("GoodPass123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  expect(errors.filter((e) => !/status of 400/.test(e))).toEqual([]);
});

test.describe("admin workflows", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "admin workflows run once, on desktop");
  });

  test("add a movie, schedule it, add a snack and parking for a new theatre", async ({ page, request }) => {
    await adminSignIn(page);
    const stamp = Date.now().toString().slice(-6);
    const title = `Test Premiere ${stamp}`;
    const theatre = `Aurora Screen ${stamp}`;

    // Movie: validation first, then a real save.
    await page.goto("/admin/movies");
    await page.getByRole("button", { name: "Add movie" }).click();
    await expect(page.getByText("Enter a title.")).toBeVisible();
    await page.locator("#m-title").fill(title);
    await page.locator("#m-genre").fill("Drama, Mystery");
    await page.locator("#m-duration").fill("121");
    await page.locator("#m-poster").fill("/posters/cyber_genesis.png");
    await page.locator("#m-language").fill("English");
    await page.locator("#m-desc").fill("A mystery set in an old cinema.");
    await page.getByRole("button", { name: "Add movie" }).click();
    await expect(page.getByText(`Added "${title}".`)).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Showtime for the new movie at a new theatre.
    await page.goto("/admin/shows");
    await page.locator("#s-movie").selectOption({ label: title });
    await page.locator("#s-theatre").fill(theatre);
    await page.locator("#s-date").fill(dayFromNow(5));
    await page.locator("#s-time").fill("19:45");
    await page.locator("#s-balconyPrice").fill("400");
    await page.locator("#s-firstClassPrice").fill("280");
    await page.locator("#s-secondClassPrice").fill("190");
    await page.getByRole("button", { name: "Publish showtime" }).click();
    await expect(page.getByText("Showtime published.")).toBeVisible();
    await expect(page.getByText(`0 of 800 seats booked`).first()).toBeVisible();

    // The public site sees it, with server-generated seats at the new prices.
    const movies = await (await request.get(`${API}/api/movies`)).json();
    const movie = movies.find((m) => m.title === title);
    const shows = await (await request.get(`${API}/api/shows/movie/${movie._id}`)).json();
    expect(shows).toHaveLength(1);
    expect(shows[0].theatre).toBe(theatre);
    // The default Grand hall: row A at the front (Second Class), premium recliners at the back (row Z).
    expect(shows[0].seats).toHaveLength(800);
    expect(shows[0].seats.find((s) => s.seatNumber === "A1").price).toBe(190);
    expect(shows[0].seats.find((s) => s.seatNumber === "Z1").price).toBe(400);

    // Snack for the new theatre (it has shows but no menu yet).
    await page.goto("/admin/snacks");
    await page.locator("#sn-name").fill("Caramel Popcorn");
    await page.locator("#sn-price").fill("240");
    await page.locator("#sn-theatre").fill(theatre);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText(`Added Caramel Popcorn to ${theatre}.`)).toBeVisible();
    await expect(page.getByRole("region", { name: `${theatre} menu` })).toContainText("Caramel Popcorn");

    // Parking: creating a show set default prices automatically; edit them.
    await page.goto("/admin/parking");
    const card = page.locator("li").filter({ hasText: theatre });
    await card.getByRole("button", { name: `Edit parking for ${theatre}` }).click();
    await page.locator("#p-car").fill("90");
    await page.getByRole("button", { name: "Save prices" }).click();
    await expect(page.getByText(`Updated parking prices for ${theatre}.`)).toBeVisible();
    const parking = await (await request.get(`${API}/api/parking/theatre/${encodeURIComponent(theatre)}`)).json();
    expect(parking.priceCar).toBe(90);
  });

  test("scan a ticket: check, admit once, refuse the second time", async ({ page, request }) => {
    // A customer books a seat through the API.
    const user = await (await request.post(`${API}/api/auth/login`, { data: { email: "user@e2e.test", password: "UserPass123" } })).json();
    const shows = await (await request.get(`${API}/api/shows`)).json();
    const show = shows[0];
    const free = show.seats.find((s) => /^I\d+$/.test(s.seatNumber) && !s.isBooked && !s.isHeld);
    const booking = await (
      await request.post(`${API}/api/bookings`, { headers: { Authorization: `Bearer ${user.token}` }, data: { showId: show._id, seats: [free.seatNumber] } })
    ).json();
    expect(booking._id).toBeTruthy();

    await adminSignIn(page);
    await page.goto("/admin/scan");
    // Pasting the full QR link works as well as the bare ID.
    await page.getByLabel("Booking ID or ticket link").fill(`http://localhost:3000/verify/${booking._id}`);
    await page.getByRole("button", { name: "Check ticket" }).click();
    await expect(page.getByText("Valid ticket")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Valid ticket" })).toContainText(free.seatNumber);
    await page.getByRole("button", { name: "Admit guest" }).click();
    await expect(page.getByText("Admitted. Enjoy the show!")).toBeVisible();

    await page.getByRole("button", { name: "Check ticket" }).click();
    await expect(page.getByText("Already used: do not admit")).toBeVisible();
    await expect(page.getByRole("button", { name: "Admit guest" })).toHaveCount(0);

    await page.getByLabel("Booking ID or ticket link").fill("000000000000000000000000");
    await page.getByRole("button", { name: "Check ticket" }).click();
    await expect(page.getByText("Ticket not found")).toBeVisible();
  });
});
