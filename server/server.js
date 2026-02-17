require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();


// ✅ Connect Database
connectDB();


// ✅ Middleware
app.use(cors());
app.use(express.json());


// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));
app.use("/api/shows", require("./routes/showRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/snacks", require("./routes/snackRoutes"));
app.use("/api/parking", require("./routes/parkingRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));



// ✅ Test Route
app.get("/", (req, res) => {
    res.send("API Running");
});


// ✅ Server Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});
