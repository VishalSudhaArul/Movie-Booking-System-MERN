// require("dotenv").config();

// const express = require("express");
// const cors = require("cors");
// const connectDB = require("./config/db");

// const app = express();


// // ✅ Connect Database
// connectDB();


// app.use(express.json());

// const allowedOrigins = [
//   "http://localhost:3000",
//   "https://movie-booking-system-mern-fawn.vercel.app",
//   "https://movie-booking-system-mern-git-main-vishals-projects-addcb1c7.vercel.app"
// ];

// // app.use(
// //   cors({
// //     origin: function (origin, callback) {
// //       if (!origin || allowedOrigins.includes(origin)) {
// //         callback(null, true);
// //       } else {
// //         callback(new Error("Not allowed by CORS"));
// //       }
// //     },
// //     credentials: true
// //   })
// // );

// //const cors = require("cors");

// // app.use(
// //   cors({
// //     origin: [
// //       "http://localhost:3000",
// //       "https://movie-booking-system-mern-fawn.vercel.app",
// //       "https://movie-booking-system-mern-git-main-vishals-projects-addcb1c7.vercel.app"
// //     ],
// //     methods: ["GET", "POST", "PUT", "DELETE"],
// //     credentials: true
// //   })
// // );

// app.use(
//   cors({
//     origin: [
//       "http://localhost:3000",
//       "https://movie-booking-system-mern-fawn.vercel.app"
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true
//   })
// );






// // ✅ Routes
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/movies", require("./routes/movieRoutes"));
// app.use("/api/shows", require("./routes/showRoutes"));
// app.use("/api/bookings", require("./routes/bookingRoutes"));
// app.use("/api/snacks", require("./routes/snackRoutes"));
// app.use("/api/parking", require("./routes/parkingRoutes"));
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/analytics", require("./routes/analyticsRoutes"));



// // ✅ Test Route
// app.get("/", (req, res) => {
//     res.send("API Running");
// });


// // ✅ Server Port
// const PORT = process.env.PORT || 5000;

// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on ${PORT}`);
// });










require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));
app.use("/api/shows", require("./routes/showRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/snacks", require("./routes/snackRoutes"));
app.use("/api/parking", require("./routes/parkingRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
