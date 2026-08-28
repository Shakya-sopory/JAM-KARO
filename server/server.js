require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const https = require('https');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// JWT signing secret (override in server/.env for production)
const JWT_SECRET = process.env.JWT_SECRET || 'jam-karo-dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

// --- Postgres (Neon) connection pool ---
// Neon and most hosted Postgres require SSL. rejectUnauthorized:false keeps
// this working on free tiers without shipping a CA cert.
if (!process.env.DATABASE_URL) {
  console.error('⚠️  DATABASE_URL is not set. Add your Neon connection string to server/.env');
}
// Enable SSL for hosted Postgres (Neon etc.); skip it for a local dev database.
const isLocalDb = /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL || '');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false }
});

// Issue a signed JWT for an authenticated user
function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.user_type || user.userType },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Middleware: require a valid Bearer JWT and attach the decoded payload to req.user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = decoded; // { id, email, userType, iat, exp }
    next();
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Programmatically create uploads directory
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Unique file name prefixing timestamp
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage: storage });

// --- Postgres schema bootstrap (no pre-seeded dummy data) ---
// Type notes vs the old SQLite schema:
//   - INTEGER PRIMARY KEY AUTOINCREMENT  ->  SERIAL PRIMARY KEY
//   - TEXT stays TEXT (Postgres has a real TEXT type)
//   - UNIQUE(a, b) inline table constraint syntax is identical
//   - date/time columns stay TEXT: the app stores free-form strings
//     like '8:00 PM', not real dates
//   - joint_profiles.members / .genres stay TEXT holding JSON strings
//     (code still does JSON.stringify / JSON.parse around them)
//   - notifications.read_status stays INTEGER 0/1 (frontend compares === 0)
async function initializeTables() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      user_type TEXT NOT NULL,        -- 'musician', 'hirer'
      name TEXT,
      neighborhood TEXT,
      role TEXT,                      -- Instrument played or 'Vocalist'
      skill_level TEXT,               -- 'Learning', 'Intermediate', 'Professional'
      genres TEXT,                    -- Comma-separated genres
      gear TEXT,
      bio TEXT,
      avatar TEXT,
      video_url TEXT,                 -- Audition reel path
      distance TEXT DEFAULT '1.2 km'
    );

    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER,
      target_id INTEGER,
      status TEXT,                    -- 'liked', 'skipped'
      UNIQUE (requester_id, target_id)
    );

    CREATE TABLE IF NOT EXISTS joint_profiles (
      id SERIAL PRIMARY KEY,
      band_name TEXT NOT NULL,
      members TEXT NOT NULL,          -- JSON string of member array
      genres TEXT NOT NULL,           -- JSON string of genres array
      rate TEXT,
      status TEXT,
      jams_count INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS gigs (
      id SERIAL PRIMARY KEY,
      venue TEXT NOT NULL,
      event TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      pay TEXT NOT NULL,
      status TEXT NOT NULL,           -- 'Open', 'Confirmed', ...
      contract_details TEXT,
      hirer TEXT
    );

    CREATE TABLE IF NOT EXISTS gear_rentals (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      contact TEXT NOT NULL,
      status TEXT DEFAULT 'Available' -- 'Available', 'Rented'
    );

    CREATE TABLE IF NOT EXISTS community_messages (
      id SERIAL PRIMARY KEY,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      user_role TEXT DEFAULT 'Learner',
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jam_sessions (
      id SERIAL PRIMARY KEY,
      cafe_name TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      entry_fee TEXT NOT NULL,
      slots_total INTEGER NOT NULL,
      slots_left INTEGER NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS private_messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      read_status INTEGER DEFAULT 0,  -- 0 for Unread, 1 for Read
      timestamp TEXT NOT NULL
    );
  `;

  await pool.query(schema);
  console.log('✅ Postgres tables ready (SERIAL ids, no seed data).');
}

// --- REST API ENDPOINTS ---

// Helper to send real SMS OTP using Fast2SMS API (Indian bulk carrier)
function sendSmsOtp(phone, otpCode) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
    console.log("👉 Fast2SMS API Key is not configured. Falling back to console verification.");
    return Promise.resolve(false);
  }

  // Extract exactly last 10 digits
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    console.error(`❌ Invalid clean phone number length: ${cleanPhone}`);
    return Promise.resolve(false);
  }

  const messageText = encodeURIComponent(`Your verification code for Jam Karo is ${otpCode}`);
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&message=${messageText}&language=english&route=q&numbers=${cleanPhone}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.return === true) {
            console.log(`✅ SMS OTP sent successfully to +91 ${cleanPhone}`);
            resolve(true);
          } else {
            console.error(`❌ Fast2SMS API error:`, parsed.message || parsed);
            resolve(false);
          }
        } catch (e) {
          console.error("❌ Failed to parse Fast2SMS response body:", data);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error("❌ HTTP Connection error sending SMS:", err.message);
      resolve(false);
    });
  });
}

// Server-side memory store for active verification codes
const activeOtps = {};

// Root health status endpoint
app.get('/', (req, res) => {
  res.send('<h2>🚀 Jam Karo API Server is live and healthy!</h2><p>Exposing secure REST endpoints on Render.</p>');
});

// 1. Send OTP (Simulated or Real phone verification)
app.post('/api/auth/send-otp', (req, res) => {
  const { phone, email } = req.body;
  if (!phone || !email) {
    return res.status(400).json({ error: "Phone number and email are required for OTP verification" });
  }

  // Generate a random 4-digit OTP code
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // Clean phone digits for storage mapping
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  activeOtps[cleanPhone] = generatedOtp;

  console.log(`\n==========================================`);
  console.log(`[OTP VERIFICATION REQUEST]`);
  console.log(`- Email: ${email}`);
  console.log(`- Phone: ${phone} (Clean: ${cleanPhone})`);
  console.log(`👉 OTP CODE GENERATED: ${generatedOtp}`);
  console.log(`==========================================\n`);

  sendSmsOtp(phone, generatedOtp).then((realSmsSent) => {
    res.json({
      success: true,
      // ONLY send the OTP to the client if a real SMS could NOT be dispatched (so it works as a fallback)
      otp: realSmsSent ? undefined : generatedOtp,
      realSmsSent,
      message: realSmsSent
        ? "Verification code dispatched to your mobile!"
        : "OTP logged to server console (Fast2SMS API key missing)."
    });
  });
});

// 2. Authentication Signup (Detailed profile fields with backend verification check)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, phone, otp, userType, name, neighborhood, role, skillLevel } = req.body;
  if (!email || !password || !phone || !otp || !userType) {
    return res.status(400).json({ error: "Missing email, password, phone, OTP code, or userType" });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const expectedOtp = activeOtps[cleanPhone];

  if (!expectedOtp || expectedOtp !== otp.toString()) {
    return res.status(400).json({ error: "Invalid or expired OTP code!" });
  }

  // Remove OTP once consumed successfully
  delete activeOtps[cleanPhone];

  // default initial avatar placeholder
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || email}`;

  // Hash the password before persisting (10 salt rounds)
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    // Postgres has no this.lastID -> ask for the new id back with RETURNING
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, phone, user_type, name, neighborhood, role, skill_level, avatar, genres, gear, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', '', '')
       RETURNING id`,
      [email, hashedPassword, phone, userType, name || 'User', neighborhood || 'College Road', role || 'Vocalist', skillLevel || 'Learning', avatar]
    );
    const newId = rows[0].id;

    const userData = {
      id: newId,
      email,
      phone,
      userType,
      name: name || 'User',
      neighborhood: neighborhood || 'College Road',
      role: role || 'Vocalist',
      skillLevel: skillLevel || 'Learning',
      avatar,
      genres: [],
      gear: '',
      bio: '',
      success: true
    };

    const token = issueToken({ id: newId, email, user_type: userType });
    res.json({ token, ...userData });
  } catch (err) {
    // Postgres unique-violation SQLSTATE is 23505 (was "UNIQUE constraint failed" text in SQLite)
    if (err.code === '23505') {
      return res.status(400).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: err.message });
  }
});

// 3. Authentication Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const userData = {
      id: user.id,
      email: user.email,
      phone: user.phone || '',
      userType: user.user_type,
      name: user.name,
      neighborhood: user.neighborhood,
      role: user.role,
      skillLevel: user.skill_level,
      genres: user.genres ? user.genres.split(',').map(g => g.trim()) : [],
      gear: user.gear || '',
      bio: user.bio || '',
      avatar: user.avatar,
      videoUrl: user.video_url || '',
      success: true
    };

    const token = issueToken(user);
    res.json({ token, ...userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update User Profile (Supports Multi-part Form Data file uploads)
app.post('/api/profiles/update', authenticateToken, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  const { name, neighborhood, role, skillLevel, genres, gear, bio } = req.body;
  const userId = req.user.id;

  // Handle uploaded file URLs
  let avatarUrl = undefined;
  let videoUrl = undefined;

  if (req.files) {
    const uploadsBase = `${req.protocol}://${req.get('host')}/uploads/`;
    if (req.files['avatar'] && req.files['avatar'][0]) {
      avatarUrl = `${uploadsBase}${req.files['avatar'][0].filename}`;
    }
    if (req.files['video'] && req.files['video'][0]) {
      videoUrl = `${uploadsBase}${req.files['video'][0].filename}`;
    }
  }

  const genreString = Array.isArray(genres) ? genres.join(', ') : genres || '';

  // Build the UPDATE dynamically so avatar/video are only overwritten when a
  // new file is uploaded. Placeholders are numbered ($1, $2, ...) in order.
  const columns = ['name', 'neighborhood', 'role', 'skill_level', 'genres', 'gear', 'bio'];
  const values = [name, neighborhood, role, skillLevel, genreString, gear, bio];

  if (avatarUrl) {
    columns.push('avatar');
    values.push(avatarUrl);
  }
  if (videoUrl) {
    columns.push('video_url');
    values.push(videoUrl);
  }

  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  values.push(userId);
  const query = `UPDATE users SET ${setClause} WHERE id = $${values.length}`;

  try {
    await pool.query(query, values);

    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found after update" });
    }

    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone || '',
      userType: user.user_type,
      name: user.name,
      neighborhood: user.neighborhood,
      role: user.role,
      skillLevel: user.skill_level,
      genres: user.genres ? user.genres.split(',').map(g => g.trim()) : [],
      gear: user.gear || '',
      bio: user.bio || '',
      avatar: user.avatar,
      videoUrl: user.video_url || '',
      success: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Musicians (returns other musician users supporting zone filtering)
app.get('/api/musicians', async (req, res) => {
  const { zone } = req.query;
  let query = "SELECT * FROM users WHERE user_type = 'musician'";
  const params = [];

  if (zone && zone !== 'All') {
    params.push(zone);
    query += ` AND neighborhood = $${params.length}`;
  }

  try {
    const { rows } = await pool.query(query, params);
    const formatted = rows.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      skill: r.skill_level,
      neighborhood: r.neighborhood,
      genres: r.genres ? r.genres.split(',').map(g => g.trim()) : [],
      gear: r.gear,
      bio: r.bio,
      avatar: r.avatar,
      videoUrl: r.video_url || '',
      distance: r.distance
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Swipe Match Action
app.post('/api/matches', authenticateToken, async (req, res) => {
  const { targetId, status } = req.body;
  const currentUserId = req.user.id;

  if (!targetId || !status) {
    return res.status(400).json({ error: "Missing swipe parameters" });
  }

  try {
    // Postgres upsert: same shape as SQLite, EXCLUDED refers to the row that
    // failed to insert. The UNIQUE(requester_id, target_id) constraint is the target.
    await pool.query(
      `INSERT INTO matches (requester_id, target_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (requester_id, target_id) DO UPDATE SET status = EXCLUDED.status`,
      [currentUserId, targetId, status]
    );

    if (status === 'liked') {
      const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [targetId]);
      if (rows[0]) {
        return res.json({ matched: true, name: rows[0].name });
      }
      return res.json({ matched: false });
    }

    res.json({ matched: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Save/Fetch Joint Profiles (Bands Lineup)
app.post('/api/joint-profiles', authenticateToken, async (req, res) => {
  const { bandName, members, genres, rate } = req.body;
  if (!bandName || !members || !genres) {
    return res.status(400).json({ error: "Missing band fields" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO joint_profiles (band_name, members, genres, rate, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [bandName, JSON.stringify(members), JSON.stringify(genres), rate, 'Jamming/Vetting']
    );
    res.json({ id: rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/joint-profiles', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM joint_profiles ORDER BY id DESC");
    const formatted = rows.map(r => ({
      id: r.id,
      bandName: r.band_name,
      members: JSON.parse(r.members),
      genres: JSON.parse(r.genres),
      rate: r.rate,
      status: r.status,
      jamsCount: r.jams_count
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Shows Board (List & Create)
app.get('/api/gigs', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM gigs ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gigs', authenticateToken, async (req, res) => {
  const { venue, event, date, time, pay, contractDetails, hirer } = req.body;
  if (!venue || !event || !pay) {
    return res.status(400).json({ error: "Missing required fields (venue, event, pay)" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO gigs (venue, event, date, time, pay, status, contract_details, hirer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [venue, event, date || '2026-07-20', time || '8:00 PM', `₹${pay}`, 'Open', contractDetails || 'PA sound provided by organizer.', hirer || 'Host/Cafe']
    );
    res.json({ id: rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Booking Confirm (Triggers confirmation notification)
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { gigId } = req.body;
  if (!gigId) {
    return res.status(400).json({ error: "Missing gigId" });
  }

  try {
    await pool.query("UPDATE gigs SET status = 'Confirmed' WHERE id = $1", [gigId]);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await pool.query(
      "INSERT INTO notifications (user_id, message, timestamp) VALUES ($1, $2, $3)",
      [req.user.id, `Show Booking Confirmed! Please coordinate directly with the venue/musician for the advance.`, nowStr]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Gear Rentals (List & Book)
app.get('/api/rentals', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM gear_rentals");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rentals/book', authenticateToken, async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: "Missing itemId" });
  }

  try {
    await pool.query("UPDATE gear_rentals SET status = 'Rented' WHERE id = $1", [itemId]);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await pool.query(
      "INSERT INTO notifications (user_id, message, timestamp) VALUES ($1, $2, $3)",
      [req.user.id, `Gear Rental Secured: Pick up scheduled.`, nowStr]
    );

    res.json({ success: true, bookedItemId: itemId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Community Learner's Chatroom API
app.get('/api/community/messages', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM community_messages ORDER BY id ASC LIMIT 50");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/messages', authenticateToken, async (req, res) => {
  const { senderName, message, userRole } = req.body;
  if (!senderName || !message) {
    return res.status(400).json({ error: "Missing senderName or message" });
  }

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const { rows } = await pool.query(
      "INSERT INTO community_messages (sender_name, message, user_role, timestamp) VALUES ($1, $2, $3, $4) RETURNING id",
      [senderName, message, userRole || 'Learner', nowStr]
    );
    res.json({ id: rows[0].id, success: true, timestamp: nowStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Jam Circles API (List, Create, RSVP)
app.get('/api/jams', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM jam_sessions ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jams', authenticateToken, async (req, res) => {
  const { cafeName, title, date, time, entryFee, slotsTotal, description } = req.body;
  if (!cafeName || !title || !entryFee || !slotsTotal) {
    return res.status(400).json({ error: "Missing required fields (cafeName, title, entryFee, slotsTotal)" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO jam_sessions (cafe_name, title, date, time, entry_fee, slots_total, slots_left, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [cafeName, title, date || '2026-07-20', time || '6:00 PM', `₹${entryFee} (Cover Charge)`, slotsTotal, slotsTotal, description || 'A casual open jam circle.']
    );
    res.json({ id: rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jams/rsvp', authenticateToken, async (req, res) => {
  const { jamId } = req.body;
  if (!jamId) {
    return res.status(400).json({ error: "Missing jamId" });
  }

  try {
    await pool.query(
      "UPDATE jam_sessions SET slots_left = slots_left - 1 WHERE id = $1 AND slots_left > 0",
      [jamId]
    );

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await pool.query(
      "INSERT INTO notifications (user_id, message, timestamp) VALUES ($1, $2, $3)",
      [req.user.id, `RSVP Confirmed: You booked a slot for Jam Circle! 🎙️`, nowStr]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. 1-on-1 Private Messages API
app.get('/api/messages/history', authenticateToken, async (req, res) => {
  const { receiver } = req.query;
  const sender = req.user.id;
  if (!receiver) {
    return res.status(400).json({ error: "Missing receiver parameter" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM private_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4)
       ORDER BY id ASC`,
      [sender, receiver, receiver, sender]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/send', authenticateToken, async (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.user.id;
  if (!receiverId || !message) {
    return res.status(400).json({ error: "Missing message parameters" });
  }

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const { rows } = await pool.query(
      "INSERT INTO private_messages (sender_id, receiver_id, message, timestamp) VALUES ($1, $2, $3, $4) RETURNING id",
      [senderId, receiverId, message, nowStr]
    );
    res.json({ id: rows[0].id, success: true, timestamp: nowStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Notifications API
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 20",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query("UPDATE notifications SET read_status = 1 WHERE user_id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server (only after the schema is ready)
initializeTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Jam Karo API listening on: http://localhost:${PORT}`);
      console.log(`🗄️  Postgres: ${process.env.DATABASE_URL ? 'connected via DATABASE_URL' : 'NOT CONFIGURED'}\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize the database:', err.message);
    process.exit(1);
  });
