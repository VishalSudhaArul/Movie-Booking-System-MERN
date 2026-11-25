// authController.js

const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/env");
const { isEmail, cleanString } = require("../utils/validate");
const {
  acceptedPasswords,
  passwordMatches,
  lockRemaining,
  recordFailure,
  clearFailures,
  issueSession,
  revokeSession,
} = require("../utils/adminAccess");

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt only uses the first 72 bytes
const CASE_INSENSITIVE = { locale: "en", strength: 2 };

const generateToken = (user) =>
  jwt.sign({ id: String(user._id), role: user.role || "user" }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "7d",
  });

const sessionResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "user",
  token: generateToken(user),
});

// Older accounts may have been saved with mixed-case emails, so look up case-insensitively.
const findByEmail = (email) => User.findOne({ email }).collation(CASE_INSENSITIVE);

// ✅ REGISTER
exports.register = async (req, res, next) => {
  try {
    const name = cleanString(req.body.name, { min: 1, max: 80 });
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;

    if (!name) return res.status(400).json({ message: "Please enter your name" });
    if (!isEmail(email)) return res.status(400).json({ message: "Please enter a valid email address" });
    if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      return res
        .status(400)
        .json({ message: `Password must be between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters` });
    }

    if (await findByEmail(email)) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    // Role is never taken from the request: new accounts are always regular users.
    const user = await User.create({ name, email, password: hash, role: "user" });

    return res.status(201).json(sessionResponse(user));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    return next(err);
  }
};

// Returns the user when the email and password match, otherwise null.
const checkCredentials = async (body) => {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = body.password;
  if (!isEmail(email) || typeof password !== "string" || !password || password.length > 200) return null;

  const user = await findByEmail(email);
  if (!user || typeof user.password !== "string") return null;
  return (await bcrypt.compare(password, user.password)) ? user : null;
};

// Same answer for an unknown email and a wrong password, so accounts can't be probed.
const invalidCredentials = (res) => res.status(400).json({ message: "Invalid email or password" });

// ✅ LOGIN
exports.login = async (req, res, next) => {
  try {
    const user = await checkCredentials(req.body);
    if (!user) return invalidCredentials(res);
    return res.json(sessionResponse(user));
  } catch (err) {
    return next(err);
  }
};

const tooManyAttempts = (res, ms) => {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  res.set("Retry-After", String(Math.ceil(ms / 1000)));
  return res.status(429).json({
    message: `Too many incorrect attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  });
};

// ✅ ADMIN ACCESS — the Admin entry in the navbar. Password only, no account.
// The password is checked here and nowhere else, against the server
// environment. While a client is locked out, even the right password is
// refused, so the lockout can't be used to test guesses. Nothing about the
// attempt (and never the password) is logged or echoed back.
exports.adminLogin = (req, res) => {
  const ip = req.ip || "unknown";
  const locked = lockRemaining(ip);
  if (locked) return tooManyAttempts(res, locked);

  const password = req.body && req.body.password;
  if (typeof password !== "string" || !password.length) {
    return res.status(400).json({ message: "Enter the admin password." });
  }
  if (!acceptedPasswords().length) {
    return res.status(503).json({ message: "Admin access isn't set up on this server yet." });
  }

  if (password.length > 256 || !passwordMatches(password)) {
    recordFailure(ip);
    const now = lockRemaining(ip);
    if (now) return tooManyAttempts(res, now);
    return res.status(401).json({ message: "Incorrect admin password" });
  }

  clearFailures(ip);
  const session = issueSession();
  res.set("Cache-Control", "no-store");
  return res.json({ role: "admin", token: session.token, expiresAt: session.expiresAt });
};

// Is this admin session still valid? (Used by the admin pages on load.)
exports.adminSession = (req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({ role: "admin", expiresAt: req.user.sessionExpiresAt });
};

// Signs out: the session is revoked on the server at once.
exports.adminLogout = (req, res) => {
  revokeSession(req.user.sid);
  return res.status(204).end();
};

// Google sign-in is disabled until real Google ID-token verification is set up.
// The old version trusted whatever email the browser sent, so anyone could sign in
// as anyone.
exports.googleAuth = (req, res) =>
  res.status(501).json({ message: "Google sign-in is not available yet. Please use email and password." });
