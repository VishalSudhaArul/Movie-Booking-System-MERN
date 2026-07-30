# 🎬 CineBook Feature Recommendations & Technical Roadmap

This document outlines the feature recommendations and enhancement roadmap for the **CineBook Movie Booking Ecosystem** (MERN Stack).

---

## 🌟 1. User Experience & Engagement

### 🎥 Movie Trailer Modal
- **Description**: Embedded YouTube trailer player on the Home hero section and Movie Details pages.
- **Tech Stack**: React YouTube player modal (`framer-motion` + YouTube Iframe).
- **Backend requirement**: `trailerUrl` field added to the Movie schema.

### ⭐ Ratings & Reviews System
- **Description**: Allow logged-in users to post star ratings (1-5 stars) and written reviews for movies. Display average rating and review counts across movie cards.
- **Tech Stack**: Mongoose `Review` schema linked to `User` and `Movie`, dynamic rating component.

### 💖 Watchlist / Favorites System
- **Description**: Users can bookmark movies to their personal Watchlist and view them under a dedicated tab.
- **Tech Stack**: User schema `watchlist` array, quick toggle button on movie cards.

---

## 🎟️ 2. Smart Booking & Convenience

### 🏷️ Promo Code & Discount Coupons
- **Description**: Apply discount codes during booking (e.g., `CINE50` for ₹50 off, `FIRST20` for 20% off) with real-time price adjustment on checkout.
- **Tech Stack**: Express coupon endpoint, frontend discount calculator.

### ⏱️ Real-Time Seat Locking
- **Description**: Hold selected seats for 5–10 minutes during the booking flow to prevent double booking by simultaneous users.
- **Tech Stack**: WebSockets (`socket.io`) or backend TTL lock timer.

### 💼 In-App User Wallet & Refunds
- **Description**: Cancel bookings up to 2 hours before showtime to receive partial or full refund credits in a digital wallet.

---

## 📊 3. Administrative Control & Operations

### 📈 Reports & Analytics CSV Export
- **Description**: Export theater booking logs, revenue stats, and snack sales reports directly to CSV/Excel files.
- **Tech Stack**: Client-side CSV generator / `json2csv` node module.

### 🍿 Dynamic Hall & Pricing Engine
- **Description**: Admin management for peak/weekend pricing rules and custom seating layouts.

---

## 🎯 Implementation Status
- [x] Feature Roadmap Analysis Document Created
- [x] Movie Trailer System (Schema & Modal)
- [x] Movie Ratings & Reviews System
- [x] Promo Code / Discount Coupon Engine
- [x] Watchlist / Bookmark Functionality
- [x] Booking Analytics CSV Export
