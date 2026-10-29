const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

// Removes an uploaded image given its public path or Cloudinary URL
exports.removeUpload = async (imagePath) => {
  if (!imagePath) return;

  // Local storage cleanup
  if (imagePath.startsWith('/uploads/')) {
    const file = path.join(__dirname, '..', 'uploads', path.basename(imagePath));
    fs.unlink(file, () => {});
    return;
  }

  // Cloudinary cleanup
  if (imagePath.includes('cloudinary.com')) {
    try {
      const parts = imagePath.split('/upload/');
      if (parts.length > 1) {
        let publicIdWithExt = parts[1].replace(/^v\d+\//, '');
        const lastDotIndex = publicIdWithExt.lastIndexOf('.');
        const publicId = lastDotIndex !== -1 ? publicIdWithExt.substring(0, lastDotIndex) : publicIdWithExt;
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err.message);
    }
  }
};
