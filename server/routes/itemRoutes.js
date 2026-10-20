const router = require('express').Router();
const c = require('../controllers/itemController');
const { protect } = require('../middleware/auth');

router.get('/stats', c.publicStats);
router.get('/search', protect, c.search);
router.post('/:type/:id/flag', protect, c.flagItem);

module.exports = router;
