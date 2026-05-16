# 🎬 CineBook: Advanced Movie Booking Ecosystem

![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![UI](https://img.shields.io/badge/UI-Cinematic-red.svg)

**CineBook** is a premium, production-grade Movie Ticket Booking platform built with the MERN stack. It features a cinematic, Netflix-inspired user interface, a robust administrative control center, and a seamless QR-based ticket verification system designed for real-world theater operations.

---

## 🌟 Key Pillars

### 🎥 1. Cinematic User Experience
*   **Netflix-Inspired UI**: A high-end dark aesthetic with glassmorphic elements and professional typography.
*   **Immersive Hero Section**: Dynamic "Ken Burns" effect sliders with smooth cross-fading transitions.
*   **Interactive Movie Catalog**: Staggered entrance animations (`framer-motion`), real-time search, and genre filtering.
*   **Modern Seat Selection**: A category-based interactive grid (Balcony, Gold, Silver) with real-time price calculation.

### 🛡️ 2. Administrative Control Center
*   **Authorized Bypass Access**: Secure administrative entry via a standard bypass mechanism (`123456`).
*   **Full CRUD Management**: Comprehensive dashboards to manage Movies, Shows, Snacks, and Parking lots.
*   **Real-time Analytics**: Visual data tracking for ticket sales, revenue generation, and theater occupancy.
*   **Theater-Specific Assets**: Assign unique snacks and parking pricing to individual theaters.

### 🎟️ 3. Smart Ticketing & Entry
*   **QR Code Generation**: Every booking generates a unique, encrypted QR code for security.
*   **Public Verification System**: A dedicated, login-free entry portal for theater staff to scan and verify tickets instantly.
*   **Ticket Lifecycle**: Automatic status tracking (VALID → USED → COMPLETED) to prevent double entry.
*   **Digital Downloads**: High-quality PDF ticket generation for offline use.

---

## 🛠 Tech Stack & Architecture

### **Frontend (The Experience)**
- **React.js**: Functional components with Hooks and Context API.
- **Framer Motion**: High-performance cinematic animations and transitions.
- **Tailwind CSS**: Modern glassmorphic design system.
- **Axios**: Centralized API management with custom interceptors for authentication.
- **QRCode.react**: Dynamic QR generation.
- **jsPDF & html2canvas**: Client-side ticket rendering.

### **Backend (The Engine)**
- **Node.js & Express.js**: Modular REST API architecture.
- **MongoDB & Mongoose**: Relational data modeling in a NoSQL environment.
- **JWT Authentication**: Secure user sessions.
- **Security Middleware**: Role-based access control (RBAC) and admin bypass logic.

---

## 📂 Project Structure

```bash
Movie-Booking-System-MERN/
├── client/                 # React Frontend (Vite/CRA)
│   ├── src/
│   │   ├── api.js         # Centralized API Interceptor
│   │   ├── pages/         # Cinematic UI Pages
│   │   ├── components/    # Reusable UI Atoms
│   │   └── App.js         # Routing & Global State
│   └── package.json
│
├── server/                 # Node.js Backend
│   ├── controllers/       # Business Logic
│   ├── models/            # Database Schemas
│   ├── routes/            # API Endpoints
│   ├── middleware/        # Security & Auth Logic
│   └── server.js          # Entry Point
│
└── README.md
```

---

## ⚙️ Setup & Installation

### **1. Clone the Repository**
```bash
git clone https://github.com/VishalSudhaArul/Movie-Booking-System-MERN.git
cd Movie-Booking-System-MERN
```

### **2. Backend Configuration**
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret_key
PORT=5000
```
Start the server:
```bash
npm start
```

### **3. Frontend Configuration**
```bash
cd ../client
npm install
```
Create a `.env` file in the `client` directory:
```env
REACT_APP_API_URL=http://localhost:5000
```
Start the application:
```bash
npm start
```

---

## 🔐 Admin Access
To access the Administrative Dashboard without a theater-owner account:
1. Navigate to the **Admin** link in the navbar.
2. Enter the authorized bypass password: `123456`.
3. You will be granted full CRUD privileges for the session.

---

## 👨‍💻 Author
**Vishal Sudha Arul**  
*Full Stack Developer & UI/UX Enthusiast*

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
