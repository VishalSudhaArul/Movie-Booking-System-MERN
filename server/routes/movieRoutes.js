//  movieRoutes.js

const router = require("express").Router();
const movieController = require("../controllers/movieController");


router.post("/", movieController.addMovie);
router.get("/", movieController.getMovies);
router.get("/:id", movieController.getMovie);
router.put("/:id", movieController.updateMovie);
router.delete("/:id", movieController.deleteMovie);

module.exports = router;
