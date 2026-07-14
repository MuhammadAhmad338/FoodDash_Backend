const express = require('express');
const { createPaymentIntent } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/create-intent', protect, authorize('customer'), createPaymentIntent);

// NOTE: the Stripe webhook route (POST /api/payments/webhook) is intentionally
// NOT defined here. It's registered directly in server.js, before express.json(),
// because Stripe's signature verification requires the raw request body.

module.exports = router;
