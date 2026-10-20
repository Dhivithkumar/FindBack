const fs = require('fs');

exports.notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found: ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  // A failed request should not leave an orphaned upload behind
  if (req.file) fs.unlink(req.file.path, () => {});

  let status = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Server error';

  if (err.name === 'CastError') { status = 400; message = `Invalid value for ${err.path}`; }
  if (err.code === 11000) { status = 400; message = `${Object.keys(err.keyValue).join(', ')} already exists`; }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  }
  if (err.name === 'MulterError') {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Image must be 5 MB or smaller';
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
};
