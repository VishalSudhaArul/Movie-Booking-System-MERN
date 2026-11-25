//  movieRoutes.js

// const router = require("express").Router();
// const movieController = require("../controllers/movieController");


// router.post("/", movieController.addMovie);
// router.get("/", movieController.getMovies);
// router.get("/:id", movieController.getMovie);
// router.put("/:id", movieController.updateMovie);
// router.delete("/:id", movieController.deleteMovie);

// module.exports = router;







const router = require("express").Router();

const movieController = require("../controllers/movieController");

const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");


// PUBLIC ROUTES

router.get("/", movieController.getMovies);
router.get("/:id", movieController.getMovie);


// ADMIN / THEATER OWNER ROUTES

router.post("/", authOrAdminSession, adminAccess, movieController.addMovie);

router.put("/:id", authOrAdminSession, adminAccess, movieController.updateMovie);

router.delete("/:id", authOrAdminSession, adminAccess, movieController.deleteMovie);


module.exports = router;