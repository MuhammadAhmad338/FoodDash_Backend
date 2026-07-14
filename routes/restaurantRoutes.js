const express = require('express');
const {
  listRestaurants,
  getRestaurant,
  updateRestaurant,
  listAllRestaurantsAdmin,
} = require('../controllers/restaurantController');
const { getMenu, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public browsing (customer app)
router.get('/', listRestaurants);

// Admin management — must come before '/:id' so 'admin' isn't parsed as an id
router.get('/admin/all', protect, authorize('admin'), listAllRestaurantsAdmin);

router.get('/:id', getRestaurant);
router.put('/:id', protect, authorize('restaurant_owner', 'admin'), updateRestaurant);

// Menu (nested under a restaurant)
router.get('/:restaurantId/menu', getMenu);
router.post('/:restaurantId/menu', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), createMenuItem);
router.put('/:restaurantId/menu/:itemId', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), updateMenuItem);
router.delete('/:restaurantId/menu/:itemId', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), deleteMenuItem);

module.exports = router;
