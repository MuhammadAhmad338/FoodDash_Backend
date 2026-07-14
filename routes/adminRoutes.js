const express = require('express');
const { getStats, listUsers, setUserActiveStatus, listAllOrders } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Every route here is admin-only
router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id/status', setUserActiveStatus);
router.get('/orders', listAllOrders);

module.exports = router;
