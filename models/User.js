const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    line1: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Google-authenticated users have no password — only required when there's no googleId
    password: {
      type: String,
      required: function requiredUnlessGoogle() {
        return !this.googleId;
      },
      minlength: 6,
      select: false,
    },
    // Set for accounts created/linked via Google Sign-In; null for email/password accounts
    googleId: { type: String, unique: true, sparse: true },
    phone: { type: String, trim: true },

    // customer | restaurant_owner | restaurant_staff | admin
    role: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'restaurant_staff', 'admin'],
      default: 'customer',
    },

    // Only relevant for customers
    addresses: [addressSchema],

    // Only relevant for restaurant_owner / restaurant_staff
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },

    isActive: { type: Boolean, default: true },

    // Profile photo bytes stored directly in MongoDB (no S3) — served back
    // via GET /api/auth/avatar/:id
    avatar: {
      data: Buffer,
      contentType: String,
    },
  },
  { timestamps: true }
);

// Never ship the raw image bytes in JSON responses — swap them for a URL
// the client can hit directly (<img>/Image.network), same as Restaurant/MenuItem.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.avatar && ret.avatar.data) {
      ret.avatarUrl = `/api/auth/avatar/${ret._id}`;
    }
    delete ret.avatar;
    delete ret.password;
    return ret;
  },
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  // Google-only accounts have no password hash to compare against
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
