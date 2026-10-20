const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const HttpError = require('../utils/HttpError');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
  cb(ok ? null : new HttpError(400, 'Photo must be a JPG, PNG, WebP or GIF image'), ok);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
