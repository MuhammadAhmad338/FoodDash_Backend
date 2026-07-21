const express = require('express');
const {
  listRestaurants,
  getRestaurant,
  updateRestaurant,
  listAllRestaurantsAdmin,
  uploadRestaurantLogo,
  getRestaurantLogo,
  uploadRestaurantCover,
  getRestaurantCover,
} = require('../controllers/restaurantController');
const {
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuItemImage,
  getMenuItemImage,
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

const router = express.Router();

// Public browsing (customer app)
router.get('/', listRestaurants);

// Admin management — must come before '/:id' so 'admin' isn't parsed as an id
router.get('/admin/all', protect, authorize('admin'), listAllRestaurantsAdmin);

router.get('/:id', getRestaurant);
router.put('/:id', protect, authorize('restaurant_owner', 'admin'), updateRestaurant);

// Restaurant logo/cover images (bytes stored directly in MongoDB)
router.get('/:id/logo', getRestaurantLogo);
router.post('/:id/logo', protect, authorize('restaurant_owner', 'admin'), uploadSingleImage('image'), uploadRestaurantLogo);
router.get('/:id/cover', getRestaurantCover);
router.post('/:id/cover', protect, authorize('restaurant_owner', 'admin'), uploadSingleImage('image'), uploadRestaurantCover);

// Menu (nested under a restaurant)
router.get('/:restaurantId/menu', getMenu);
router.post('/:restaurantId/menu', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), createMenuItem);
router.put('/:restaurantId/menu/:itemId', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), updateMenuItem);
router.delete('/:restaurantId/menu/:itemId', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), deleteMenuItem);

// Menu item image (bytes stored directly in MongoDB)
router.get('/:restaurantId/menu/:itemId/image', getMenuItemImage);
router.post(
  '/:restaurantId/menu/:itemId/image',
  protect,
  authorize('restaurant_owner', 'restaurant_staff', 'admin'),
  uploadSingleImage('image'),
  uploadMenuItemImage
);

module.exports = router;
