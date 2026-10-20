# FindBack: Lost and Found Management System (MERN)

FindBack helps people report lost items, register found items, and safely return belongings
to their owners. It suits colleges, hostels, libraries, offices and public places.

Stack: **MongoDB, Express, React (Vite), Node.js**, with JWT authentication and Multer image uploads.

## Quick start

Requirements: Node.js 18+ and MongoDB (local `mongod` or a free MongoDB Atlas cluster).

```bash
# 1. API
cd server
cp .env.example .env          # set MONGO_URI and JWT_SECRET
npm install
npm run seed                  # creates item categories + the first admin account
npm run dev                   # http://localhost:5000

# 2. Web app (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173
```

Log in with the admin credentials from `.env` (default `admin@findback.local` / `admin123`;
change these before deploying). Register a couple of normal users to try the full flow.

### Try the whole flow in five minutes
1. User A reports a **lost** "Black HP laptop bag" at "Central library".
2. User B reports a **found** "Laptop bag", same category, found at "Library reading hall",
   with private details such as "red keychain, charger inside".
3. User A gets a notification, opens **See matches**, and claims the item, describing the keychain.
4. User B opens **Claims → On items I found**, compares the claim with the private details, and approves it.
5. Both now see each other's contact details and the pickup location. User B clicks **Confirm item returned**;
   the found item, the claim and User A's lost report all become *Returned*.

## How each module is implemented

| Module | Server | Client |
|---|---|---|
| 1. Registration & login | `authController` (bcrypt hashing, JWT), `User` model with `user`/`admin` roles | `Login`, `Register`, `Profile`, `AuthContext`, `ProtectedRoute` |
| 2. Lost item reporting | `lostController`, `LostItem` model, Multer upload | `ReportItem` (type = lost), `Dashboard` |
| 3. Found item reporting | `foundController`, `FoundItem` model (storage location + private details) | `ReportItem` (type = found), `ItemDetail` |
| 4. Search & filter | `GET /api/items/search` (keyword, category, location, date range, status, newest/oldest, paging) | `Browse` (filters kept in the URL) |
| 5. Lost–found matching | `utils/matcher.js` scoring, run on every new report | `Matches` (ranked list with score breakdown) |
| 6. Claim verification & return | `claimController` (claim, approve/reject, dispute, withdraw, return) | `ItemDetail` claim form, `Claims`, `ClaimDetail` |
| 7. Notifications | `Notification` model, `utils/notify.js` | `Notifications`, unread badge polled every 30 s |
| 8. Admin dashboard | `adminController` (stats, moderation, disputes, users) + category CRUD | `admin/AdminDashboard` (Overview, Reports, Claims, Users, Categories) |

### The matching score (Module 5)
Each lost/found pair gets a score out of 100:

| Signal | Weight | How |
|---|---|---|
| Category | 35 | Same category |
| Item name | 30 | Word overlap between names (or the lost name appearing in the found description) |
| Description | 20 | Shared descriptive words (colour, brand, marks) |
| Location | 15 | Word overlap between last-seen and found locations |

Common filler words are ignored. The score is cut sharply if the item was "found" more than a day
before it was lost, and slightly if the dates are over 60 days apart. Pairs scoring at least
`MATCH_THRESHOLD` (default 40) are shown as possible matches and trigger notifications.

### Keeping claims honest (Module 6)
* The finder records **private details** that are never sent to other users by the API.
* A claimant must describe identifying details; the finder sees both side by side.
* Contact details and the storage location are revealed only after approval.
* Approving one claim automatically rejects the others on that item.
* Either side can raise a **dispute**; administrators decide disputed claims.
* Users can flag suspicious listings; administrators can clear flags, hide or delete reports, and deactivate accounts.

## Project structure

```
findback/
├── server/
│   ├── server.js                 Express app, routes, static uploads
│   ├── seed.js                   Default categories + first admin
│   ├── config/db.js
│   ├── models/                   User, Category, LostItem, FoundItem, Claim, Notification
│   ├── controllers/              auth, category, lost, found, item (search), claim, notification, admin
│   ├── routes/
│   ├── middleware/               auth (protect/authorize), upload (Multer), error handler
│   ├── utils/                    matcher, notify, asyncHandler, HttpError, files
│   └── uploads/                  Uploaded photos (git-ignored)
└── client/
    ├── vite.config.js            Proxies /api and /uploads to :5000 in development
    └── src/
        ├── api.js                Axios instance with JWT header
        ├── context/AuthContext.jsx
        ├── components/           Navbar, ItemTag, StatusBadge, Notice, Loading, ProtectedRoute
        ├── pages/                Home, Login, Register, Dashboard, ReportItem, Browse, ItemDetail,
        │                         Matches, Claims, ClaimDetail, Notifications, Profile
        ├── pages/admin/AdminDashboard.jsx
        └── utils/format.js
```

## API reference

All routes except register, login, categories list and public stats need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in, returns JWT |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update name, email, phone |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/categories` | List categories |
| POST/PUT/DELETE | `/api/categories[/:id]` | Manage categories (admin) |
| POST | `/api/lost` | Report lost item (multipart, field `image`) |
| GET | `/api/lost/mine` | My lost reports |
| GET/PUT/DELETE | `/api/lost/:id` | View, edit, delete |
| PATCH | `/api/lost/:id/status` | `open` or `closed` |
| GET | `/api/lost/:id/matches` | Ranked possible matches |
| POST | `/api/found` | Report found item (multipart) |
| GET | `/api/found/mine` | My found items with pending-claim counts |
| GET/PUT/DELETE | `/api/found/:id` | View, edit, delete |
| PATCH | `/api/found/:id/status` | `available` or `returned` (hand-over outside a claim) |
| GET | `/api/items/search` | `type, q, category, location, from, to, show, sort, page, limit` |
| GET | `/api/items/stats` | Public totals |
| POST | `/api/items/:type/:id/flag` | Flag a listing |
| POST | `/api/claims` | Claim a found item |
| GET | `/api/claims/mine`, `/api/claims/received` | Claims I made / claims on my items |
| GET | `/api/claims/:id` | Claim with role-based visibility |
| PATCH | `/api/claims/:id/review` | `{ decision: approve \| reject, note }` |
| PATCH | `/api/claims/:id/dispute` | `{ reason }` |
| PATCH | `/api/claims/:id/withdraw` | Claimant withdraws |
| PATCH | `/api/claims/:id/return` | Confirm hand-over |
| GET | `/api/notifications`, `/api/notifications/unread-count` | In-app notifications |
| PATCH | `/api/notifications/:id/read`, `/api/notifications/read-all` | Mark read |
| GET | `/api/admin/stats` | Totals, by-category and monthly figures |
| GET | `/api/admin/reports` | All reports, filter by flagged/hidden |
| PATCH/DELETE | `/api/admin/reports/:type/:id` | Clear flags, hide/unhide, delete |
| GET | `/api/admin/claims?status=` | Claims, e.g. disputed |
| GET/PATCH | `/api/admin/users[/:id]` | List users, change role, (de)activate |

## Deploying

* Build the client with `npm run build` in `client/`. Setting `NODE_ENV=production` on the server makes
  Express serve `client/dist`, so one Node process hosts both.
* Or host the client separately (Vercel/Netlify) and set `VITE_API_URL` to the API address,
  and `CLIENT_URL` on the server for CORS.
* Uploaded photos are stored on disk in `server/uploads`. On hosts with temporary disks (Render, Railway),
  switch `middleware/upload.js` to a cloud store such as Cloudinary or S3.

## Ideas for version 2
Email notifications (Nodemailer) alongside the in-app ones, QR-code labels for items stored at a desk,
real-time updates with Socket.IO, and MongoDB text indexes or Atlas Search for larger datasets.
