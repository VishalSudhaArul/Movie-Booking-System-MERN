🎬 Movie Booking System – MERN Stack

A full-stack Movie Ticket Booking application built using the MERN stack (MongoDB, Express.js, React.js, Node.js).
The platform allows users to browse movies, view shows, book seats, generate QR-based tickets, and manage bookings.

🔗 Live Frontend: https://movie-booking-system-mern-fawn.vercel.app

🔗 Backend API: https://movie-booking-system-mern.onrender.com

🚀 Features
👤 User Features

User Registration & Login (JWT Authentication)

Browse Movies & View Show Details

Select Seats with Real-time UI

Add Snacks & Parking Options

Secure Ticket Booking

QR Code Ticket Generation

Download Ticket as PDF

View Booking History

Ticket Verification Page

🛠 Admin Features (if implemented)

Add / Edit Movies

Create Shows

Manage Pricing

🏗 Tech Stack
Frontend

React.js

Axios

Tailwind CSS

QRCode.react

jsPDF & html2canvas

React Router

Backend

Node.js

Express.js

MongoDB (Atlas)

Mongoose

JWT Authentication

REST APIs

Deployment

Frontend: Vercel

Backend: Render

Database: MongoDB Atlas

📂 Project Structure
Movie-Booking-System-MERN/
│
├── client/         # React Frontend
│   ├── src/
│   └── package.json
│
├── server/         # Node + Express Backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── server.js
│
└── README.md

⚙️ Installation & Setup

1️⃣ Clone the Repository
git clone https://github.com/VishalSudhaArul/Movie-Booking-System-MERN.git
cd Movie-Booking-System-MERN

2️⃣ Backend Setup
cd server
npm install

Create .env file:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000

Run backend:

npm start

3️⃣ Frontend Setup
cd client
npm install

Create .env file:

REACT_APP_API_URL=http://localhost:5000

Run frontend:

npm start
🔐 Authentication Flow

User logs in → JWT token generated

Token stored in localStorage

Protected routes validate token

Only logged-in users can book tickets

🎟 Ticket System

Each booking generates:

Unique Booking ID

QR Code

Movie + Show Details

Tickets can be:

Downloaded as PDF

Verified via QR scan

Show status automatically updates:

VALID

USED

COMPLETED

🌍 Deployment Configuration
Vercel Environment Variable
REACT_APP_API_URL=https://movie-booking-system-mern.onrender.com
Render Settings

Build Command: npm install

Start Command: node server.js

Port: Uses process.env.PORT


Ticket Verification

📌 Future Enhancements

Razorpay / Stripe Payment Integration

Admin Dashboard

Real-time seat locking

Email Ticket Confirmation

Role-based Authentication

Dark/Light Mode toggle

👨‍💻 Author

Vishal Sudha Arul
Full Stack Developer
GitHub: https://github.com/VishalSudhaArul

📄 License

This project is built for educational and portfolio purposes.
