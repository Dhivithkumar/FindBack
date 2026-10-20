const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/stats', c.stats);
router.get('/reports', c.reports);
router.patch('/reports/:type/:id', c.moderateReport);
router.delete('/reports/:type/:id', c.deleteReport);
router.get('/claims', c.claims);
router.get('/users', c.users);
router.patch('/users/:id', c.updateUser);

module.exports = router;
