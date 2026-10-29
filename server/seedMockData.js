require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const LostItem = require('./models/LostItem');
const FoundItem = require('./models/FoundItem');
const Claim = require('./models/Claim');
const Notification = require('./models/Notification');
const { scoreMatch } = require('./utils/matcher');

const IMAGES = {
  macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  wallet: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
  backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
  calculator: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=80',
  keys: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
  sunglasses: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
  bottle: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
  jacket: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80',
  ring: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
  racket: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB. Seeding mock data...');

  // 1. Get Categories
  const categories = await Category.find();
  if (!categories.length) {
    console.error('No categories found. Run npm run seed first!');
    process.exit(1);
  }
  const cat = (name) => categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?._id;

  const catElectronics = cat('Electronics') || categories[0]._id;
  const catWallets = cat('Wallets') || categories[1]._id;
  const catKeys = cat('Keys') || categories[2]._id;
  const catBags = cat('Bags') || categories[3]._id;
  const catBooks = cat('Books') || categories[4]._id;
  const catClothing = cat('Clothing') || categories[5]._id;
  const catAccessories = cat('Accessories') || categories[6]._id;
  const catJewellery = cat('Jewellery') || categories[7]._id;
  const catSports = cat('Sports') || categories[9]._id;

  // 2. Create / Update Users
  const userDefs = [
    { name: 'Alice Morgan', email: 'alice@example.com', password: 'password123', phone: '+1 (555) 234-5678', role: 'user' },
    { name: 'Bob Jenkins', email: 'bob@example.com', password: 'password123', phone: '+1 (555) 345-6789', role: 'user' },
    { name: 'Charlie Zhang', email: 'charlie@example.com', password: 'password123', phone: '+1 (555) 456-7890', role: 'user' },
    { name: 'Diana Prince', email: 'diana@example.com', password: 'password123', phone: '+1 (555) 567-8901', role: 'user' },
  ];

  const users = {};
  for (const u of userDefs) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
    }
    users[u.name.split(' ')[0].toLowerCase()] = user;
  }
  const admin = await User.findOne({ role: 'admin' });

  // 3. Clear existing items and claims for clean mock experience
  await Promise.all([
    LostItem.deleteMany({}),
    FoundItem.deleteMany({}),
    Claim.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // 4. Create Lost Items
  const lostList = await LostItem.create([
    {
      reporter: users.alice._id,
      itemName: 'Apple MacBook Air M2 (Space Grey)',
      category: catElectronics,
      description: '13-inch MacBook Air in Space Grey. Has a GitHub Octocat sticker in the top right corner and a Python logo sticker.',
      location: 'Central Library 2nd floor reading hall',
      lostAt: new Date(now - 2 * day),
      image: IMAGES.macbook,
      status: 'matched',
    },
    {
      reporter: users.charlie._id,
      itemName: 'Sony WH-1000XM4 Wireless Headphones',
      category: catElectronics,
      description: 'Matte black over-ear headphones in an original grey zipper case with audio cable inside.',
      location: 'Campus Cafeteria near the coffee stand',
      lostAt: new Date(now - 3 * day),
      image: IMAGES.headphones,
      status: 'matched',
    },
    {
      reporter: users.bob._id,
      itemName: 'Brown Fossil Leather Wallet',
      category: catWallets,
      description: 'Distressed brown leather bi-fold wallet. Contains student card, driver licence and metro transit card.',
      location: 'Student Union Lounge 1st floor',
      lostAt: new Date(now - 1 * day),
      image: IMAGES.wallet,
      status: 'open',
    },
    {
      reporter: users.alice._id,
      itemName: 'North Face Borealis Backpack',
      category: catBags,
      description: 'Grey and black North Face backpack with bungee cords. Inside were chemistry notebooks and a blue pencil case.',
      location: 'Science Building lecture hall 101',
      lostAt: new Date(now - 5 * day),
      image: IMAGES.backpack,
      status: 'matched',
    },
    {
      reporter: users.diana._id,
      itemName: 'Casio fx-991EX Scientific Calculator',
      category: catBooks,
      description: 'Black and white ClassWiz scientific calculator with initials DP scratched on the back cover.',
      location: 'Mathematics Building Room 304',
      lostAt: new Date(now - 10 * day),
      image: IMAGES.calculator,
      status: 'returned',
    },
    {
      reporter: users.charlie._id,
      itemName: 'Subaru Car Key with Blue Carabiner',
      category: catKeys,
      description: 'Key fob with three keys attached to a blue metallic climbing carabiner and a mini LED flashlight.',
      location: 'North Campus Parking Lot B near tree row',
      lostAt: new Date(now - 1 * day),
      image: IMAGES.keys,
      status: 'open',
    },
    {
      reporter: users.bob._id,
      itemName: 'Classic Ray-Ban Aviator Sunglasses',
      category: catAccessories,
      description: 'Gold-framed aviator sunglasses with green G-15 lenses in a brown leather button case.',
      location: 'Sports Ground bleachers',
      lostAt: new Date(now - 7 * day),
      image: IMAGES.sunglasses,
      status: 'closed',
    },
    {
      reporter: users.diana._id,
      itemName: 'Stainless Steel Hydro Flask (Olive Green)',
      category: catAccessories,
      description: '32oz wide-mouth Hydro Flask bottle in Olive Green with black straw lid and some dents on bottom.',
      location: 'Gymnasium locker room entrance',
      lostAt: new Date(now - 4 * day),
      image: IMAGES.bottle,
      status: 'open',
    },
  ]);

  // 5. Create Found Items
  const foundList = await FoundItem.create([
    {
      finder: users.bob._id,
      itemName: 'Space Grey MacBook Laptop',
      category: catElectronics,
      description: 'Apple MacBook laptop found on desk #14 on the second floor. Has tech stickers on the lid.',
      location: 'Central Library 2nd floor',
      foundAt: new Date(now - 1 * day),
      storageLocation: 'Library Help Desk with Assistant Librarian',
      hiddenDetails: 'Login screen user is Alice M. Octocat sticker and Python sticker on lid.',
      image: IMAGES.macbook,
      status: 'available',
    },
    {
      finder: users.diana._id,
      itemName: 'Black Sony Noise-Cancelling Headphones',
      category: catElectronics,
      description: 'Over-ear black Sony headphones found on a corner cafeteria table.',
      location: 'Campus Cafeteria',
      foundAt: new Date(now - 2 * day),
      storageLocation: 'Cafeteria Manager Office Room C-12',
      hiddenDetails: 'Grey zipper case with initials C.Z. written on the zipper pull tag.',
      image: IMAGES.headphones,
      status: 'available',
    },
    {
      finder: users.charlie._id,
      itemName: 'Grey North Face Backpack',
      category: catBags,
      description: 'Sturdy grey backpack with bungee front. Left behind after evening lecture.',
      location: 'Science Building lecture hall 101',
      foundAt: new Date(now - 4 * day),
      storageLocation: 'Hostel Block C Warden Desk with Mr. Sharma',
      hiddenDetails: 'Chemistry notebooks inside with student name Alice Morgan on front page.',
      image: IMAGES.backpack,
      status: 'claimed',
    },
    {
      finder: users.bob._id,
      itemName: 'Casio Scientific Calculator ClassWiz',
      category: catBooks,
      description: 'Found scientific calculator under row 3 desk after linear algebra exam.',
      location: 'Mathematics Building Room 304',
      foundAt: new Date(now - 9 * day),
      storageLocation: 'Handed back directly to owner',
      hiddenDetails: 'DP carved into the plastic sliding protective cover.',
      image: IMAGES.calculator,
      status: 'returned',
      returnedAt: new Date(now - 8 * day),
      returnedTo: users.diana._id,
    },
    {
      finder: users.diana._id,
      itemName: 'Brown Leather Bifold Wallet',
      category: catWallets,
      description: 'Men brown wallet picked up from leather sofa in common room.',
      location: 'Student Union Lounge',
      foundAt: new Date(now - 12 * 60 * 60 * 1000),
      storageLocation: 'Campus Security Office Main Gate booth',
      hiddenDetails: 'Bob Jenkins student ID card and $35 cash inside.',
      image: IMAGES.wallet,
      status: 'available',
    },
    {
      finder: users.alice._id,
      itemName: 'Silver Ring with Floral Pattern',
      category: catJewellery,
      description: 'Intricate engraved silver band ring found near water cooler.',
      location: 'Arts Faculty Ground Floor corridor',
      foundAt: new Date(now - 3 * day),
      storageLocation: 'With finder (Alice) in Room 312 Girls Hostel',
      hiddenDetails: 'Small 925 stamp and an infinity symbol engraved on interior.',
      image: IMAGES.ring,
      status: 'available',
    },
    {
      finder: users.charlie._id,
      itemName: 'Yonex Badminton Racket with Cover',
      category: catSports,
      description: 'Nanoflare badminton racket in black and blue zippered carrying cover.',
      location: 'Indoor Badminton Court 2',
      foundAt: new Date(now - 2 * day),
      storageLocation: 'Sports Complex equipment storage room',
      hiddenDetails: 'Yellow overgrip tape and tension 26 lbs stamped on cone.',
      image: IMAGES.racket,
      status: 'claimed',
    },
    {
      finder: users.bob._id,
      itemName: 'Blue Denim Jacket (Levi Size M)',
      category: catClothing,
      description: 'Levi classic denim trucker jacket left on bench.',
      location: 'Campus Amphitheatre bench',
      foundAt: new Date(now - 6 * day),
      storageLocation: 'Lost & Found storage shelf behind information desk',
      hiddenDetails: 'Small enamel pin of Saturn on the left collar.',
      image: IMAGES.jacket,
      status: 'available',
      flagged: true,
      flagReasons: [
        {
          reason: 'Duplicate listing reported by user',
          by: users.charlie._id,
          at: new Date(now - 1 * day),
        },
      ],
    },
  ]);

  // Helper maps
  const lostMap = Object.fromEntries(lostList.map((l) => [l.itemName, l]));
  const foundMap = Object.fromEntries(foundList.map((f) => [f.itemName, f]));

  // 6. Create Claims (13 claims across all lifecycle states, including competing claims)
  const claims = await Claim.create([
    // --- FOUND ITEM: Grey North Face Backpack (Finder: Charlie) ---
    // Claim 1: Approved (Alice)
    {
      foundItem: foundMap['Grey North Face Backpack']._id,
      lostItem: lostMap['North Face Borealis Backpack']._id,
      claimant: users.alice._id,
      finder: users.charlie._id,
      identifyingDetails: 'The chemistry notebooks have my name Alice Morgan written on the top right. There is also a light blue Muji 0.5 pen in the front pocket.',
      proofNote: 'I lost it right after Professor Miller lecture on Thursday afternoon.',
      matchScore: scoreMatch(lostMap['North Face Borealis Backpack'], foundMap['Grey North Face Backpack']).score,
      status: 'approved',
      reviewNote: 'The name matches the notebook exactly. You can collect it from the hostel block C warden desk.',
      reviewedBy: users.charlie._id,
      reviewedAt: new Date(now - 2 * day),
    },
    // Claim 2: Rejected (Diana - competing claim)
    {
      foundItem: foundMap['Grey North Face Backpack']._id,
      lostItem: null,
      claimant: users.diana._id,
      finder: users.charlie._id,
      identifyingDetails: 'Left my grey backpack in science building with cell biology handouts.',
      proofNote: 'Was sitting in row 4.',
      matchScore: 35,
      status: 'rejected',
      reviewNote: 'The notes inside belong to an organic chemistry student named Alice Morgan, not biology.',
      reviewedBy: users.charlie._id,
      reviewedAt: new Date(now - 3 * day),
    },

    // --- FOUND ITEM: Space Grey MacBook Laptop (Finder: Bob) ---
    // Claim 3: Pending (Alice)
    {
      foundItem: foundMap['Space Grey MacBook Laptop']._id,
      lostItem: lostMap['Apple MacBook Air M2 (Space Grey)']._id,
      claimant: users.alice._id,
      finder: users.bob._id,
      identifyingDetails: '13-inch Space Grey MacBook with an Octocat GitHub sticker on the top right lid and Python sticker. Serial number starts with C02G.',
      proofNote: 'I can unlock it with my password or fingerprint and show original purchase receipt.',
      matchScore: scoreMatch(lostMap['Apple MacBook Air M2 (Space Grey)'], foundMap['Space Grey MacBook Laptop']).score,
      status: 'pending',
    },
    // Claim 4: Rejected (Charlie - competing claim)
    {
      foundItem: foundMap['Space Grey MacBook Laptop']._id,
      lostItem: null,
      claimant: users.charlie._id,
      finder: users.bob._id,
      identifyingDetails: 'I lost a laptop on the second floor reading hall yesterday evening.',
      proofNote: 'Silver Apple laptop with a black case.',
      matchScore: 40,
      status: 'rejected',
      reviewNote: 'This found laptop is Space Grey, not silver, and has distinctive developer stickers.',
      reviewedBy: users.bob._id,
      reviewedAt: new Date(now - 1 * day),
    },

    // --- FOUND ITEM: Black Sony Noise-Cancelling Headphones (Finder: Diana) ---
    // Claim 5: Pending (Charlie)
    {
      foundItem: foundMap['Black Sony Noise-Cancelling Headphones']._id,
      lostItem: lostMap['Sony WH-1000XM4 Wireless Headphones']._id,
      claimant: users.charlie._id,
      finder: users.diana._id,
      identifyingDetails: 'The original grey zipper case has a pull tag with C.Z. written in silver sharpie. Custom Wicked Cushions memory foam earpads are installed.',
      proofNote: 'I was sitting at the cafeteria corner table right before 1 PM.',
      matchScore: scoreMatch(lostMap['Sony WH-1000XM4 Wireless Headphones'], foundMap['Black Sony Noise-Cancelling Headphones']).score,
      status: 'pending',
    },
    // Claim 6: Withdrawn (Bob - competing claim withdrawn)
    {
      foundItem: foundMap['Black Sony Noise-Cancelling Headphones']._id,
      lostItem: null,
      claimant: users.bob._id,
      finder: users.diana._id,
      identifyingDetails: 'Black Sony headphones left on table.',
      proofNote: 'Withdrawing my claim: I found my pair in my gym bag in my car trunk.',
      matchScore: 30,
      status: 'withdrawn',
    },

    // --- FOUND ITEM: Brown Leather Bifold Wallet (Finder: Diana) ---
    // Claim 7: Disputed (Bob)
    {
      foundItem: foundMap['Brown Leather Bifold Wallet']._id,
      lostItem: lostMap['Brown Fossil Leather Wallet']._id,
      claimant: users.bob._id,
      finder: users.diana._id,
      identifyingDetails: 'Contains my Bob Jenkins university student card, driver licence, and transit card.',
      proofNote: 'Left it on the lounge sofa while studying.',
      matchScore: scoreMatch(lostMap['Brown Fossil Leather Wallet'], foundMap['Brown Leather Bifold Wallet']).score,
      status: 'disputed',
      reviewNote: 'Someone else also claimed they lost a brown wallet in the same lounge.',
      disputeReason: 'Finder is holding the wallet because multiple people asked. My student ID with my full name and photo is inside the clear slot.',
      disputedBy: users.bob._id,
    },
    // Claim 8: Rejected (Charlie - competing claim)
    {
      foundItem: foundMap['Brown Leather Bifold Wallet']._id,
      lostItem: null,
      claimant: users.charlie._id,
      finder: users.diana._id,
      identifyingDetails: 'Lost a brown leather wallet in the student union lounge.',
      proofNote: 'Had some cash and loyalty cards.',
      matchScore: 35,
      status: 'rejected',
      reviewNote: 'The student ID and cards inside belong to Bob Jenkins.',
      reviewedBy: users.diana._id,
      reviewedAt: new Date(now - 12 * 60 * 60 * 1000),
    },

    // --- FOUND ITEM: Silver Ring with Floral Pattern (Finder: Alice) ---
    // Claim 9: Pending (Diana)
    {
      foundItem: foundMap['Silver Ring with Floral Pattern']._id,
      lostItem: null,
      claimant: users.diana._id,
      finder: users.alice._id,
      identifyingDetails: 'Sterling silver band with engraved leaf and flower vine pattern. Inside has small 925 hallmark and an infinity symbol.',
      proofNote: 'Took it off to wash hands near the arts faculty water cooler. Heirloom ring from my grandmother.',
      matchScore: 50,
      status: 'pending',
    },

    // --- FOUND ITEM: Yonex Badminton Racket with Cover (Finder: Charlie) ---
    // Claim 10: Approved (Bob)
    {
      foundItem: foundMap['Yonex Badminton Racket with Cover']._id,
      lostItem: null,
      claimant: users.bob._id,
      finder: users.charlie._id,
      identifyingDetails: 'Nanoflare 700 with vibrant yellow overgrip tape. Tension cone has handwritten 26 lbs in black marker.',
      proofNote: 'Played on Court 2 on Tuesday evening with campus club.',
      matchScore: 55,
      status: 'approved',
      reviewNote: 'Yellow grip and tension marking match perfectly. Pickup from sports complex reception.',
      reviewedBy: users.charlie._id,
      reviewedAt: new Date(now - 1 * day),
    },

    // --- FOUND ITEM: Blue Denim Jacket (Levi Size M) (Finder: Bob) ---
    // Claim 11: Disputed (Charlie)
    {
      foundItem: foundMap['Blue Denim Jacket (Levi Size M)']._id,
      lostItem: null,
      claimant: users.charlie._id,
      finder: users.bob._id,
      identifyingDetails: 'Levi trucker jacket in medium. Has a distinctive enamel pin of planet Saturn with golden rings on the left collar lapel.',
      proofNote: 'Left on amphitheatre bench after acoustic music event.',
      matchScore: 50,
      status: 'disputed',
      reviewNote: 'Waiting for verification.',
      disputeReason: 'Finder marked this as flagged and has not responded to arrange collection for 4 days. Need administrator assistance.',
      disputedBy: users.charlie._id,
    },
    // Claim 12: Withdrawn (Alice - competing claim)
    {
      foundItem: foundMap['Blue Denim Jacket (Levi Size M)']._id,
      lostItem: null,
      claimant: users.alice._id,
      finder: users.bob._id,
      identifyingDetails: 'Thought it was my brother denim jacket.',
      proofNote: 'Withdrawing: Brother found his jacket at home.',
      matchScore: 25,
      status: 'withdrawn',
    },

    // --- FOUND ITEM: Casio Scientific Calculator ClassWiz (Finder: Bob) ---
    // Claim 13: Returned (Diana)
    {
      foundItem: foundMap['Casio Scientific Calculator ClassWiz']._id,
      lostItem: lostMap['Casio fx-991EX Scientific Calculator']._id,
      claimant: users.diana._id,
      finder: users.bob._id,
      identifyingDetails: 'My initials DP are scratched on the back plastic sliding cover with a compass point.',
      proofNote: 'Took exam in room 304 on Tuesday morning.',
      matchScore: scoreMatch(lostMap['Casio fx-991EX Scientific Calculator'], foundMap['Casio Scientific Calculator ClassWiz']).score,
      status: 'returned',
      reviewNote: 'Initials confirmed. Handed over at the library.',
      reviewedBy: users.bob._id,
      reviewedAt: new Date(now - 8 * day),
      returnedAt: new Date(now - 8 * day),
    },
  ]);

  // 7. Create Notifications for Claims and Matches
  const backpackClaim = claims.find((c) => c.status === 'approved' && c.claimant.equals(users.alice._id));
  const macbookClaim = claims.find((c) => c.status === 'pending' && c.claimant.equals(users.alice._id));
  const sonyClaim = claims.find((c) => c.status === 'pending' && c.claimant.equals(users.charlie._id));
  const ringClaim = claims.find((c) => c.status === 'pending' && c.claimant.equals(users.diana._id));
  const racketClaim = claims.find((c) => c.status === 'approved' && c.claimant.equals(users.bob._id));

  await Notification.create([
    // Alice
    {
      user: users.alice._id,
      type: 'match',
      message: 'We found 1 possible match for your lost "Apple MacBook Air M2 (Space Grey)".',
      link: `/lost/${lostMap['Apple MacBook Air M2 (Space Grey)']._id}/matches`,
      read: false,
    },
    {
      user: users.alice._id,
      type: 'claim_approved',
      message: 'Charlie Zhang approved your claim for "Grey North Face Backpack".',
      link: `/claims/${backpackClaim._id}`,
      read: false,
    },
    {
      user: users.alice._id,
      type: 'claim_new',
      message: 'Diana Prince submitted a claim for your found "Silver Ring with Floral Pattern".',
      link: `/claims/${ringClaim._id}`,
      read: false,
    },

    // Bob
    {
      user: users.bob._id,
      type: 'claim_new',
      message: 'Alice Morgan submitted a claim for your found "Space Grey MacBook Laptop".',
      link: `/claims/${macbookClaim._id}`,
      read: false,
    },
    {
      user: users.bob._id,
      type: 'claim_approved',
      message: 'Charlie Zhang approved your claim for "Yonex Badminton Racket with Cover".',
      link: `/claims/${racketClaim._id}`,
      read: false,
    },
    {
      user: users.bob._id,
      type: 'returned',
      message: 'You marked "Casio Scientific Calculator ClassWiz" as returned to Diana Prince.',
      link: `/claims`,
      read: true,
    },

    // Charlie
    {
      user: users.charlie._id,
      type: 'match',
      message: 'A newly found "Black Sony Noise-Cancelling Headphones" may be your lost "Sony WH-1000XM4 Wireless Headphones".',
      link: `/lost/${lostMap['Sony WH-1000XM4 Wireless Headphones']._id}/matches`,
      read: false,
    },
    {
      user: users.charlie._id,
      type: 'claim_rejected',
      message: 'Your claim for "Space Grey MacBook Laptop" was not approved by Bob Jenkins.',
      link: `/claims`,
      read: false,
    },

    // Diana
    {
      user: users.diana._id,
      type: 'claim_new',
      message: 'Charlie Zhang sent a claim for your found item "Black Sony Noise-Cancelling Headphones".',
      link: `/claims/${sonyClaim._id}`,
      read: false,
    },
    {
      user: users.diana._id,
      type: 'claim_rejected',
      message: 'Your claim for "Grey North Face Backpack" was not approved by Charlie Zhang.',
      link: `/claims`,
      read: true,
    },
  ]);

  if (admin) {
    await Notification.create([
      {
        user: admin._id,
        type: 'disputed',
        message: 'A claim for "Brown Leather Bifold Wallet" was escalated as a dispute and needs admin review.',
        link: '/admin?tab=claims',
        read: false,
      },
      {
        user: admin._id,
        type: 'disputed',
        message: 'A claim for "Blue Denim Jacket (Levi Size M)" was escalated as a dispute and needs admin review.',
        link: '/admin?tab=claims',
        read: false,
      },
      {
        user: admin._id,
        type: 'flagged',
        message: 'A found listing "Blue Denim Jacket (Levi Size M)" was flagged by users for moderation.',
        link: '/admin?tab=reports&flagged=1',
        read: false,
      },
    ]);
  }

  console.log('✅ Mock data seeded successfully!');
  console.log(`- Users: ${Object.keys(users).length} users (all passwords: password123) + admin`);
  console.log(`- Lost Items: ${lostList.length}`);
  console.log(`- Found Items: ${foundList.length} (including 1 flagged)`);
  console.log(`- Claims: ${claims.length}`);
  console.log(`- Notifications: 6 alerts generated`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
