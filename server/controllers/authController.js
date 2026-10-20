const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  createdAt: u.createdAt,
});

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new HttpError(400, 'An account with this email already exists');

  // role is never taken from the request body: everyone signs up as a normal user
  const user = await User.create({ name, email, password, phone });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Enter your email and password');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'Email or password is incorrect');
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated by an administrator');

  res.json({ token: signToken(user._id), user: publicUser(user) });
});

// GET /api/auth/me
exports.me = (req, res) => res.json({ user: publicUser(req.user) });

// PUT /api/auth/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const user = req.user;

  if (email && email.toLowerCase().trim() !== user.email) {
    const taken = await User.findOne({ email: email.toLowerCase().trim() });
    if (taken) throw new HttpError(400, 'That email is already used by another account');
    user.email = email;
  }
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  res.json({ user: publicUser(user) });
});

// PUT /api/auth/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new HttpError(400, 'Enter your current and new password');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw new HttpError(400, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
