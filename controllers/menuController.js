const asyncHandler = require('express-async-handler');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

// Helper: confirm the logged-in user owns/staffs the given restaurant
const assertRestaurantAccess = (req, res, restaurantId) => {
  if (req.user.role === 'admin') return;
  if (String(req.user.restaurant) !== String(restaurantId)) {
    res.status(403);
    throw new Error("Not authorized to manage this restaurant's menu");
  }
};

// @desc  Public: get menu for a restaurant (customer app)
// @route GET /api/restaurants/:restaurantId/menu
const getMenu = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({ restaurant: req.params.restaurantId, isAvailable: true });
  res.json(items);
});

// @desc  Restaurant staff/owner: create menu item
// @route POST /api/restaurants/:restaurantId/menu
const createMenuItem = asyncHandler(async (req, res) => {
  assertRestaurantAccess(req, res, req.params.restaurantId);

  const restaurant = await Restaurant.findById(req.params.restaurantId);
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  const item = await MenuItem.create({ ...req.body, restaurant: req.params.restaurantId });
  res.status(201).json(item);
});

// @desc  Restaurant staff/owner: update menu item (price, availability, etc.)
// @route PUT /api/restaurants/:restaurantId/menu/:itemId
const updateMenuItem = asyncHandler(async (req, res) => {
  assertRestaurantAccess(req, res, req.params.restaurantId);

  const item = await MenuItem.findOne({ _id: req.params.itemId, restaurant: req.params.restaurantId });
  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  const editable = ['name', 'description', 'price', 'imageUrl', 'category', 'isAvailable', 'isVeg', 'addOns'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });

  await item.save();
  res.json(item);
});

// @desc  Restaurant staff/owner: delete menu item
// @route DELETE /api/restaurants/:restaurantId/menu/:itemId
const deleteMenuItem = asyncHandler(async (req, res) => {
  assertRestaurantAccess(req, res, req.params.restaurantId);

  const item = await MenuItem.findOneAndDelete({ _id: req.params.itemId, restaurant: req.params.restaurantId });
  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  res.json({ message: 'Menu item deleted' });
});

module.exports = { getMenu, createMenuItem, updateMenuItem, deleteMenuItem };
