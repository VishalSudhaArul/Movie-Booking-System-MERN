const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        // Log only the error type: some driver messages include parts of the connection string.
        console.error(`MongoDB connection failed (${error.name}). Check MONGO_URI and network access.`);
        process.exit(1);
    }
};

module.exports = connectDB;
