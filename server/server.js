require("dotenv").config();

const { validateEnv } = require("./config/env");
const { describeAdminConfig } = require("./utils/adminAccess");
const connectDB = require("./config/db");
const { createApp } = require("./app");

// ── Refuse to start with a missing or insecure configuration ─────────────
const problems = validateEnv();
if (problems.length) {
  problems.forEach((p) => console.error(`Configuration error: ${p}`));
  process.exit(1);
}

// Admin access problems switch admin sign-in off; they don't stop the site.
describeAdminConfig().forEach((note) => console.warn(`Admin access: ${note}`));

connectDB();

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
