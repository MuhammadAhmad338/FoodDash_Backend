const express = require('express');
const {
  register,
  login,
  googleAuth,
  getMe,
  uploadAvatar,
  getAvatar,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);

router.get('/avatar/:id', getAvatar);
router.post('/avatar', protect, uploadSingleImage('image'), uploadAvatar);

router.get('/addresses', protect, listAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

module.exports = router;
