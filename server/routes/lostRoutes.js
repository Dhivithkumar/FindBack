const router = require('express').Router();
const c = require('../controllers/lostController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.post('/', upload.single('image'), c.createLost);
router.get('/mine', c.getMyLost);
router.get('/:id', c.getLost);
router.put('/:id', upload.single('image'), c.updateLost);
router.patch('/:id/status', c.updateLostStatus);
router.delete('/:id', c.deleteLost);
router.get('/:id/matches', c.getMatches);

module.exports = router;
