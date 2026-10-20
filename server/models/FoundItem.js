const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const foundItemSchema = new mongoose.Schema(
  {
    finder: { type: ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: [true, 'Item name is required'], trim: true, maxlength: 100 },
    category: { type: ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 1000 },
    location: { type: String, required: [true, 'Location found is required'], trim: true, maxlength: 150 },
    foundAt: { type: Date, required: [true, 'Date found is required'] },
    image: { type: String, default: '' },
    storageLocation: {
      type: String,
      required: [true, 'Please say where the item is being kept'],
      trim: true,
      maxlength: 200,
    },
    // Private details (serial number, wallpaper, contents...) used only to verify claims
    hiddenDetails: { type: String, trim: true, maxlength: 1000, default: '', select: false },
    // available -> claimed (claim approved, waiting for handover) -> returned
    status: { type: String, enum: ['available', 'claimed', 'returned'], default: 'available' },
    returnedAt: { type: Date },
    returnedTo: { type: ObjectId, ref: 'User' },
    flagged: { type: Boolean, default: false },
    flagReasons: [{ reason: String, by: { type: ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

foundItemSchema.index({ status: 1, createdAt: -1 });
foundItemSchema.index({ finder: 1 });

module.exports = mongoose.model('FoundItem', foundItemSchema);
