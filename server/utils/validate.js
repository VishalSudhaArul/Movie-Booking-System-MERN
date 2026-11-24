// validate.js
// Small, dependency-free input checks shared by the controllers.

const mongoose = require("mongoose");

const isObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value) && /^[a-f0-9]{24}$/i.test(value);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (value) => typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());

// Returns a trimmed string, or null if the value is not a string within limits.
const cleanString = (value, { min = 1, max = 200 } = {}) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
};

// Returns a finite number within limits, or null.
const cleanNumber = (value, { min = 0, max = 1e7, integer = false } = {}) => {
  if (value === "" || value === null || value === undefined || typeof value === "boolean") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  if (integer && !Number.isInteger(n)) return null;
  return n;
};

// Escapes user text before it is placed inside a regular expression.
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Case-insensitive exact match on a text field, safe for user input.
const exactInsensitive = (text) => ({ $regex: `^${escapeRegex(String(text).trim())}$`, $options: "i" });

// Keeps only the listed keys from an object.
const pick = (source, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (source && Object.prototype.hasOwnProperty.call(source, k) && source[k] !== undefined) out[k] = source[k];
  });
  return out;
};

module.exports = { isObjectId, isEmail, cleanString, cleanNumber, escapeRegex, exactInsensitive, pick };
