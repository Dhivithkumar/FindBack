const router = require('express').Router();
const c = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.patch('/read-all', c.markAllRead);
router.patch('/:id/read', c.markRead);
router.delete('/:id', c.remove);

module.exports = router;
