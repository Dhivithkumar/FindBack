const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(100).lean();
  res.json({ notifications });
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ count });
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ message: 'Marked as read' });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

exports.remove = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ message: 'Notification deleted' });
});
