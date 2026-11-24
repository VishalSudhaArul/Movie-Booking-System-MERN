const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Movie = require("../models/Movie");
const { authMiddleware } = require("../middleware/authMiddleware");
const { isObjectId, cleanString, cleanNumber } = require("../utils/validate");

// GET average rating and review count for every reviewed movie
router.get("/summary", async (req, res) => {
  try {
    const rows = await Review.aggregate([
      { $group: { _id: "$movieId", avgRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } },
    ]);
    const summary = {};
    rows.forEach((r) => {
      summary[r._id] = {
        avgRating: Number(r.avgRating.toFixed(1)),
        totalRatings: r.totalRatings,
      };
    });
    return res.json(summary);
  } catch (error) {
    console.error("Review summary error:", error.name);
    return res.json({});
  }
});

// GET reviews for a movie
router.get("/movie/:movieId", async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!isObjectId(movieId)) {
      return res.json({ reviews: [], avgRating: 0, totalRatings: 0 });
    }

    const reviews = await Review.find({ movieId }).select("-userId").sort({ createdAt: -1 });
    const totalRatings = reviews.length;
    const avgRating =
      totalRatings > 0
        ? (reviews.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalRatings).toFixed(1)
        : 0;

    return res.json({ reviews, avgRating: Number(avgRating), totalRatings });
  } catch (error) {
    console.error("Fetch reviews error:", error.name);
    return res.json({ reviews: [], avgRating: 0, totalRatings: 0 });
  }
});

// POST add a review (signed in)
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { movieId } = req.body;
    const rating = cleanNumber(req.body.rating, { min: 1, max: 5, integer: true });
    const comment = cleanString(req.body.comment, { min: 1, max: 1000 });

    if (!isObjectId(movieId) || rating === null || !comment) {
      return res.status(400).json({ message: "Choose a rating from 1 to 5 and write a short comment" });
    }
    if (!(await Movie.exists({ _id: movieId }))) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const review = await Review.create({
      movieId,
      userId: req.user.id,
      userName: req.user.name || "Movie Enthusiast",
      rating,
      comment,
    });

    return res.status(201).json({ message: "Review posted successfully!", review });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
