const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { notifyAdmins } = require('../utils/notify');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STATUS_SETS = {
  active: { lost: ['open', 'matched'], found: ['available', 'claimed'] },
  returned: { lost: ['returned'], found: ['returned'] },
  all: { lost: ['open', 'matched', 'returned', 'closed'], found: ['available', 'claimed', 'returned'] },
};

/**
 * GET /api/items/search  (Module 4)
 * ?type=all|lost|found &q= &category= &location= &from= &to= &show=active|returned|all
 * &sort=newest|oldest &page=1 &limit=12
 */
exports.search = asyncHandler(async (req, res) => {
  const {
    type = 'all', q = '', category, location = '', from, to,
    show = 'active', sort = 'newest',
  } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const statuses = STATUS_SETS[show] || STATUS_SETS.active;

  const base = { isHidden: false };
  if (q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    base.$or = [{ itemName: rx }, { description: rx }];
  }
  if (category) base.category = category;
  if (location.trim()) base.location = new RegExp(escapeRegex(location.trim()), 'i');

  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  const hasRange = Object.keys(range).length > 0;
  const sortDir = sort === 'oldest' ? 1 : -1;
  const take = page * limit; // enough rows from each collection to build the merged page

  const jobs = [];
  if (type === 'all' || type === 'lost') {
    const filter = { ...base, status: { $in: statuses.lost }, ...(hasRange ? { lostAt: range } : {}) };
    jobs.push(
      Promise.all([
        LostItem.find(filter).select('-flagReasons').populate('category', 'name').populate('reporter', 'name')
          .sort({ createdAt: sortDir }).limit(take).lean(),
        LostItem.countDocuments(filter),
      ]).then(([rows, total]) => ({ rows: rows.map((r) => ({ ...r, type: 'lost', eventDate: r.lostAt })), total }))
    );
  }
  if (type === 'all' || type === 'found') {
    const filter = { ...base, status: { $in: statuses.found }, ...(hasRange ? { foundAt: range } : {}) };
    jobs.push(
      Promise.all([
        FoundItem.find(filter).select('-flagReasons -storageLocation').populate('category', 'name').populate('finder', 'name')
          .sort({ createdAt: sortDir }).limit(take).lean(),
        FoundItem.countDocuments(filter),
      ]).then(([rows, total]) => ({ rows: rows.map((r) => ({ ...r, type: 'found', eventDate: r.foundAt })), total }))
    );
  }

  const results = await Promise.all(jobs);
  const merged = results
    .flatMap((r) => r.rows)
    .sort((a, b) => sortDir * (new Date(a.createdAt) - new Date(b.createdAt)));
  const total = results.reduce((n, r) => n + r.total, 0);

  res.json({
    items: merged.slice((page - 1) * limit, page * limit),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/items/stats  (public numbers for the home page)
exports.publicStats = asyncHandler(async (req, res) => {
  const [lost, found, returned] = await Promise.all([
    LostItem.countDocuments({ isHidden: false }),
    FoundItem.countDocuments({ isHidden: false }),
    FoundItem.countDocuments({ status: 'returned' }),
  ]);
  res.json({ lost, found, returned });
});

// POST /api/items/:type/:id/flag  { reason }
exports.flagItem = asyncHandler(async (req, res) => {
  const Model = req.params.type === 'lost' ? LostItem : req.params.type === 'found' ? FoundItem : null;
  if (!Model) throw new HttpError(400, 'Type must be lost or found');

  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new HttpError(400, 'Tell us what is wrong with this report');

  const item = await Model.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Report not found');
  if (item.flagReasons.some((f) => f.by && f.by.equals(req.user._id))) {
    throw new HttpError(400, 'You have already reported this listing');
  }

  item.flagged = true;
  item.flagReasons.push({ reason: reason.slice(0, 300), by: req.user._id });
  await item.save();
  await notifyAdmins('flagged', `A ${req.params.type} report "${item.itemName}" was flagged: ${reason.slice(0, 80)}`, '/admin?tab=reports');
  res.json({ message: 'Thanks. An administrator will review this report' });
});
