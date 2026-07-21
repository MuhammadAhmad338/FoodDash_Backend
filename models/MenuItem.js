const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: String,
    // Image bytes stored directly in MongoDB (no S3) — served back via
    // GET /:restaurantId/menu/:itemId/image
    image: {
      data: Buffer,
      contentType: String,
    },
    category: { type: String, trim: true, default: 'General' },

    isAvailable: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: false },

    // Optional add-ons / customizations, e.g. [{ name: 'Extra cheese', price: 1.5 }]
    addOns: [
      {
        name: String,
        price: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
