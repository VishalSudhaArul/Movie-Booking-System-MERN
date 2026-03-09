import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";

function Login() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleLogin = async () => {

    try {

      setLoading(true);

      const res = await axios.post(`${API_URL}/api/users/login`, {
        email
      });

      localStorage.setItem("userId", res.data._id);
      localStorage.setItem("user", JSON.stringify(res.data));

      const redirectTo = location.state?.redirectTo || "/";
      navigate(redirectTo);

    } catch {

      alert("User not found");

    } finally {

      setLoading(false);

    }

  };


  return (

    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-white">

      <div className="bg-[#111118] border border-white/10 p-10 rounded-3xl w-[380px] shadow-2xl">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Login
        </h1>

        <input
          placeholder="Enter Email"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20 focus:border-red-500 outline-none"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-red-600 py-3 rounded-xl hover:bg-red-700 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>


        <div className="text-center my-4 text-gray-400">
          OR
        </div>


        {/* Google Login Button */}

        <button className="flex items-center justify-center gap-3 w-full bg-white text-black py-3 rounded-xl hover:opacity-90">

          <img
            src="https://cdn-icons-png.flaticon.com/512/281/281764.png"
            alt="google"
            className="w-5"
          />

          Continue with Google

        </button>


        <p className="text-sm text-center mt-6 text-gray-400">

          Don't have account?{" "}

          <Link to="/register" className="text-red-500 hover:underline">
            Register
          </Link>

        </p>

      </div>

    </div>

  );

}

export default Login;