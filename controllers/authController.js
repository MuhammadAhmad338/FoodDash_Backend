const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const generateToken = require('../utils/generateToken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// @desc  Sign in (or register) via a Google ID token from the frontend
// @route POST /api/auth/google
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400);
    throw new Error('idToken is required');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid Google token');
  }

  const { sub: googleId, email, name } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    user = await User.create({ name, email, googleId, role: 'customer' });
  } else if (!user.googleId) {
    // Existing email/password account signing in with Google for the first time — link it
    user.googleId = googleId;
    await user.save();
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

// @desc  Upload/replace the logged-in user's own profile photo
// @route POST /api/auth/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file provided');
  }

  const user = await User.findById(req.user._id);
  user.avatar = { data: req.file.buffer, contentType: req.file.mimetype };
  await user.save();

  res.json({ message: 'Image uploaded', avatarUrl: `/api/auth/avatar/${user._id}` });
});

// @desc  Public: fetch a user's avatar bytes straight out of MongoDB
// @route GET /api/auth/avatar/:id
const getAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('avatar');
  if (!user || !user.avatar || !user.avatar.data) {
    res.status(404);
    throw new Error('Image not found');
  }

  res.set('Content-Type', user.avatar.contentType);
  res.send(user.avatar.data);
});

module.exports = { register, login, googleAuth, getMe, uploadAvatar, getAvatar };
