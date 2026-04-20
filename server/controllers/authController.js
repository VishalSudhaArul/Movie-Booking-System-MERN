// authController.js

// const User = require("../models/User");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// exports.register = async(req,res)=>{
//     try{
//         const {name,email,password} = req.body;

//         const hash = await bcrypt.hash(password,10);

//         const user = await User.create({
//             name,
//             email,
//             password:hash
//         });

//         res.json(user);
//     }catch(err){
//         res.status(500).json(err);
//     }
// };

// exports.login = async(req,res)=>{
//     try{
//         const {email,password} = req.body;

//         const user = await User.findOne({email});
//         if(!user) return res.status(404).send("User not found");

//         const match = await bcrypt.compare(password,user.password);
//         if(!match) return res.status(400).send("Wrong password");

//         const token = jwt.sign({id:user._id},process.env.JWT_SECRET);

//         res.json({token,user});
//     }catch(err){
//         res.status(500).json(err);
//     }
// };





const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

// ✅ REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};