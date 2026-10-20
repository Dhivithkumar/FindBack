const router = require('express').Router();
const c = require('../controllers/claimController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', c.createClaim);
router.get('/mine', c.getMyClaims);
router.get('/received', c.getReceivedClaims);
router.get('/:id', c.getClaim);
router.patch('/:id/review', c.reviewClaim);
router.patch('/:id/dispute', c.disputeClaim);
router.patch('/:id/withdraw', c.withdrawClaim);
router.patch('/:id/return', c.markReturned);

module.exports = router;
