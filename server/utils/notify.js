const Notification = require('../models/Notification');
const User = require('../models/User');

exports.notify = (user, type, message, link = '') =>
  Notification.create({ user, type, message, link });

exports.notifyAdmins = async (type, message, link = '') => {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (!admins.length) return;
  await Notification.insertMany(admins.map((a) => ({ user: a._id, type, message, link })));
};
