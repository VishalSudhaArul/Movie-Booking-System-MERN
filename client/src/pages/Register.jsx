import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleRegister = () => {

    axios.post(`${API_URL}/api/users/register`,{
      name,
      email,
      password
    })
    .then(()=>{
      alert("Registration successful");
      navigate("/login");
    })
    .catch(err=>{
      console.log(err);
      alert("Registration failed");
    });

  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex items-center justify-center">

      <div className="bg-[#111118] border border-white/10 p-10 rounded-3xl w-[400px] shadow-xl">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Register
        </h1>

        <input
          placeholder="Enter Name"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20"
          onChange={(e)=>setName(e.target.value)}
        />

        <input
          placeholder="Enter Email"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20"
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          placeholder="Enter Password"
          type="password"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20"
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          className="w-full bg-red-600 py-3 rounded-xl hover:bg-red-700"
        >
          Register
        </button>

        <p className="text-sm text-center mt-6 text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-red-500">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Register;