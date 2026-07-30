const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const { authMiddleware } = require("../middleware/authMiddleware");

// GET reviews for a movie
router.get("/movie/:movieId", async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId }).sort({ createdAt: -1 });
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0 
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings).toFixed(1)
      : 0;

    res.json({ reviews, avgRating: Number(avgRating), totalRatings });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
});

// POST add a review
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { movieId, rating, comment } = req.body;

    if (!movieId || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const review = new Review({
      movieId,
      userId: req.user.id || req.user._id,
      userName: req.user.name || "Movie Enthusiast",
      rating: Number(rating),
      comment: comment.trim(),
    });

    await review.save();
    res.status(201).json({ message: "Review added successfully!", review });
  } catch (error) {
    res.status(500).json({ message: "Failed to post review", error: error.message });
  }
});

module.exports = router;
