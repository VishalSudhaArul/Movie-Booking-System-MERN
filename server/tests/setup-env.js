// Runs before every test file. Tests never read server/.env or touch a real database.
const fs = require("fs");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
process.env.MONGO_URI = "mongodb://in-memory-test";
process.env.DISABLE_RATE_LIMIT = "true";
delete process.env.CORS_ORIGINS;

// Reuse a locally installed mongod instead of downloading one, when available.
const LOCAL_MONGOD = "C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe";
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(LOCAL_MONGOD)) {
  process.env.MONGOMS_SYSTEM_BINARY = LOCAL_MONGOD;
}
