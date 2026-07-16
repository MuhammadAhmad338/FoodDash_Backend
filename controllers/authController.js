const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const generateToken = require('../utils/generateToken');

// @desc  Register a new customer (default) or restaurant_owner
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, restaurantName } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('Email already registered');
  }

  // Only customer, restaurant_owner, and admin can self-register.
  // restaurant_staff is invited by an owner.
  const allowedSelfRoles = ['customer', 'restaurant_owner', 'admin'];
  const finalRole = allowedSelfRoles.includes(role) ? role : 'customer';

  const user = await User.create({ name, email, password, phone, role: finalRole });

  // If registering as a restaurant owner, create a pending Restaurant profile for them
  if (finalRole === 'restaurant_owner') {
    if (!restaurantName) {
      res.status(400);
      throw new Error('restaurantName is required when registering as restaurant_owner');
    }
    const restaurant = await Restaurant.create({ name: restaurantName, owner: user._id });
    user.restaurant = restaurant._id;
    await user.save();
  }

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurant: user.restaurant,
    token: generateToken(user._id, user.role),
  });
});

// @desc  Login for any role
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account is deactivated');
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurant: user.restaurant,
    token: generateToken(user._id, user.role),
  });
});

// @desc  Get logged-in user's profile
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = { register, login, getMe };
