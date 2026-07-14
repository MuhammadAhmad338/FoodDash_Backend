const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @desc  Customer: create a Stripe PaymentIntent for an order
// @route POST /api/payments/create-intent
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (String(order.customer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized for this order');
  }
  if (order.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Order already paid');
  }

  // Stripe expects the smallest currency unit (cents)
  const amountInCents = Math.round(order.total * 100);

  const intent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    metadata: { orderId: String(order._id), customerId: String(req.user._id) },
  });

  const payment = await Payment.create({
    order: order._id,
    customer: req.user._id,
    amount: order.total,
    stripePaymentIntentId: intent.id,
    stripeClientSecret: intent.client_secret,
    status: 'requires_payment',
  });

  order.payment = payment._id;
  await order.save();

  res.json({ clientSecret: intent.client_secret, paymentId: payment._id });
});

// @desc  Stripe webhook - confirms payment success/failure asynchronously
// @route POST /api/payments/webhook
// NOTE: this route must receive the RAW request body (see server.js), not JSON-parsed
const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400);
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });

    if (payment) {
      payment.status = event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed';
      await payment.save();

      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = payment.status === 'succeeded' ? 'paid' : 'failed';
        await order.save();

        // Notify restaurant dashboard only once payment is confirmed
        if (payment.status === 'succeeded') {
          req.io.to(`restaurant:${order.restaurant}`).emit('order:paid', { orderId: order._id });
        }
      }
    }
  }

  res.json({ received: true });
});

module.exports = { createPaymentIntent, handleWebhook };
