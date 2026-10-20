const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in to continue');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new HttpError(401, 'This account no longer exists');
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated by an administrator');
  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new HttpError(403, 'You do not have permission to do this'));
