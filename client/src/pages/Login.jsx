import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Login() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const API_URL =
    process.env.REACT_APP_API_URL ||
    "https://movie-booking-system-mern-1.onrender.com";

  const handleLogin = () => {

    axios.post(`${API_URL}/api/auth/login`,{
      email,
      password
    })
    .then(res=>{

      localStorage.setItem("token",res.data.token);
      localStorage.setItem("user",JSON.stringify(res.data.user));

      alert("Login Success");

      navigate("/");

    })
    .catch(err=>{
      console.log(err.response?.data || err);
      alert("Login failed");
    });

  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">

      <h1 className="text-3xl mb-6">Login</h1>

      <input
        placeholder="Enter Email"
        className="p-3 text-black rounded mb-4"
        onChange={(e)=>setEmail(e.target.value)}
      />

      <input
        placeholder="Enter Password"
        type="password"
        className="p-3 text-black rounded mb-4"
        onChange={(e)=>setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="bg-red-600 px-6 py-2 rounded hover:bg-red-700"
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