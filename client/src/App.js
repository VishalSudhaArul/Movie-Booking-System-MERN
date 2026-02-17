import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import Seats from "./pages/Seats";
// import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import MyBookings from "./pages/MyBookings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Movies from "./pages/Movies";
import AddOns from "./pages/AddOns";
import VerifyTicket from "./pages/VerifyTicket";
import Scanner from "./pages/Scanner";
import AdminDashboard from "./pages/AdminDashboard";
import AdminScan from "./pages/AdminScan";
import AdminMovies from "./pages/admin/AdminMovies";
import AdminShows from "./pages/admin/AdminShows";
import AdminSnacks from "./pages/admin/AdminSnacks";
import AdminParking from "./pages/admin/AdminParking";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
    <Navbar/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:movieId" element={<MovieDetails />} />
        <Route path="/seats/:showId" element={<Seats />} />
        {/* <Route path="/admin" element={<Admin />} /> */}
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/addons" element={<AddOns />} />
        <Route path="/mybookings" element={<MyBookings />} />
        <Route path="/verify/:bookingId" element={<VerifyTicket />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/scan" element={<AdminScan />} />
        <Route path="/admin/movies" element={<AdminMovies />} />
        <Route path="/admin/shows" element={<AdminShows />} />
        <Route path="/admin/snacks" element={<AdminSnacks />} />
        <Route path="/admin/parking" element={<AdminParking />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />


      </Routes>
    </BrowserRouter>
    
  );
}

export default App;


// function App() {
//   return (
//     <div className="bg-black text-white min-h-screen flex items-center justify-center">
//       <h1 className="text-5xl font-bold text-red-500">
//         Tailwind Working
//       </h1>
//     </div>
//   );
// }

// export default App;