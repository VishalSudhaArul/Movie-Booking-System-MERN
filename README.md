# 🎬 Movie Booking System – MERN Stack

A full-stack Movie Ticket Booking application built using the MERN stack (MongoDB, Express.js, React.js, Node.js). The platform simulates a real-world booking system where users can browse movies, select seats, and generate QR-based tickets with a smooth and secure experience.

## 🚀Key Features

### 👤User Features
- User Registration & Login (JWT Authentication)
- Browse Movies & View Show Details
- Real-time Seat Selection Interface
- Add-ons: Snacks & Parking Options
- Secure Ticket Booking System
- QR Code-based Ticket Generation
- Download Tickets as PDF
- Booking History Management
- Ticket Verification System

# 🛠 Tech Stack

# Frontend
- React.js
- Tailwind CSS
- Axios
- React Router
- QRCode.react
- jsPDF & html2canvas

### **Backend**
- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose
- JWT Authentication
- RESTful APIs

# Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---

# 🧠 System Highlights

- Designed RESTful APIs for booking, authentication, and data handling
- Implemented JWT-based authentication for secure access
- Built seat availability logic to prevent double booking
- Handled concurrent booking scenarios and edge cases
- Optimized frontend for responsiveness and smooth user flow
- Structured scalable backend with modular architecture

## Project Structure


Movie-Booking-System-MERN/
│
├── client/ # React Frontend
│ ├── src/
│ └── package.json
│
├── server/ # Node.js Backend
│ ├── controllers/
│ ├── models/
│ ├── routes/
│ └── server.js
│
└── README.md


---

## ⚙️ Setup Instructions

# Clone Repository
```bash
git clone https://github.com/VishalSudhaArul/Movie-Booking-System-MERN.git
cd Movie-Booking-System-MERN

Backend Setup
cd server
npm install

Create .env file:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000

Run backend:

npm start

Frontend Setup
cd client
npm install

Create .env file:

REACT_APP_API_URL=http://localhost:5000

Run frontend:

npm start
