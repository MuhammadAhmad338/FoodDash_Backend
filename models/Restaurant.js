const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    cuisine: [{ type: String }],
    logoUrl: String,
    coverUrl: String,

    address: {
      line1: String,
      city: String,
      lat: Number,
      lng: Number,
    },

    phone: String,

    // Platform admin must approve before restaurant goes live
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },

    isOpen: { type: Boolean, default: false },

    // Simple operating hours, e.g. { mon: { open: '09:00', close: '22:00' }, ... }
    openingHours: { type: mongoose.Schema.Types.Mixed },

    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Platform commission percentage taken on each order
    commissionRate: { type: Number, default: 15 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
