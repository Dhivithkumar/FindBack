const router = require('express').Router();
const c = require('../controllers/foundController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.post('/', upload.single('image'), c.createFound);
router.get('/mine', c.getMyFound);
router.get('/:id', c.getFound);
router.put('/:id', upload.single('image'), c.updateFound);
router.patch('/:id/status', c.updateFoundStatus);
router.delete('/:id', c.deleteFound);

module.exports = router;
