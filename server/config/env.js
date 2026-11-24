// env.js
// Checks required environment variables once at start-up so the server never
// runs with a missing or insecure configuration. Values are never logged.

const MIN_JWT_SECRET_LENGTH = 32;

// Placeholder values from .env.example and old fallbacks that must never be used.
const INSECURE_SECRETS = new Set([
  "secret",
  "changeme",
  "your_super_secret_jwt_key_change_this",
]);

const validateEnv = (env = process.env) => {
  const problems = [];

  const secret = env.JWT_SECRET;
  if (!secret) {
    problems.push("JWT_SECRET is not set.");
  } else if (INSECURE_SECRETS.has(secret.trim().toLowerCase())) {
    problems.push("JWT_SECRET is a placeholder value. Set a long random secret.");
  } else if (secret.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`);
  }

  if (!env.MONGO_URI) {
    problems.push("MONGO_URI is not set.");
  }

  return problems;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  // Defensive: validateEnv() runs at start-up, but never sign or verify with nothing.
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error("JWT_SECRET is missing or too short");
  }
  return secret;
};

// Extra allowed browser origins, comma-separated, e.g. a Vercel preview URL.
const getExtraCorsOrigins = (env = process.env) =>
  String(env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

module.exports = { validateEnv, getJwtSecret, getExtraCorsOrigins, MIN_JWT_SECRET_LENGTH };
