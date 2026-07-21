const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — MongoDB documents cap at 16MB total

// Keeps the file in memory as a Buffer (req.file.buffer) instead of writing
// it to disk, since we're storing the bytes straight into MongoDB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed'));
    }
    cb(null, true);
  },
});

// Wraps upload.single() so multer errors (bad file type, too large, etc.)
// come back as a 400 through the normal error handler instead of a 500.
const uploadSingleImage = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      res.status(400);
      return next(err);
    }
    next();
  });
};

module.exports = { uploadSingleImage };
