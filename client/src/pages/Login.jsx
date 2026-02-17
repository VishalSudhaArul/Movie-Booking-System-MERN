import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";

function Login() {

  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {

    axios.post("http://localhost:5000/api/users/login", {
      email
    })
    .then(res => {

      // ✅ Save userId
      localStorage.setItem("userId", res.data._id);

      // ✅ Save full user
      localStorage.setItem("user", JSON.stringify(res.data));

      alert("Login Success");

      // Redirect back if came from protected page
      const redirectTo = location.state?.redirectTo || "/";
      navigate(redirectTo);

    })
    .catch(() => alert("User not found"));

  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">

      <h1 className="text-3xl mb-6">Login</h1>

      <input
        placeholder="Enter Email"
        className="p-3 text-black rounded mb-4"
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="bg-red-600 px-6 py-2 rounded hover:bg-red-700 transition"
      >
        Login
      </button>

      <p className="mt-4 text-gray-400 text-sm">
        Don't have account?{" "}
        <Link to="/register" className="text-red-500">
          Register
        </Link>
      </p>

    </div>
  );
}

export default Login;
