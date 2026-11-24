// adminMiddleware.js
// Must run after authMiddleware. The role on req.user is read from the database.

const STAFF_ROLES = ["admin", "theaterOwner"];

const isStaff = (user) => !!user && STAFF_ROLES.includes(user.role);

exports.isStaff = isStaff;

exports.adminAccess = (req, res, next) => {
  if (isStaff(req.user)) return next();
  return res.status(403).json({ message: "Admin or theatre owner access only" });
};

// Allows the owner of a resource, or staff. `getOwnerId` reads the owner from the request.
exports.selfOrAdmin = (getOwnerId) => (req, res, next) => {
  const ownerId = String(getOwnerId(req) || "");
  if (isStaff(req.user) || (req.user && ownerId === req.user.id)) return next();
  return res.status(403).json({ message: "You can only access your own account" });
};
