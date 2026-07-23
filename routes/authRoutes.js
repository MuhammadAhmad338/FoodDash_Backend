const express = require('express');
const { register, login, googleAuth, getMe, uploadAvatar, getAvatar } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);

router.get('/avatar/:id', getAvatar);
router.post('/avatar', protect, uploadSingleImage('image'), uploadAvatar);

module.exports = router;
