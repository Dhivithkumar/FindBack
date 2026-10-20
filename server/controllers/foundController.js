const FoundItem = require('../models/FoundItem');
const LostItem = require('../models/LostItem');
const Claim = require('../models/Claim');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { findMatchesForFound } = require('../utils/matcher');
const { notify } = require('../utils/notify');
const { removeUpload } = require('../utils/files');

const isOwnerOrAdmin = (item, user) => item.finder.equals(user._id) || user.role === 'admin';

// POST /api/found
exports.createFound = asyncHandler(async (req, res) => {
  const { itemName, category, description, location, foundAt, storageLocation, hiddenDetails } = req.body;
  const found = await FoundItem.create({
    finder: req.user._id,
    itemName,
    category,
    description,
    location,
    foundAt,
    storageLocation,
    hiddenDetails,
    image: req.file ? `/uploads/${req.file.filename}` : '',
  });

  // Tell everyone whose lost report looks like this item
  const matches = await findMatchesForFound(found);
  for (const { item: lost } of matches) {
    if (lost.status === 'open') await LostItem.updateOne({ _id: lost._id }, { status: 'matched' });
    await notify(
      lost.reporter,
      'match',
      `A newly found "${found.itemName}" may be your lost "${lost.itemName}".`,
      `/lost/${lost._id}/matches`
    );
  }

  res.status(201).json({ item: found, matchCount: matches.length });
});

// GET /api/found/mine
exports.getMyFound = asyncHandler(async (req, res) => {
  const items = await FoundItem.find({ finder: req.user._id })
    .select('+hiddenDetails')
    .populate('category', 'name')
    .sort('-createdAt')
    .lean();

  const pending = await Claim.aggregate([
    { $match: { finder: req.user._id, status: { $in: ['pending', 'disputed'] } } },
    { $group: { _id: '$foundItem', count: { $sum: 1 } } },
  ]);
  const pendingByItem = Object.fromEntries(pending.map((p) => [p._id.toString(), p.count]));
  res.json({ items: items.map((i) => ({ ...i, pendingClaims: pendingByItem[i._id.toString()] || 0 })) });
});

// GET /api/found/:id
exports.getFound = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id)
    .select('+hiddenDetails')
    .populate('category', 'name')
    .populate('finder', 'name email phone')
    .populate('returnedTo', 'name')
    .lean();
  if (!item) throw new HttpError(404, 'Found report not found');

  const isOwner = item.finder._id.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (item.isHidden && !isOwner && !isAdmin) throw new HttpError(404, 'Found report not found');

  const myClaim = await Claim.findOne({
    foundItem: item._id,
    claimant: req.user._id,
    status: { $ne: 'withdrawn' },
  })
    .sort('-createdAt')
    .lean();

  let claimCount = 0;
  if (isOwner || isAdmin) {
    claimCount = await Claim.countDocuments({ foundItem: item._id, status: { $in: ['pending', 'disputed'] } });
  } else {
    // Private details are never sent to other users
    delete item.hiddenDetails;
    delete item.flagReasons;
    item.finder = { _id: item.finder._id, name: item.finder.name };
    // The storage location is only revealed to the claimant once their claim is approved
    if (!myClaim || !['approved', 'returned'].includes(myClaim.status)) delete item.storageLocation;
  }

  res.json({ item, isOwner, myClaim, claimCount });
});

// PUT /api/found/:id
exports.updateFound = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Found report not found');
  if (!item.finder.equals(req.user._id)) throw new HttpError(403, 'You can only edit your own reports');
  if (item.status === 'returned') throw new HttpError(400, 'Returned items can no longer be edited');

  ['itemName', 'category', 'description', 'location', 'foundAt', 'storageLocation', 'hiddenDetails'].forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  if (req.file) {
    removeUpload(item.image);
    item.image = `/uploads/${req.file.filename}`;
  } else if (req.body.removeImage === 'true') {
    removeUpload(item.image);
    item.image = '';
  }
  await item.save();
  res.json({ item });
});

// PATCH /api/found/:id/status  { status: 'available' | 'returned' }
// For hand-overs that happen outside the claim process (e.g. the owner turned up at the desk)
exports.updateFoundStatus = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Found report not found');
  if (!isOwnerOrAdmin(item, req.user)) throw new HttpError(403, 'Only the finder or an administrator can do this');

  const { status } = req.body;
  if (!['available', 'returned'].includes(status)) throw new HttpError(400, 'Status must be available or returned');

  if (status === 'returned') {
    const approved = await Claim.findOne({ foundItem: item._id, status: 'approved' });
    if (approved) {
      throw new HttpError(400, 'This item has an approved claim. Complete the return from the claim page instead');
    }
    item.status = 'returned';
    item.returnedAt = new Date();
    await Claim.updateMany(
      { foundItem: item._id, status: { $in: ['pending', 'disputed'] } },
      { status: 'rejected', reviewNote: 'Item was returned to its owner outside FindBack', reviewedAt: new Date() }
    );
  } else {
    const active = await Claim.countDocuments({ foundItem: item._id, status: 'approved' });
    if (active) throw new HttpError(400, 'This item has an approved claim. Reject it first from the claim page');
    item.status = 'available';
    item.returnedAt = undefined;
    item.returnedTo = undefined;
  }
  await item.save();
  res.json({ item });
});

// DELETE /api/found/:id
exports.deleteFound = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Found report not found');
  if (!isOwnerOrAdmin(item, req.user)) throw new HttpError(403, 'You can only delete your own reports');

  const claims = await Claim.find({ foundItem: item._id, status: { $in: ['pending', 'approved', 'disputed'] } });
  for (const c of claims) {
    await notify(c.claimant, 'claim_rejected', `The found report "${item.itemName}" you claimed was removed.`, '/claims');
  }
  await Claim.deleteMany({ foundItem: item._id });
  removeUpload(item.image);
  await item.deleteOne();
  res.json({ message: 'Found report deleted' });
});
