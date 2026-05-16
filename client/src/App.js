import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import AdminGate from "./components/AdminGate";

import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Seats from "./pages/Seats";
import AddOns from "./pages/AddOns";
import MyBookings from "./pages/MyBookings";
import VerifyTicket from "./pages/VerifyTicket";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminScan from "./pages/AdminScan";
import Scanner from "./pages/Scanner";

// ── Admin Sub-pages ──
import AdminMovies from "./pages/admin/AdminMovies";
import AdminShows from "./pages/admin/AdminShows";
import AdminSnacks from "./pages/admin/AdminSnacks";
import AdminParking from "./pages/admin/AdminParking";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Protected User Routes ── */}
        <Route
          path="/seats/:showId"
          element={
            <PrivateRoute>
              <Seats />
            </PrivateRoute>
          }
        />
        <Route
          path="/addons/:showId"
          element={
            <PrivateRoute>
              <AddOns />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <PrivateRoute>
              <MyBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="/verify/:bookingId"
          element={
            <PrivateRoute>
              <VerifyTicket />
            </PrivateRoute>
          }
        />
        <Route
          path="/scanner"
          element={
            <PrivateRoute>
              <Scanner />
            </PrivateRoute>
          }
        />

        {/* ── Admin Routes ── */}
        <Route
          path="/admin"
          element={
            <AdminGate>
              <Admin />
            </AdminGate>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminGate>
              <AdminDashboard />
            </AdminGate>
          }
        />
        <Route
          path="/admin/movies"
          element={
            <AdminGate>
              <AdminMovies />
            </AdminGate>
          }
        />
        <Route
          path="/admin/shows"
          element={
            <AdminGate>
              <AdminShows />
            </AdminGate>
          }
        />
        <Route
          path="/admin/snacks"
          element={
            <AdminGate>
              <AdminSnacks />
            </AdminGate>
          }
        />
        <Route
          path="/admin/parking"
          element={
            <AdminGate>
              <AdminParking />
            </AdminGate>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminGate>
              <AdminAnalytics />
            </AdminGate>
          }
        />
        <Route
          path="/admin/scan"
          element={
            <AdminGate>
              <AdminScan />
            </AdminGate>
          }
        />

        {/* ── 404 Fallback ── */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
                <p className="text-white text-xl mb-6">Page Not Found</p>
                <a
                  href="/"
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  Go Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;