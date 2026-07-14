const express = require('express');
const {
  placeOrder,
  getOrder,
  listMyOrders,
  listRestaurantOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('customer'), placeOrder);
router.get('/mine', protect, authorize('customer'), listMyOrders);
router.get('/restaurant/:restaurantId', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), listRestaurantOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, authorize('restaurant_owner', 'restaurant_staff', 'admin'), updateOrderStatus);

module.exports = router;
