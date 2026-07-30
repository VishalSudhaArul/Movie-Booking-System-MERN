const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/User");
require("../models/Movie");
const { authMiddleware } = require("../middleware/authMiddleware");

// Get logged-in user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user token" });
    }
    const user = await User.findById(userId).select("-password").populate("watchlist");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
});

// Get user watchlist
router.get("/watchlist", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.json([]);
    }
    const user = await User.findById(userId).populate("watchlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Filter out null values if any movie was deleted
    const validWatchlist = (user.watchlist || []).filter((item) => item !== null);
    res.json(validWatchlist);
  } catch (error) {
    console.error("Watchlist error:", error);
    res.status(500).json({ message: "Failed to fetch watchlist", error: error.message });
  }
});

// Toggle movie in watchlist
router.post("/watchlist/toggle", authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ message: "Movie ID is required" });

    const userId = req.user.id || req.user._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user session" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.watchlist) user.watchlist = [];

    const existingIndex = user.watchlist.findIndex(
      (id) => id && id.toString() === movieId.toString()
    );
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
    const validWatchlist = (updatedUser.watchlist || []).filter((item) => item !== null);

    res.json({
      message: isBookmarked ? "Added to Watchlist ❤️" : "Removed from Watchlist",
      isBookmarked,
      watchlist: validWatchlist,
    });
  } catch (error) {
    console.error("Toggle watchlist error:", error);
    res.status(500).json({ message: "Failed to toggle watchlist", error: error.message });
  }
});

module.exports = router;