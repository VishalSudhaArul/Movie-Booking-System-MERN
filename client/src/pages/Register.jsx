// import { useState } from "react";
// import axios from "axios";
// import { useNavigate, Link } from "react-router-dom";

// function Register() {

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");

//   const navigate = useNavigate();

//   const API_URL =
//     process.env.REACT_APP_API_URL || "http://localhost:5000";

//   const handleRegister = async () => {

//     try {

//       await axios.post(`${API_URL}/api/users/register`, {
//         name,
//         email
//       });

//       alert("Registration successful");

//       navigate("/login");

//     } catch {

//       alert("Registration failed");

//     }

//   };


//   return (

//     <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-white">

//       <div className="bg-[#111118] border border-white/10 p-10 rounded-3xl w-[380px] shadow-2xl">

//         <h1 className="text-3xl font-bold mb-6 text-center">
//           Register
//         </h1>

//         <input
//           placeholder="Name"
//           className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20 focus:border-red-500 outline-none"
//           onChange={(e) => setName(e.target.value)}
//         />

//         <input
//           placeholder="Email"
//           className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20 focus:border-red-500 outline-none"
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <button
//           onClick={handleRegister}
//           className="w-full bg-red-600 py-3 rounded-xl hover:bg-red-700 transition"
//         >
//           Register
//         </button>


//         <div className="text-center my-4 text-gray-400">
//           OR
//         </div>

//         <button className="flex items-center justify-center gap-3 w-full bg-white text-black py-3 rounded-xl hover:opacity-90">

//           <img
//             src="https://cdn-icons-png.flaticon.com/512/281/281764.png"
//             alt="google"
//             className="w-5"
//           />

//           Sign up with Google

//         </button>


//         <p className="text-sm text-center mt-6 text-gray-400">

//           Already have an account?{" "}

//           <Link to="/login" className="text-red-500 hover:underline">
//             Login
//           </Link>

//         </p>

//       </div>

//     </div>

//   );

// }

// export default Register;






import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleRegister = async () => {
    try {
      setLoading(true);

      await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password
      });

      alert("Registration successful ✅");
      navigate("/login");

    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-white">

      <div className="bg-[#111118] border border-white/10 p-10 rounded-3xl w-[380px] shadow-2xl">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Register
        </h1>

        <input
          type="text"
          placeholder="Name"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20 focus:border-red-500 outline-none"
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20 focus:border-red-500 outline-none"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-4 rounded-xl bg-black border border-white/20 focus:border-red-500 outline-none"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          className="w-full bg-red-600 py-3 rounded-xl hover:bg-red-700 transition"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="text-center my-4 text-gray-400">
          OR
        </div>

        <button className="flex items-center justify-center gap-3 w-full bg-white text-black py-3 rounded-xl hover:opacity-90">
          <img
            src="https://cdn-icons-png.flaticon.com/512/281/281764.png"
            alt="google"
            className="w-5"
          />
          Sign up with Google
        </button>

        <p className="text-sm text-center mt-6 text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-red-500 hover:underline">
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Register;