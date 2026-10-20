const mongoose = require('mongoose');
const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { notify } = require('../utils/notify');
const { removeUpload } = require('../utils/files');

const modelFor = (type) => {
  if (type === 'lost') return LostItem;
  if (type === 'found') return FoundItem;
  throw new HttpError(400, 'Type must be lost or found');
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/stats
exports.stats = asyncHandler(async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthly = (Model, match = {}, dateField = '$createdAt') =>
    Model.aggregate([
      { $match: { ...match, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: dateField } }, count: { $sum: 1 } } },
    ]);

  const [
    lost, found, lostOpen, lostWithMatches, matched, returned, available,
    claimsPending, claimsDisputed, users, flaggedLost, flaggedFound,
    lostByCat, foundByCat, categories, lostMonthly, foundMonthly, returnedMonthly,
  ] = await Promise.all([
    LostItem.countDocuments(),
    FoundItem.countDocuments(),
    LostItem.countDocuments({ status: 'open' }),
    LostItem.countDocuments({ status: 'matched' }),
    Claim.countDocuments({ status: { $in: ['approved', 'returned'] } }),
    FoundItem.countDocuments({ status: 'returned' }),
    FoundItem.countDocuments({ status: 'available' }),
    Claim.countDocuments({ status: 'pending' }),
    Claim.countDocuments({ status: 'disputed' }),
    User.countDocuments(),
    LostItem.countDocuments({ flagged: true }),
    FoundItem.countDocuments({ flagged: true }),
    LostItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    FoundItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Category.find().lean(),
    monthly(LostItem),
    monthly(FoundItem),
    FoundItem.aggregate([
      { $match: { status: 'returned', returnedAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$returnedAt' } }, count: { $sum: 1 } } },
    ]),
  ]);

  const byCategory = categories
    .map((c) => ({
      name: c.name,
      lost: lostByCat.find((x) => String(x._id) === String(c._id))?.count || 0,
      found: foundByCat.find((x) => String(x._id) === String(c._id))?.count || 0,
    }))
    .sort((a, b) => b.lost + b.found - (a.lost + a.found));

  const months = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const pick = (arr) => arr.find((x) => x._id === key)?.count || 0;
    months.push({ month: key, lost: pick(lostMonthly), found: pick(foundMonthly), returned: pick(returnedMonthly) });
  }

  res.json({
    totals: {
      lost, found, lostOpen, lostWithMatches, matched, returned, available,
      claimsPending, claimsDisputed, users, flagged: flaggedLost + flaggedFound,
      returnRate: found ? Math.round((returned / found) * 100) : 0,
    },
    byCategory,
    months,
  });
});

// GET /api/admin/reports?type=lost|found&flagged=true&hidden=true&q=&page=
exports.reports = asyncHandler(async (req, res) => {
  const { type = 'lost', flagged, hidden, q = '', status } = req.query;
  const Model = modelFor(type);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;

  const filter = {};
  if (flagged === 'true') filter.flagged = true;
  if (hidden === 'true') filter.isHidden = true;
  if (status) filter.status = status;
  if (q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ itemName: rx }, { description: rx }, { location: rx }];
  }

  const ownerField = type === 'lost' ? 'reporter' : 'finder';
  const [items, total] = await Promise.all([
    Model.find(filter)
      .populate('category', 'name')
      .populate(ownerField, 'name email')
      .populate('flagReasons.by', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ]);
  res.json({ items: items.map((i) => ({ ...i, type, owner: i[ownerField] })), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// PATCH /api/admin/reports/:type/:id  { flagged?, isHidden? }
exports.moderateReport = asyncHandler(async (req, res) => {
  const Model = modelFor(req.params.type);
  const item = await Model.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Report not found');

  const owner = req.params.type === 'lost' ? item.reporter : item.finder;
  if (req.body.flagged === false) {
    item.flagged = false;
    item.flagReasons = [];
  }
  if (typeof req.body.isHidden === 'boolean' && req.body.isHidden !== item.isHidden) {
    item.isHidden = req.body.isHidden;
    await notify(
      owner,
      'system',
      item.isHidden
        ? `Your report "${item.itemName}" was hidden by an administrator.${req.body.note ? ` Reason: ${req.body.note}` : ''}`
        : `Your report "${item.itemName}" is visible again.`,
      `/items/${req.params.type}/${item._id}`
    );
  }
  await item.save();
  res.json({ item });
});

// DELETE /api/admin/reports/:type/:id
exports.deleteReport = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const Model = modelFor(type);
  const item = await Model.findById(id);
  if (!item) throw new HttpError(404, 'Report not found');

  if (type === 'found') await Claim.deleteMany({ foundItem: item._id });
  else await Claim.updateMany({ lostItem: item._id }, { lostItem: null });

  const owner = type === 'lost' ? item.reporter : item.finder;
  await notify(owner, 'system', `Your ${type} report "${item.itemName}" was removed by an administrator.`);
  removeUpload(item.image);
  await item.deleteOne();
  res.json({ message: 'Report deleted' });
});

// GET /api/admin/claims?status=disputed
exports.claims = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const claims = await Claim.find(filter)
    .populate('foundItem', 'itemName image status')
    .populate('claimant', 'name email')
    .populate('finder', 'name email')
    .sort('-updatedAt')
    .limit(200)
    .lean();
  res.json({ claims });
});

// GET /api/admin/users?q=
exports.users = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }] } : {};
  const users = await User.find(filter).sort('-createdAt').limit(200).lean();

  const ids = users.map((u) => u._id);
  const [lostCounts, foundCounts] = await Promise.all([
    LostItem.aggregate([{ $match: { reporter: { $in: ids } } }, { $group: { _id: '$reporter', n: { $sum: 1 } } }]),
    FoundItem.aggregate([{ $match: { finder: { $in: ids } } }, { $group: { _id: '$finder', n: { $sum: 1 } } }]),
  ]);
  const count = (arr, id) => arr.find((x) => x._id.equals(id))?.n || 0;
  res.json({ users: users.map((u) => ({ ...u, lostCount: count(lostCounts, u._id), foundCount: count(foundCounts, u._id) })) });
});

// PATCH /api/admin/users/:id  { role?, isActive? }
exports.updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid user id');
  if (req.user._id.equals(req.params.id)) throw new HttpError(400, 'You cannot change your own role or status');

  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (req.body.role !== undefined) {
    if (!['user', 'admin'].includes(req.body.role)) throw new HttpError(400, 'Role must be user or admin');
    user.role = req.body.role;
  }
  if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;
  await user.save();
  res.json({ user });
});
