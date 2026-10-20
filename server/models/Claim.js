const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const claimSchema = new mongoose.Schema(
  {
    foundItem: { type: ObjectId, ref: 'FoundItem', required: true },
    lostItem: { type: ObjectId, ref: 'LostItem', default: null },
    claimant: { type: ObjectId, ref: 'User', required: true },
    finder: { type: ObjectId, ref: 'User', required: true },
    identifyingDetails: {
      type: String,
      required: [true, 'Describe details only the owner would know'],
      trim: true,
      maxlength: 1000,
    },
    proofNote: { type: String, trim: true, maxlength: 500, default: '' },
    matchScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disputed', 'returned', 'withdrawn'],
      default: 'pending',
    },
    reviewNote: { type: String, trim: true, default: '' },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    disputeReason: { type: String, trim: true, default: '' },
    disputedBy: { type: ObjectId, ref: 'User' },
    returnedAt: { type: Date },
  },
  { timestamps: true }
);

claimSchema.index({ foundItem: 1, status: 1 });

module.exports = mongoose.model('Claim', claimSchema);
