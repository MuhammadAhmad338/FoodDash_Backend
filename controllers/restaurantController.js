const asyncHandler = require('express-async-handler');
const Restaurant = require('../models/Restaurant');

// @desc  Public list of approved, open restaurants (customer app browsing)
// @route GET /api/restaurants
const listRestaurants = asyncHandler(async (req, res) => {
  const { city, cuisine, search } = req.query;

  const filter = { status: 'approved' };
  if (city) filter['address.city'] = city;
  if (cuisine) filter.cuisine = cuisine;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
  res.json(restaurants);
});

// @desc  Get single restaurant by id (public)
// @route GET /api/restaurants/:id
const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }
  res.json(restaurant);
});

// @desc  Update own restaurant profile (owner/staff)
// @route PUT /api/restaurants/:id
const updateRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  if (String(restaurant.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to edit this restaurant');
  }

  const editable = ['name', 'description', 'cuisine', 'logoUrl', 'coverUrl', 'address', 'phone', 'isOpen', 'openingHours'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) restaurant[field] = req.body[field];
  });

  // Owners cannot self-approve; only admin changes status/commissionRate
  if (req.user.role === 'admin') {
    if (req.body.status) restaurant.status = req.body.status;
    if (req.body.commissionRate !== undefined) restaurant.commissionRate = req.body.commissionRate;
  }

  await restaurant.save();
  res.json(restaurant);
});

// @desc  Admin: list all restaurants regardless of status
// @route GET /api/restaurants/admin/all
const listAllRestaurantsAdmin = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const restaurants = await Restaurant.find(filter).populate('owner', 'name email').sort({ createdAt: -1 });
  res.json(restaurants);
});

// Shared helper for the logo/cover upload + fetch pairs below
const assertOwnerOrAdmin = (req, res, restaurant) => {
  if (String(restaurant.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to edit this restaurant');
  }
};

const uploadRestaurantImage = (field) =>
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error('No image file provided');
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      res.status(404);
      throw new Error('Restaurant not found');
    }
    assertOwnerOrAdmin(req, res, restaurant);

    restaurant[field] = { data: req.file.buffer, contentType: req.file.mimetype };
    await restaurant.save();

    res.json({ message: 'Image uploaded', imageUrl: `/api/restaurants/${restaurant._id}/${field}` });
  });

const getRestaurantImage = (field) =>
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.params.id).select(field);
    if (!restaurant || !restaurant[field] || !restaurant[field].data) {
      res.status(404);
      throw new Error('Image not found');
    }

    res.set('Content-Type', restaurant[field].contentType);
    res.send(restaurant[field].data);
  });

// @desc  Owner/admin: upload/replace restaurant logo (stored directly in MongoDB)
// @route POST /api/restaurants/:id/logo
const uploadRestaurantLogo = uploadRestaurantImage('logo');

// @desc  Public: fetch restaurant logo bytes straight out of MongoDB
// @route GET /api/restaurants/:id/logo
const getRestaurantLogo = getRestaurantImage('logo');

// @desc  Owner/admin: upload/replace restaurant cover image (stored directly in MongoDB)
// @route POST /api/restaurants/:id/cover
const uploadRestaurantCover = uploadRestaurantImage('cover');

// @desc  Public: fetch restaurant cover bytes straight out of MongoDB
// @route GET /api/restaurants/:id/cover
const getRestaurantCover = getRestaurantImage('cover');

module.exports = {
  listRestaurants,
  getRestaurant,
  updateRestaurant,
  listAllRestaurantsAdmin,
  uploadRestaurantLogo,
  getRestaurantLogo,
  uploadRestaurantCover,
  getRestaurantCover,
};
