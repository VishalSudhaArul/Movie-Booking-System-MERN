// authMiddleware.js
// Accepts only "Authorization: Bearer <jwt>" with a valid signature.
// There is no bypass header and no decode-without-verify fallback.
//
// Two kinds of token exist:
// - customer (and staff account) tokens, signed with JWT_SECRET; the role is
//   always read from the database;
// - admin access tokens from the password-only Admin sign-in, signed with a
//   separate derived key and tied to a revocable server-side session.
// `authMiddleware` accepts only the first kind. `authOrAdminSession` also
// accepts an admin session, for staff routes; it never turns a customer token
// into an admin one.

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { getJwtSecret } = require("../config/env");
const { verifySession } = require("../utils/adminAccess");

const unauthorized = (res, message = "Please sign in to continue") =>
  res.status(401).json({ message });

const bearer = (req) => {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};

// The signed-in identity for an admin access session (no customer account).
const adminSessionUser = (session) => ({
  id: null,
  _id: null,
  name: "Admin",
  email: null,
  role: "admin",
  adminSession: true,
  sid: session.sid,
  sessionExpiresAt: session.expiresAt,
});

const authMiddleware = async (req, res, next) => {
  const token = bearer(req);
  if (!token) return unauthorized(res);

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch (err) {
    return unauthorized(res, "Your session has expired. Please sign in again.");
  }

  const userId = payload && (payload.id || payload._id);
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return unauthorized(res, "Your session has expired. Please sign in again.");
  }

  try {
    // The role always comes from the database, so a role change or a deleted
    // account takes effect immediately, and old tokens without a role still work.
    const user = await User.findById(userId).select("name email role").lean();
    if (!user) return unauthorized(res, "Your account no longer exists. Please sign in again.");

    req.user = {
      id: String(user._id),
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role || "user",
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

// For public pages that show extra detail to a signed-in user (e.g. their own
// seat holds). A missing or invalid token just means "anonymous" — never a 401.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(header.slice(7).trim(), getJwtSecret(), { algorithms: ["HS256"] });
    const userId = payload && (payload.id || payload._id);
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) return next();
    const user = await User.findById(userId).select("name email role").lean();
    if (user) {
      req.user = { id: String(user._id), _id: String(user._id), name: user.name, email: user.email, role: user.role || "user" };
    }
  } catch (err) {
    // Invalid or expired token: carry on as anonymous.
  }
  return next();
};

// Staff routes: an admin access session, or an account token (role from the database).
const authOrAdminSession = (req, res, next) => {
  const token = bearer(req);
  if (!token) return unauthorized(res);
  const session = verifySession(token);
  if (session) {
    req.user = adminSessionUser(session);
    return next();
  }
  return authMiddleware(req, res, next);
};

// Only an admin access session (sign-out, session check).
const requireAdminSession = (req, res, next) => {
  const session = verifySession(bearer(req));
  if (!session) return unauthorized(res, "Your admin session has expired. Please sign in again.");
  req.user = adminSessionUser(session);
  return next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.authOrAdminSession = authOrAdminSession;
module.exports.requireAdminSession = requireAdminSession;
