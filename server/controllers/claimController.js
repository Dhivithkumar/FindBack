const Claim = require('../models/Claim');
const FoundItem = require('../models/FoundItem');
const LostItem = require('../models/LostItem');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { scoreMatch } = require('../utils/matcher');
const { notify, notifyAdmins } = require('../utils/notify');

const roleIn = (claim, user) => {
  if (user.role === 'admin') return 'admin';
  if (claim.finder._id ? claim.finder._id.equals(user._id) : claim.finder.equals(user._id)) return 'finder';
  if (claim.claimant._id ? claim.claimant._id.equals(user._id) : claim.claimant.equals(user._id)) return 'claimant';
  return null;
};

// POST /api/claims   (Module 5 & 6)
exports.createClaim = asyncHandler(async (req, res) => {
  const { foundItemId, lostItemId, identifyingDetails, proofNote } = req.body;
  if (!foundItemId) throw new HttpError(400, 'Choose the found item you are claiming');
  if (!identifyingDetails || !identifyingDetails.trim()) {
    throw new HttpError(400, 'Describe details only the owner would know, so the finder can verify your claim');
  }

  const found = await FoundItem.findById(foundItemId);
  if (!found || found.isHidden) throw new HttpError(404, 'Found item not found');
  if (found.finder.equals(req.user._id)) throw new HttpError(400, 'You cannot claim an item you reported as found');
  if (found.status !== 'available') throw new HttpError(400, 'This item is no longer open for claims');

  const existing = await Claim.findOne({
    foundItem: found._id,
    claimant: req.user._id,
    status: { $in: ['pending', 'approved', 'disputed'] },
  });
  if (existing) throw new HttpError(400, 'You already have an active claim for this item');

  let lost = null;
  let matchScore = 0;
  if (lostItemId) {
    lost = await LostItem.findById(lostItemId);
    if (!lost || !lost.reporter.equals(req.user._id)) throw new HttpError(400, 'That lost report is not yours');
    matchScore = scoreMatch(lost, found).score;
  }

  const claim = await Claim.create({
    foundItem: found._id,
    lostItem: lost ? lost._id : null,
    claimant: req.user._id,
    finder: found.finder,
    identifyingDetails,
    proofNote,
    matchScore,
  });

  await notify(found.finder, 'claim_new', `${req.user.name} has claimed "${found.itemName}". Review the claim.`, `/claims/${claim._id}`);
  res.status(201).json({ claim });
});

const listPopulate = [
  { path: 'foundItem', select: 'itemName image status location foundAt' },
  { path: 'lostItem', select: 'itemName' },
  { path: 'claimant', select: 'name' },
  { path: 'finder', select: 'name' },
];

// GET /api/claims/mine
exports.getMyClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ claimant: req.user._id }).populate(listPopulate).sort('-createdAt').lean();
  res.json({ claims });
});

// GET /api/claims/received
exports.getReceivedClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ finder: req.user._id }).populate(listPopulate).sort('-createdAt').lean();
  res.json({ claims });
});

// GET /api/claims/:id
exports.getClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id)
    .populate({ path: 'foundItem', select: '+hiddenDetails', populate: { path: 'category', select: 'name' } })
    .populate({ path: 'lostItem', populate: { path: 'category', select: 'name' } })
    .populate('claimant', 'name email phone')
    .populate('finder', 'name email phone')
    .populate('reviewedBy', 'name role')
    .lean();
  if (!claim) throw new HttpError(404, 'Claim not found');

  const role = roleIn(claim, req.user);
  if (!role) throw new HttpError(403, 'You are not part of this claim');

  const contactsShared = ['approved', 'returned'].includes(claim.status);
  if (role === 'claimant' && claim.foundItem) {
    delete claim.foundItem.hiddenDetails;
    if (!contactsShared) delete claim.foundItem.storageLocation;
  }
  if (role !== 'admin' && !contactsShared) {
    // Contact details are swapped only once the claim is approved
    const strip = (u) => ({ _id: u._id, name: u.name });
    if (role === 'claimant') claim.finder = strip(claim.finder);
    if (role === 'finder') claim.claimant = strip(claim.claimant);
  }

  // Other claims on the same item help the finder compare
  let otherClaims = [];
  if (role !== 'claimant' && claim.foundItem) {
    otherClaims = await Claim.find({ foundItem: claim.foundItem._id, _id: { $ne: claim._id } })
      .select('status claimant createdAt')
      .populate('claimant', 'name')
      .lean();
  }

  res.json({ claim, role, otherClaims });
});

// PATCH /api/claims/:id/review  { decision: 'approve' | 'reject', note }
exports.reviewClaim = asyncHandler(async (req, res) => {
  const { decision, note = '' } = req.body;
  if (!['approve', 'reject'].includes(decision)) throw new HttpError(400, 'Decision must be approve or reject');

  const claim = await Claim.findById(req.params.id);
  if (!claim) throw new HttpError(404, 'Claim not found');
  const role = roleIn(claim, req.user);
  if (role !== 'finder' && role !== 'admin') throw new HttpError(403, 'Only the finder or an administrator can review claims');

  const reviewable = role === 'admin' ? ['pending', 'disputed', 'approved', 'rejected'] : ['pending'];
  if (!reviewable.includes(claim.status)) {
    throw new HttpError(400, claim.status === 'disputed'
      ? 'This claim is disputed. An administrator will decide it'
      : `This claim is already ${claim.status}`);
  }

  const found = await FoundItem.findById(claim.foundItem);
  if (!found) throw new HttpError(404, 'The found item no longer exists');
  if (found.status === 'returned') throw new HttpError(400, 'This item has already been returned');

  claim.reviewNote = note;
  claim.reviewedBy = req.user._id;
  claim.reviewedAt = new Date();

  if (decision === 'approve') {
    claim.status = 'approved';
    found.status = 'claimed';
    await found.save();

    // Only one claim can win: close the rest
    const others = await Claim.find({
      foundItem: found._id,
      _id: { $ne: claim._id },
      status: { $in: ['pending', 'approved', 'disputed'] },
    });
    for (const o of others) {
      o.status = 'rejected';
      o.reviewNote = 'Another claim for this item was approved';
      o.reviewedBy = req.user._id;
      o.reviewedAt = new Date();
      await o.save();
      await notify(o.claimant, 'claim_rejected', `Your claim for "${found.itemName}" was not approved.`, `/claims/${o._id}`);
    }
    await notify(
      claim.claimant,
      'claim_approved',
      `Your claim for "${found.itemName}" was approved. Contact details and pickup location are now visible.`,
      `/claims/${claim._id}`
    );
  } else {
    const wasApproved = claim.status === 'approved';
    claim.status = 'rejected';
    if (wasApproved || found.status === 'claimed') {
      const stillApproved = await Claim.countDocuments({ foundItem: found._id, status: 'approved', _id: { $ne: claim._id } });
      if (!stillApproved) {
        found.status = 'available';
        await found.save();
      }
    }
    await notify(claim.claimant, 'claim_rejected', `Your claim for "${found.itemName}" was rejected.`, `/claims/${claim._id}`);
  }

  if (role === 'admin' && !found.finder.equals(req.user._id)) {
    await notify(found.finder, 'system', `An administrator ${decision === 'approve' ? 'approved' : 'rejected'} a claim on "${found.itemName}".`, `/claims/${claim._id}`);
  }

  await claim.save();
  res.json({ claim });
});

// PATCH /api/claims/:id/dispute  { reason }
exports.disputeClaim = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new HttpError(400, 'Explain why you are disputing this claim');

  const claim = await Claim.findById(req.params.id).populate('foundItem', 'itemName');
  if (!claim) throw new HttpError(404, 'Claim not found');
  const role = roleIn(claim, req.user);
  if (role !== 'claimant' && role !== 'finder') throw new HttpError(403, 'Only the claimant or finder can raise a dispute');
  if (!['pending', 'rejected', 'approved'].includes(claim.status)) {
    throw new HttpError(400, `A ${claim.status} claim cannot be disputed`);
  }

  claim.status = 'disputed';
  claim.disputeReason = reason.slice(0, 500);
  claim.disputedBy = req.user._id;
  await claim.save();

  const other = role === 'claimant' ? claim.finder : claim.claimant;
  const name = claim.foundItem ? claim.foundItem.itemName : 'an item';
  await notify(other, 'disputed', `The claim for "${name}" is now disputed. An administrator will review it.`, `/claims/${claim._id}`);
  await notifyAdmins('disputed', `A claim for "${name}" was disputed and needs a decision.`, `/claims/${claim._id}`);
  res.json({ claim });
});

// PATCH /api/claims/:id/withdraw
exports.withdrawClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id).populate('foundItem', 'itemName');
  if (!claim) throw new HttpError(404, 'Claim not found');
  if (!claim.claimant.equals(req.user._id)) throw new HttpError(403, 'Only the claimant can withdraw a claim');
  if (!['pending', 'disputed'].includes(claim.status)) throw new HttpError(400, `A ${claim.status} claim cannot be withdrawn`);

  claim.status = 'withdrawn';
  await claim.save();
  await notify(claim.finder, 'claim_withdrawn', `${req.user.name} withdrew their claim for "${claim.foundItem?.itemName || 'an item'}".`, `/claims/${claim._id}`);
  res.json({ claim });
});

// PATCH /api/claims/:id/return   (handover completed)
exports.markReturned = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) throw new HttpError(404, 'Claim not found');
  const role = roleIn(claim, req.user);
  if (role !== 'finder' && role !== 'admin') throw new HttpError(403, 'Only the finder or an administrator can confirm the return');
  if (claim.status !== 'approved') throw new HttpError(400, 'Only approved claims can be marked as returned');

  const now = new Date();
  claim.status = 'returned';
  claim.returnedAt = now;
  await claim.save();

  const found = await FoundItem.findByIdAndUpdate(
    claim.foundItem,
    { status: 'returned', returnedAt: now, returnedTo: claim.claimant },
    { new: true }
  );
  if (claim.lostItem) await LostItem.findByIdAndUpdate(claim.lostItem, { status: 'returned' });

  const name = found ? found.itemName : 'your item';
  await notify(claim.claimant, 'returned', `"${name}" has been marked as returned to you. Glad it found its way back.`, `/claims/${claim._id}`);
  if (role === 'admin' && !claim.finder.equals(req.user._id)) {
    await notify(claim.finder, 'returned', `"${name}" was marked as returned to its owner.`, `/claims/${claim._id}`);
  }
  res.json({ claim });
});
