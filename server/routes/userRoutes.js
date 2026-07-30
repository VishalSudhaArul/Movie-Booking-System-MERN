const router = require("express").Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// Get logged-in user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select("-password").populate("watchlist");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

// Get user watchlist
router.get("/watchlist", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).populate("watchlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.watchlist || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch watchlist" });
  }
});

// Toggle movie in watchlist
router.post("/watchlist/toggle", authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ message: "Movie ID is required" });

    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existingIndex = user.watchlist.findIndex(id => id.toString() === movieId.toString());
    let isBookmarked = false;

    if (existingIndex > -1) {
      user.watchlist.splice(existingIndex, 1);
      isBookmarked = false;
    } else {
      user.watchlist.push(movieId);
      isBookmarked = true;
    }

    await user.save();
    const updatedUser = await User.findById(user._id).populate("watchlist");
    res.json({
      message: isBookmarked ? "Added to Watchlist ❤️" : "Removed from Watchlist",
      isBookmarked,
      watchlist: updatedUser.watchlist
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle watchlist", error: error.message });
  }
});

module.exports = router;