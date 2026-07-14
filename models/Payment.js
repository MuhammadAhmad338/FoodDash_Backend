const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },

    provider: { type: String, default: 'stripe' },
    stripePaymentIntentId: { type: String },
    stripeClientSecret: { type: String },

    status: {
      type: String,
      enum: ['requires_payment', 'succeeded', 'failed', 'refunded'],
      default: 'requires_payment',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
