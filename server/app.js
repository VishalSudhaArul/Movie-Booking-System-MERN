// app.js
// Builds the Express app. server.js connects to MongoDB and starts listening;
// tests import this file directly.

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { getExtraCorsOrigins } = require("./config/env");
const { apiLimiter, sanitizeRequest } = require("./middleware/security");

// Browser origins allowed to call the API. Add more (e.g. a Vercel preview URL)
// through the optional CORS_ORIGINS variable, comma-separated.
const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "https://movie-booking-system-mern-fawn.vercel.app",
];

const createApp = () => {
  const app = express();
  const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...getExtraCorsOrigins()]);

  // Render sits behind one proxy; this lets rate limiting see the real client IP.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Security headers. This is a JSON API, so the default policy is fine;
  // cross-origin resource policy is relaxed so the SPA can read responses.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (curl, server-to-server, health checks).
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        const err = new Error("Origin not allowed by CORS");
        err.status = 403;
        return callback(err);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
      maxAge: 600,
    })
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(sanitizeRequest);

  app.get("/", (req, res) => {
    res.json({ status: "ok", message: "CineBook API is running" });
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/movies", require("./routes/movieRoutes"));
  app.use("/api/shows", require("./routes/showRoutes"));
  app.use("/api/bookings", require("./routes/bookingRoutes"));
  app.use("/api/snacks", require("./routes/snackRoutes"));
  app.use("/api/parking", require("./routes/parkingRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/analytics", require("./routes/analyticsRoutes"));
  app.use("/api/reviews", require("./routes/reviewRoutes"));
  app.use("/api/coupons", require("./routes/couponRoutes"));
  app.use("/api/snack-orders", require("./routes/snackOrderRoutes"));

  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // Central error handler. Internal details are logged, never sent to the client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ message: "The request body is not valid JSON" });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ message: "The request is too large" });
    }
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid ID" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: "Some details are missing or invalid" });
    }
    const status = err.status && err.status < 500 ? err.status : 500;
    if (status === 500 && process.env.NODE_ENV !== "test") console.error("Server Error:", err);
    return res.status(status).json({
      message: status === 500 ? "Something went wrong. Please try again." : err.message,
    });
  });

  return app;
};

module.exports = { createApp, DEFAULT_ORIGINS };
