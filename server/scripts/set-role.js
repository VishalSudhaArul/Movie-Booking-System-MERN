// set-role.js
// Gives an existing account a role. The admin password bypass was removed, so
// this is how the first admin is created.
//
//   cd server
//   node scripts/set-role.js someone@example.com admin
//
// Roles: user | admin | theaterOwner. Uses MONGO_URI from server/.env, so check
// which database that points to before running it.

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const ROLES = ["user", "admin", "theaterOwner"];

(async () => {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role)) {
    console.error("Usage: node scripts/set-role.js <email> <user|admin|theaterOwner>");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
      { email: email.trim() },
      { $set: { role } },
      { new: true, collation: { locale: "en", strength: 2 } }
    );
    if (!user) {
      console.error("No account with that email. Register it on the site first.");
      process.exitCode = 1;
    } else {
      console.log(`Done: ${user.email} is now "${user.role}". They should sign out and back in.`);
    }
  } catch (err) {
    console.error(`Failed (${err.name}).`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
