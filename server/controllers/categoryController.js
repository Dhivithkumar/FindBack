const Category = require('../models/Category');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');

exports.list = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort('name').lean();
  res.json({ categories });
});

exports.create = asyncHandler(async (req, res) => {
  const category = await Category.create({ name: req.body.name, description: req.body.description });
  res.status(201).json({ category });
});

exports.update = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  if (req.body.name !== undefined) category.name = req.body.name;
  if (req.body.description !== undefined) category.description = req.body.description;
  await category.save();
  res.json({ category });
});

exports.remove = asyncHandler(async (req, res) => {
  const inUse =
    (await LostItem.countDocuments({ category: req.params.id })) +
    (await FoundItem.countDocuments({ category: req.params.id }));
  if (inUse) throw new HttpError(400, `This category is used by ${inUse} report(s). Move them to another category first`);
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  res.json({ message: 'Category deleted' });
});
