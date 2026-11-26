import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";
import AdminGate from "./components/AdminGate";
import { ToastProvider } from "./components/ui/Toast";
import { PageLoader, EmptyState } from "./components/ui/Feedback";
import { WatchlistProvider } from "./context/WatchlistContext";

// Home is loaded eagerly for a fast first paint
import Home from "./pages/Home";

// Code-split every other route so the initial bundle stays small
const Movies = lazy(() => import("./pages/Movies"));
const MovieDetails = lazy(() => import("./pages/MovieDetails"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Seats = lazy(() => import("./pages/Seats"));
const AddOns = lazy(() => import("./pages/AddOns"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const VerifyTicket = lazy(() => import("./pages/VerifyTicket"));
const SnacksHub = lazy(() => import("./pages/SnacksHub"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminScan = lazy(() => import("./pages/AdminScan"));
const Scanner = lazy(() => import("./pages/Scanner"));

// Admin Sub-pages (Heavy libraries: Chart.js, IoT telemetry)
const AdminMovies = lazy(() => import("./pages/admin/AdminMovies"));
const AdminShows = lazy(() => import("./pages/admin/AdminShows"));
const AdminSnacks = lazy(() => import("./pages/admin/AdminSnacks"));
const AdminParking = lazy(() => import("./pages/admin/AdminParking"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminIoTConsole = lazy(() => import("./pages/admin/AdminIoTConsole"));
const AdminAuditoriums = lazy(() => import("./pages/admin/AdminAuditoriums"));
const AdminVenues = lazy(() => import("./pages/admin/AdminVenues"));
const AdminPromotions = lazy(() => import("./pages/admin/AdminPromotions"));

const GiftCards = lazy(() => import("./pages/GiftCards"));
const LoyaltyWallet = lazy(() => import("./pages/LoyaltyWallet"));
const Watchlist = lazy(() => import("./pages/Watchlist"));

// Scroll back to the top when moving to a different page
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <EmptyState
          icon="film"
          title="Page not found"
          message="The page you're looking for doesn't exist or has been moved."
          action={
            <Link to="/" className="btn-primary">
              Back to home
            </Link>
          }
        />
      </div>
    </main>
  );
}

function App() {
  return (
    <Router>
      <ToastProvider>
      <WatchlistProvider>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public Routes ── */}
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movies/:movieId" element={<MovieDetails />} />
          <Route path="/movie/:movieId" element={<MovieDetails />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/gift-cards" element={<GiftCards />} />
          <Route path="/loyalty" element={<LoyaltyWallet />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/snacks" element={<SnacksHub />} />
          <Route path="/food-beverages" element={<SnacksHub />} />

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
            path="/mybookings"
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
          {/* Ticket scanning admits people, so it's staff-only */}
          <Route
            path="/scanner"
            element={
              <AdminGate>
                <Scanner />
              </AdminGate>
            }
          />

          {/* ── Admin Routes ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
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
            path="/admin/auditoriums"
            element={
              <AdminGate>
                <AdminAuditoriums />
              </AdminGate>
            }
          />
          <Route
            path="/admin/venues"
            element={
              <AdminGate>
                <AdminVenues />
              </AdminGate>
            }
          />
          <Route
            path="/admin/promotions"
            element={
              <AdminGate>
                <AdminPromotions />
              </AdminGate>
            }
          />
          <Route
            path="/admin/iot"
            element={
              <AdminGate>
                <AdminIoTConsole />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </div>
      <Footer />
      </div>
      </WatchlistProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;