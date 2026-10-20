const LostItem = require('../models/LostItem');
const Claim = require('../models/Claim');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { findMatchesForLost } = require('../utils/matcher');
const { notify } = require('../utils/notify');
const { removeUpload } = require('../utils/files');

const isOwnerOrAdmin = (item, user) => item.reporter.equals(user._id) || user.role === 'admin';

// POST /api/lost
exports.createLost = asyncHandler(async (req, res) => {
  const { itemName, category, description, location, lostAt } = req.body;
  const lost = await LostItem.create({
    reporter: req.user._id,
    itemName,
    category,
    description,
    location,
    lostAt,
    image: req.file ? `/uploads/${req.file.filename}` : '',
  });

  const matches = await findMatchesForLost(lost);
  if (matches.length) {
    lost.status = 'matched';
    await lost.save();
    await notify(
      req.user._id,
      'match',
      `We found ${matches.length} possible match${matches.length > 1 ? 'es' : ''} for your lost "${lost.itemName}".`,
      `/lost/${lost._id}/matches`
    );
  }
  res.status(201).json({ item: lost, matchCount: matches.length });
});

// GET /api/lost/mine
exports.getMyLost = asyncHandler(async (req, res) => {
  const items = await LostItem.find({ reporter: req.user._id }).populate('category', 'name').sort('-createdAt').lean();
  res.json({ items });
});

// GET /api/lost/:id
exports.getLost = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id)
    .populate('category', 'name')
    .populate('reporter', 'name email phone')
    .lean();
  if (!item) throw new HttpError(404, 'Lost report not found');

  const isOwner = item.reporter._id.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (item.isHidden && !isOwner && !isAdmin) throw new HttpError(404, 'Lost report not found');

  if (!isOwner && !isAdmin) {
    // Other users only see the reporter's name
    item.reporter = { _id: item.reporter._id, name: item.reporter.name };
    delete item.flagReasons;
  }
  res.json({ item, isOwner });
});

// PUT /api/lost/:id
exports.updateLost = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Lost report not found');
  if (!item.reporter.equals(req.user._id)) throw new HttpError(403, 'You can only edit your own reports');
  if (item.status === 'returned') throw new HttpError(400, 'Returned items can no longer be edited');

  ['itemName', 'category', 'description', 'location', 'lostAt'].forEach((f) => {
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

// PATCH /api/lost/:id/status  { status: 'open' | 'closed' }
exports.updateLostStatus = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Lost report not found');
  if (!isOwnerOrAdmin(item, req.user)) throw new HttpError(403, 'You can only update your own reports');

  const { status } = req.body;
  if (!['open', 'closed'].includes(status)) throw new HttpError(400, 'Status must be open or closed');
  if (item.status === 'returned') throw new HttpError(400, 'This item has already been returned');
  item.status = status;
  await item.save();
  res.json({ item });
});

// DELETE /api/lost/:id
exports.deleteLost = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Lost report not found');
  if (!isOwnerOrAdmin(item, req.user)) throw new HttpError(403, 'You can only delete your own reports');

  await Claim.updateMany({ lostItem: item._id }, { lostItem: null });
  removeUpload(item.image);
  await item.deleteOne();
  res.json({ message: 'Lost report deleted' });
});

// GET /api/lost/:id/matches
exports.getMatches = asyncHandler(async (req, res) => {
  const lost = await LostItem.findById(req.params.id).populate('category', 'name');
  if (!lost) throw new HttpError(404, 'Lost report not found');
  if (!isOwnerOrAdmin(lost, req.user)) throw new HttpError(403, 'Only the person who lost this item can see its matches');

  const matches = ['open', 'matched'].includes(lost.status) ? await findMatchesForLost(lost) : [];

  // Keep the status in sync with what we just computed
  const shouldBe = matches.length ? 'matched' : 'open';
  if (['open', 'matched'].includes(lost.status) && lost.status !== shouldBe) {
    lost.status = shouldBe;
    await lost.save();
  }

  const myClaims = await Claim.find({
    claimant: lost.reporter,
    foundItem: { $in: matches.map((m) => m.item._id) },
    status: { $nin: ['withdrawn'] },
  }).select('foundItem status').lean();
  const claimByItem = Object.fromEntries(myClaims.map((c) => [c.foundItem.toString(), c]));

  res.json({
    lost,
    matches: matches.map((m) => ({ ...m, myClaim: claimByItem[m.item._id.toString()] || null })),
  });
});
