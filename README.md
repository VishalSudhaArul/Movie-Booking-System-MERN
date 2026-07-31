# 🎬 CineBook: Production-Grade Cinema Management & Ticketing Suite

![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Design](https://img.shields.io/badge/UI-Ultra_Dark_Glassmorphism-red.svg)
![IoT Telemetry](https://img.shields.io/badge/IoT-MQTT_%26_WebSockets-cyan.svg)

**CineBook** is an enterprise-grade, full-stack MERN (MongoDB, Express.js, React.js, Node.js) cinema management platform built for modern multiplex theater chains. It combines a high-end cinematic web application for moviegoers with an **Executive Control Center**, **Smart IoT Gate Telemetry**, **ANPR Parking Automation**, and **CineClub Loyalty Rewards**.

---

## 🌟 Key Platform Features

### 🎥 1. Customer Cinema Web Portal
* **Ultra-Dark Glassmorphic UI/UX**: Designed with modern dark mode aesthetic, vibrant neon highlights, and smooth micro-animations.
* **Spotlight Global Search (`⌘K`)**: Instant search overlay to find movies, shows, and refreshments from anywhere on the platform.
* **Interactive Floorplan Seating Grid**: Auditorium seat layout featuring category pricing (Balcony, First Class, Second Class), center aisle walkways, and quick auto-seat pick chips (1, 2, 3, 4, 6 seats).
* **🤝 Group Seat Booking Links**: 1-click shareable booking link generator allowing friends to reserve adjacent seats in the same auditorium row.
* **🗺️ Multiplex GPS Navigation**: Direct Google Maps route integration for all multiplex cinema locations.
* **🍿 In-Seat Pantry Delivery Mode**: Order refreshments to be delivered straight to your specific auditorium seat cushion (`F12`).
* **🎟️ Verified Buyer Audience Reviews**: Gold verified badges on user reviews to guarantee reviewer authenticity.

---

### 👑 2. Loyalty & Gift Card Store
* **CineClub Loyalty Wallet (`/loyalty`)**: Earn 10 CinePoints per ₹100 spent. Redeem points for gourmet popcorn tubs, ticket discount passes, and VIP recliner upgrades.
* **Digital E-Gift Card Store (`/gift-cards`)**: Send customizable digital movie passes with personalized gift messages and instant redeemable voucher codes.
* **❤️ Dedicated Watchlist Gallery (`/watchlist`)**: Front-visible watchlist tab to save favorite titles and book tickets instantly.

---

### 📡 3. Smart Cinema IoT Telemetry & Hardware Console (`/admin/iot`)
* **🚪 Automated QR Turnstile Gate Relays**: Simulates ESP32 microcontrollers at entrance doors (**Audi 01**, **Audi 02 IMAX**, **VIP Lounge**). Triggering a scan automatically unlocks hardware servo relays.
* **📷 ANPR License Plate Parking Barrier**: Optical camera simulation reading car registration plates (`MH-02-CB-1234`) and verifying active parking passes to lift entrance gates.
* **💺 Under-Seat Pressure Sensor Grid (FSR402)**: Real-time telemetry monitoring floorplan weight sensors. Triggers **`⚠️ UNBOOKED OCCUPATION (FRAUD ALERT)`** if an unbooked seat is occupied during showtime.
* **💡 Smart Lighting & HVAC AC Thermostat**: Automated dimmer controls transitioning auditorium lighting from **100% Intermission Welcome** down to **15% Movie Showtime Dimming**.

---

### ⚙️ 4. Executive Admin Command Center (`/admin/dashboard`)
* **Live KPI Operations Dashboard**: Tracks total active movies, show schedules, audience volume, and gross box office sales.
* **Financial Analytics Engine (`/admin/analytics`)**: Date range filtering (**Today**, **Week**, **Month**, **All Time**), box office leaderboards, theater revenue share progress bars, and 1-click **PDF & CSV Report Exports**.
* **Gate Staff Ticket Scanner (`/scanner`)**: Camera-based live QR ticket scanner and manual ticket lookup portal for multiplex gate staff.

---

## 🛠 Tech Stack & Architecture

### **Frontend Client**
* **React.js (v18)**: Component-based architecture with Hooks and React Router.
* **Tailwind CSS**: Custom dark glassmorphism styling tokens and micro-interactions.
* **Axios**: Centralized API helper module (`api.js`) with automatic header injection.
* **jsPDF & AutoTable**: Client-side financial audit report generation.
* **QRCode.react**: Encrypted ticket QR rendering.

### **Backend Server**
* **Node.js & Express.js**: RESTful API architecture with structured controller routing.
* **MongoDB & Mongoose**: Relational data models for Movies, Shows, Bookings, Snacks, Parking, Reviews, and Users.
* **JWT & Bcrypt**: Password hashing and role-based access control (RBAC).

---

## 📂 Project Structure

```bash
Movie-Booking-System-MERN/
├── client/
│   ├── src/
│   │   ├── api.js                   # Centralized Axios API Helper
│   │   ├── App.js                   # Global Routing Configuration
│   │   ├── components/              # Navbar, Footer, SpotlightSearch, PrivateRoute
│   │   └── pages/                   # Home, Movies, Seats, AddOns, Watchlist,
│   │                                # GiftCards, LoyaltyWallet, AdminDashboard,
│   │                                # AdminAnalytics, AdminIoTConsole, Scanner
│   └── package.json
│
├── server/
│   ├── controllers/                 # Analytics, Booking, Movie, Show Controllers
│   ├── models/                      # Mongoose Schemas (User, Booking, Movie, Show)
│   ├── routes/                      # API Endpoints
│   ├── middleware/                  # Admin & Auth Route Security
│   └── server.js                    # Express Entry Point & Database Connect
│
└── README.md
```

---

## ⚙️ Quick Start Setup & Environment Config

### 1. Clone Repository
```bash
git clone https://github.com/VishalSudhaArul/Movie-Booking-System-MERN.git
cd Movie-Booking-System-MERN
```

### 2. Backend Environment (`/server`)
```bash
cd server
npm install
```
Create a `.env` file inside `/server`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cinebook
JWT_SECRET=your_production_jwt_secret_key
```
Start Node server:
```bash
npm start
```

### 3. Frontend Environment (`/client`)
```bash
cd ../client
npm install
```
Create a `.env` file inside `/client`:
```env
REACT_APP_API_URL=http://localhost:5000
```
Start React development server:
```bash
npm start
```

---

## 🔐 Authorized Admin Gate Access
For demonstration or administrative auditing without creating a theater owner account:
1. Click **`⚙️ Admin`** in the navigation bar.
2. Enter the authorized session key: `123456`.
3. Access full operational control over shows, movies, parking rates, snacks, analytics, and IoT telemetry.

---

## 👨‍💻 Author & Maintainer
**Vishal Sudha Arul**  
*Full-Stack Engineer & UI/UX Developer*  
* GitHub: [@VishalSudhaArul](https://github.com/VishalSudhaArul)

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for details.
