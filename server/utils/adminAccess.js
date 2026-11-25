// adminAccess.js
// Password-only admin access: the password check, failed-attempt lockout and
// short-lived admin sessions.
//
// - The password lives only in the server environment (ADMIN_ACCESS_PASSWORD).
//   It is never sent to the browser, stored, or logged.
// - In production it must be strong, or admin sign-in stays switched off.
// - ADMIN_DEMO_PASSWORD is a convenience for local development only and is
//   ignored in production.
// - A successful sign-in issues a signed, expiring JWT whose session id is kept
//   here, so signing out revokes it at once. It is signed with a key derived
//   from JWT_SECRET for this purpose only, so a customer token can never be
//   read as an admin token (or the other way round).

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/env");

const MIN_PRODUCTION_LENGTH = 16;
const WEAK_PASSWORDS = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890", "password", "password1", "password123",
  "admin", "admin123", "admin1234", "administrator", "qwerty", "qwerty123", "letmein", "welcome",
  "changeme", "cinebook", "cinebook123", "iloveyou", "000000", "111111", "abc123",
]);

const ISSUER = "cinebook-api";
const AUDIENCE = "cinebook-admin";
const TOKEN_TYPE = "admin_access";

const MINUTE = 60 * 1000;
const intFromEnv = (name, fallback, min, max) => {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const settings = () => ({
  sessionMinutes: intFromEnv("ADMIN_SESSION_TTL_MINUTES", 120, 5, 720),
  // Per client IP: this many wrong passwords in the window locks that IP out.
  maxFailures: intFromEnv("ADMIN_LOGIN_MAX_FAILURES", 5, 1, 100),
  windowMs: 15 * MINUTE,
  lockMs: 15 * MINUTE,
  // Across all IPs, to slow a distributed guessing attempt.
  globalMaxFailures: intFromEnv("ADMIN_LOGIN_GLOBAL_MAX_FAILURES", 50, 5, 10000),
});

const isProduction = (env = process.env) => env.NODE_ENV === "production" || env.RENDER === "true";

/** Why a password isn't strong enough for production, or null if it is. */
const passwordWeakness = (password) => {
  if (typeof password !== "string" || !password) return "is not set";
  if (WEAK_PASSWORDS.has(password.trim().toLowerCase())) return "is a common password";
  if (password.length < MIN_PRODUCTION_LENGTH) return `must be at least ${MIN_PRODUCTION_LENGTH} characters long`;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) return "must mix at least three of: lower-case, upper-case, digits, symbols";
  if (new Set(password).size < 6) return "is too repetitive";
  return null;
};

/** The passwords that open admin access right now. Values never leave this module. */
const acceptedPasswords = (env = process.env) => {
  const main = env.ADMIN_ACCESS_PASSWORD;
  if (isProduction(env)) {
    if (passwordWeakness(main)) return [];
    if (env.ADMIN_DEMO_PASSWORD && main === env.ADMIN_DEMO_PASSWORD) return [];
    return [main];
  }
  return [main, env.ADMIN_DEMO_PASSWORD].filter((p) => typeof p === "string" && p.length > 0);
};

/** Start-up notes about the admin configuration (no values). */
const describeAdminConfig = (env = process.env) => {
  const notes = [];
  if (isProduction(env)) {
    const weak = passwordWeakness(env.ADMIN_ACCESS_PASSWORD);
    if (weak) notes.push(`ADMIN_ACCESS_PASSWORD ${weak}. Admin sign-in is disabled until a strong password is set.`);
    else if (env.ADMIN_DEMO_PASSWORD && env.ADMIN_ACCESS_PASSWORD === env.ADMIN_DEMO_PASSWORD) {
      notes.push("ADMIN_ACCESS_PASSWORD must differ from the demo password. Admin sign-in is disabled.");
    }
    if (env.ADMIN_DEMO_PASSWORD) notes.push("ADMIN_DEMO_PASSWORD is ignored in production. Remove it.");
  } else if (!acceptedPasswords(env).length) {
    notes.push("No admin password is set (ADMIN_ACCESS_PASSWORD or ADMIN_DEMO_PASSWORD). Admin sign-in is disabled.");
  }
  return notes;
};

const digest = (value) => crypto.createHash("sha256").update(String(value), "utf8").digest();

/** Constant-time check against every accepted password. */
const passwordMatches = (input, env = process.env) => {
  const candidates = acceptedPasswords(env);
  const given = digest(input);
  let ok = false;
  for (const candidate of candidates) {
    if (crypto.timingSafeEqual(given, digest(candidate))) ok = true;
  }
  return ok;
};

/* ---------------- Failed attempts ---------------- */

const failures = new Map(); // ip -> { times: number[], lockedUntil }
let globalFailures = []; // timestamps
let globalLockedUntil = 0;
const MAX_TRACKED_IPS = 10000;

const recent = (times, now, windowMs) => times.filter((t) => now - t < windowMs);

/** Milliseconds until this IP may try again (0 = it may try now). */
const lockRemaining = (ip, now = Date.now()) => {
  const entry = failures.get(ip);
  const own = entry && entry.lockedUntil > now ? entry.lockedUntil - now : 0;
  const all = globalLockedUntil > now ? globalLockedUntil - now : 0;
  return Math.max(own, all);
};

const recordFailure = (ip, now = Date.now()) => {
  const { maxFailures, windowMs, lockMs, globalMaxFailures } = settings();
  if (failures.size >= MAX_TRACKED_IPS && !failures.has(ip)) {
    // Drop the oldest entries; Map keeps insertion order.
    for (const key of failures.keys()) {
      failures.delete(key);
      if (failures.size < MAX_TRACKED_IPS * 0.9) break;
    }
  }
  const entry = failures.get(ip) || { times: [], lockedUntil: 0 };
  entry.times = [...recent(entry.times, now, windowMs), now];
  if (entry.times.length >= maxFailures) {
    entry.lockedUntil = now + lockMs;
    entry.times = [];
    if (process.env.NODE_ENV !== "test") console.warn("Admin sign-in: too many incorrect passwords from one client; locked for 15 minutes.");
  }
  failures.set(ip, entry);

  globalFailures = [...recent(globalFailures, now, windowMs), now];
  if (globalFailures.length >= globalMaxFailures) {
    globalLockedUntil = now + lockMs;
    globalFailures = [];
    if (process.env.NODE_ENV !== "test") console.warn("Admin sign-in: unusual number of incorrect passwords; all admin sign-ins paused for 15 minutes.");
  }
};

const clearFailures = (ip) => failures.delete(ip);

/* ---------------- Sessions ---------------- */

const sessions = new Map(); // sid -> expiresAt (ms)
const MAX_SESSIONS = 100;

const signingKey = () => crypto.createHmac("sha256", getJwtSecret()).update("cinebook:admin-access:v1").digest();

const pruneSessions = (now = Date.now()) => {
  for (const [sid, exp] of sessions) if (exp <= now) sessions.delete(sid);
};

const issueSession = (now = Date.now()) => {
  pruneSessions(now);
  if (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
  const { sessionMinutes } = settings();
  const sid = crypto.randomBytes(24).toString("base64url");
  const expiresAt = now + sessionMinutes * MINUTE;
  sessions.set(sid, expiresAt);
  const token = jwt.sign({ typ: TOKEN_TYPE, sid, role: "admin" }, signingKey(), {
    algorithm: "HS256",
    expiresIn: sessionMinutes * 60,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
};

/**
 * The admin session behind a token, or null. Rejects anything not signed with
 * the admin key, expired, of the wrong type, or signed out.
 */
const verifySession = (token, now = Date.now()) => {
  let payload;
  try {
    payload = jwt.verify(token, signingKey(), { algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE });
  } catch (err) {
    return null;
  }
  if (!payload || payload.typ !== TOKEN_TYPE || typeof payload.sid !== "string") return null;
  const exp = sessions.get(payload.sid);
  if (!exp || exp <= now) {
    sessions.delete(payload.sid);
    return null;
  }
  return { sid: payload.sid, expiresAt: new Date(exp).toISOString() };
};

const revokeSession = (sid) => sessions.delete(sid);

/** For tests. */
const resetAdminAccessState = () => {
  failures.clear();
  globalFailures = [];
  globalLockedUntil = 0;
  sessions.clear();
};

module.exports = {
  isProduction,
  passwordWeakness,
  passwordMatches,
  acceptedPasswords,
  describeAdminConfig,
  lockRemaining,
  recordFailure,
  clearFailures,
  issueSession,
  verifySession,
  revokeSession,
  resetAdminAccessState,
  MIN_PRODUCTION_LENGTH,
};
