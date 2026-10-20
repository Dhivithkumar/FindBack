const fs = require('fs');
const path = require('path');

// Removes an uploaded image given its public path, e.g. "/uploads/123.jpg"
exports.removeUpload = (publicPath) => {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const file = path.join(__dirname, '..', 'uploads', path.basename(publicPath));
  fs.unlink(file, () => {});
};
