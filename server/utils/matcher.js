/**
 * Lost–Found matching (Module 5)
 *
 * Every lost/found pair gets a score out of 100:
 *   category    35  same category
 *   name        30  word overlap between item names (or lost name found in the found description)
 *   description 20  shared descriptive words (colour, brand, marks...)
 *   location    15  word overlap between last-seen and found locations
 * The score is then reduced when the timing doesn't make sense
 * (found well before it was lost) or the gap is very long.
 */
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'near', 'from', 'this', 'that', 'have', 'has', 'was', 'were', 'are',
  'its', 'item', 'lost', 'found', 'one', 'some', 'very', 'had', 'not', 'but', 'inside', 'outside',
  'into', 'onto', 'off', 'our', 'your', 'my', 'his', 'her', 'their', 'there', 'here', 'also', 'left',
  'kept', 'of', 'in', 'on', 'at', 'to', 'it', 'is', 'an', 'or', 'by', 'a', 'room', 'floor', 'area',
]);

const WEIGHTS = { category: 35, name: 30, description: 20, location: 15 };
const DAY = 24 * 60 * 60 * 1000;
const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD) || 40;

const idOf = (v) => (v && v._id ? v._id.toString() : String(v));

const tokenize = (text = '') => [
  ...new Set(
    String(text)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  ),
];

// Share of the smaller set that appears in the other one
const overlap = (a, b) => {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  return a.filter((w) => setB.has(w)).length / Math.min(a.length, b.length);
};

const jaccard = (a, b) => {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const inter = a.filter((w) => setB.has(w)).length;
  return inter / new Set([...a, ...b]).size;
};

function scoreMatch(lost, found) {
  const sameCategory = idOf(lost.category) === idOf(found.category);

  const lostName = tokenize(lost.itemName);
  const nameScore = Math.max(
    overlap(lostName, tokenize(found.itemName)),
    0.6 * overlap(lostName, tokenize(found.description))
  );
  const descScore = Math.min(1, 2 * jaccard(tokenize(lost.description), tokenize(found.description)));
  const locScore = overlap(tokenize(lost.location), tokenize(found.location));

  let score =
    (sameCategory ? WEIGHTS.category : 0) +
    nameScore * WEIGHTS.name +
    descScore * WEIGHTS.description +
    locScore * WEIGHTS.location;

  let timing = 'consistent';
  const gap = new Date(found.foundAt) - new Date(lost.lostAt);
  if (gap < -DAY) {
    score *= 0.35;
    timing = 'found before it was lost';
  } else if (gap > 60 * DAY) {
    score *= 0.8;
    timing = 'more than 60 days apart';
  }

  return {
    score: Math.round(score),
    breakdown: {
      category: sameCategory,
      name: Math.round(nameScore * 100),
      description: Math.round(descScore * 100),
      location: Math.round(locScore * 100),
      timing,
    },
  };
}

async function findMatchesForLost(lost, limit = 10) {
  const candidates = await FoundItem.find({
    status: 'available',
    isHidden: false,
    finder: { $ne: idOf(lost.reporter) },
  })
    .populate('category', 'name')
    .populate('finder', 'name')
    .lean();

  return candidates
    .map((item) => ({ item, ...scoreMatch(lost, item) }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function findMatchesForFound(found, limit = 20) {
  const candidates = await LostItem.find({
    status: { $in: ['open', 'matched'] },
    isHidden: false,
    reporter: { $ne: idOf(found.finder) },
  }).lean();

  return candidates
    .map((item) => ({ item, ...scoreMatch(item, found) }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { scoreMatch, findMatchesForLost, findMatchesForFound, tokenize, MATCH_THRESHOLD };
