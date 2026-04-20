// //  userRoutes.js

// const router = require("express").Router();
// const User = require("../models/User");

// router.post("/login", async (req, res) => {

//   const { email } = req.body;

//   const user = await User.findOne({ email });

//   if (!user)
//     return res.status(404).json({ message: "User not found" });

//   res.json(user);

// });

// module.exports = router;


const router = require("express").Router();
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");

// ✅ Get logged-in user
router.get("/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

module.exports = router;