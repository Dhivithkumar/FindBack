/* Creates the default categories and the first administrator. Safe to run more than once. */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const User = require('./models/User');

const CATEGORIES = [
  ['Electronics', 'Phones, laptops, chargers, earphones, calculators'],
  ['Wallets & Cards', 'Wallets, ID cards, bank cards, purses'],
  ['Keys', 'House, vehicle, locker and room keys'],
  ['Bags', 'Backpacks, handbags, laptop sleeves, pouches'],
  ['Books & Stationery', 'Books, notebooks, files, pens, instruments'],
  ['Clothing', 'Jackets, sweaters, caps, scarves, shoes'],
  ['Accessories', 'Watches, glasses, umbrellas, bottles'],
  ['Jewellery', 'Rings, chains, earrings, bracelets'],
  ['Documents', 'Certificates, passports, licences, forms'],
  ['Sports Equipment', 'Bats, rackets, balls, gym gear'],
  ['Other', 'Anything that does not fit elsewhere'],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  for (const [name, description] of CATEGORIES) {
    await Category.updateOne({ name }, { $setOnInsert: { name, description } }, { upsert: true });
  }
  console.log(`Categories ready (${CATEGORIES.length})`);

  const email = (process.env.ADMIN_EMAIL || 'admin@findback.local').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    console.log(`Admin already exists: ${email}`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'FindBack Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
