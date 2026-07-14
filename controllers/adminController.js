const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// @desc  Admin dashboard summary stats
// @route GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const [totalRestaurants, pendingRestaurants, totalCustomers, totalOrders, revenueAgg] = await Promise.all([
    Restaurant.countDocuments({ status: 'approved' }),
    Restaurant.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalPlatformFees: { $sum: '$platformFee' } } },
    ]),
  ]);

  res.json({
    totalRestaurants,
    pendingRestaurants,
    totalCustomers,
    totalOrders,
    totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    totalPlatformFees: revenueAgg[0]?.totalPlatformFees || 0,
  });
});

// @desc  Admin: list all users, optionally filtered by role
// @route GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users);
});

// @desc  Admin: activate/deactivate a user account
// @route PATCH /api/admin/users/:id/status
const setUserActiveStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.isActive = isActive;
  await user.save();
  res.json({ _id: user._id, isActive: user.isActive });
});

// @desc  Admin: view all orders platform-wide
// @route GET /api/admin/orders
const listAllOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const orders = await Order.find(filter)
    .populate('customer', 'name email')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(orders);
});

module.exports = { getStats, listUsers, setUserActiveStatus, listAllOrders };
