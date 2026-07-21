const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    cuisine: [{ type: String }],
    logoUrl: String,
    coverUrl: String,
    // Image bytes stored directly in MongoDB (no S3) — served back via
    // GET /:id/logo and GET /:id/cover
    logo: {
      data: Buffer,
      contentType: String,
    },
    cover: {
      data: Buffer,
      contentType: String,
    },

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

// Never ship the raw image bytes in list/detail JSON responses — swap them
// for a URL the client can hit directly (<img>/Image.network), same as if
// this were an S3 link.
restaurantSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.logo && ret.logo.data) {
      ret.logoUrl = `/api/restaurants/${ret._id}/logo`;
    }
    if (ret.cover && ret.cover.data) {
      ret.coverUrl = `/api/restaurants/${ret._id}/cover`;
    }
    delete ret.logo;
    delete ret.cover;
    return ret;
  },
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
