const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const lostItemSchema = new mongoose.Schema(
  {
    reporter: { type: ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: [true, 'Item name is required'], trim: true, maxlength: 100 },
    category: { type: ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 1000 },
    location: { type: String, required: [true, 'Last seen location is required'], trim: true, maxlength: 150 },
    lostAt: { type: Date, required: [true, 'Date and time lost is required'] },
    image: { type: String, default: '' },
    // open -> matched (possible matches exist) -> returned | closed (owner gave up / found it themselves)
    status: { type: String, enum: ['open', 'matched', 'returned', 'closed'], default: 'open' },
    flagged: { type: Boolean, default: false },
    flagReasons: [{ reason: String, by: { type: ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

lostItemSchema.index({ status: 1, createdAt: -1 });
lostItemSchema.index({ reporter: 1 });

module.exports = mongoose.model('LostItem', lostItemSchema);
