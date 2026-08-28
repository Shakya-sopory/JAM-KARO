require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const https = require('https');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.set('trust proxy', 1);
const PORT = 3001;

// JWT signing secret (override in server/.env for production)
const JWT_SECRET = process.env.JWT_SECRET || 'jam-karo-dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

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

// SQLite Database Setup
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeTables();
  }
});

// Create tables with no pre-seeded dummy profile data for a clean launch
function initializeTables() {
  db.serialize(() => {
    // 1. USERS Table (Unified User & Profile table)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,             
        user_type TEXT NOT NULL, -- 'musician', 'hirer'
        name TEXT,
        neighborhood TEXT,
        role TEXT,              -- Instrument played or 'Vocalist'
        skill_level TEXT,       -- 'Learning', 'Intermediate', 'Professional'
        genres TEXT,            -- Comma-separated genres
        gear TEXT,
        bio TEXT,
        avatar TEXT,
        video_url TEXT,         -- Audition reel path
        distance TEXT DEFAULT '1.2 km'
      )
    `);

    // 2. MATCHES Table (Likes/Skips)
    db.run(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER,
        target_id INTEGER,
        status TEXT, -- 'liked', 'skipped'
        UNIQUE(requester_id, target_id)
      )
    `);

    // 3. JOINT PROFILES (Bands) Table
    db.run(`
      CREATE TABLE IF NOT EXISTS joint_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        band_name TEXT NOT NULL,
        members TEXT NOT NULL, -- JSON string of member array
        genres TEXT NOT NULL,  -- JSON string of genres array
        rate TEXT,
        status TEXT,
        jams_count INTEGER DEFAULT 1
      )
    `);

    // 4. GIGS (Marketplace Board) Table
    db.run(`
      CREATE TABLE IF NOT EXISTS gigs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue TEXT NOT NULL,
        event TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        pay TEXT NOT NULL,
        status TEXT NOT NULL, -- 'Open', 'In Escrow', 'Released'
        contract_details TEXT,
        hirer TEXT
      )
    `);

    // 5. GEAR RENTALS Table
    db.run(`
      CREATE TABLE IF NOT EXISTS gear_rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        neighborhood TEXT NOT NULL,
        contact TEXT NOT NULL,
        status TEXT DEFAULT 'Available' -- 'Available', 'Rented'
      )
    `);

    // 6. COMMUNITY MESSAGES Table (Learner's Space)
    db.run(`
      CREATE TABLE IF NOT EXISTS community_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_name TEXT NOT NULL,
        message TEXT NOT NULL,
        user_role TEXT DEFAULT 'Learner',
        timestamp TEXT NOT NULL
      )
    `);

    // 7. JAM SESSIONS Table (Cafe Jam Circles)
    db.run(`
      CREATE TABLE IF NOT EXISTS jam_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cafe_name TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        entry_fee TEXT NOT NULL,
        slots_total INTEGER NOT NULL,
        slots_left INTEGER NOT NULL,
        description TEXT
      )
    `);

    // 8. PRIVATE MESSAGES Table (1-on-1 Chatbox)
    db.run(`
      CREATE TABLE IF NOT EXISTS private_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // 9. NOTIFICATIONS Table (Hub Alerts)
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        read_status INTEGER DEFAULT 0, -- 0 for Unread, 1 for Read
        timestamp TEXT NOT NULL
      )
    `);

    console.log("SQLite tables initialized cleanly (no pre-seeded dummy profiles). ready for direct user signups!");
  });
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
app.post('/api/auth/signup', (req, res) => {
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

  db.run(
    `INSERT INTO users (email, password, phone, user_type, name, neighborhood, role, skill_level, avatar, genres, gear, bio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '')`,
    [email, hashedPassword, phone, userType, name || 'User', neighborhood || 'College Road', role || 'Vocalist', skillLevel || 'Learning', avatar],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: "Email already registered" });
        }
        return res.status(500).json({ error: err.message });
      }

      const userData = {
        id: this.lastID,
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

      const token = issueToken({ id: this.lastID, email, user_type: userType });
      res.json({ token, ...userData });
    }
  );
});

// 3. Authentication Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
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
    }
  );
});

// 4. Update User Profile (Supports Multi-part Form Data file uploads)
app.post('/api/profiles/update', authenticateToken, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
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

  // Construct query dynamically to preserve existing avatar/video files if no new file is uploaded
  let query = `UPDATE users 
               SET name = ?, neighborhood = ?, role = ?, skill_level = ?, genres = ?, gear = ?, bio = ?`;
  let params = [name, neighborhood, role, skillLevel, genreString, gear, bio];

  if (avatarUrl) {
    query += `, avatar = ?`;
    params.push(avatarUrl);
  }
  if (videoUrl) {
    query += `, video_url = ?`;
    params.push(videoUrl);
  }

  query += ` WHERE id = ?`;
  params.push(userId);

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retrieve and return updated details
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
      if (user) {
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
      } else {
        res.status(404).json({ error: "User not found after update" });
      }
    });
  });
});

// 5. Get Musicians (returns other musician users supporting zone filtering)
app.get('/api/musicians', (req, res) => {
  const { zone } = req.query;
  let query = "SELECT * FROM users WHERE user_type = 'musician'";
  let params = [];

  if (zone && zone !== 'All') {
    query += " AND neighborhood = ?";
    params.push(zone);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
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
  });
});

// 6. Swipe Match Action
app.post('/api/matches', authenticateToken, (req, res) => {
  const { targetId, status } = req.body;
  const currentUserId = req.user.id;

  if (!targetId || !status) {
    return res.status(400).json({ error: "Missing swipe parameters" });
  }

  db.run(
    `INSERT INTO matches (requester_id, target_id, status) 
     VALUES (?, ?, ?) 
     ON CONFLICT(requester_id, target_id) DO UPDATE SET status = excluded.status`,
    [currentUserId, targetId, status],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (status === 'liked') {
        db.get("SELECT * FROM users WHERE id = ?", [targetId], (err, user) => {
          if (user) {
            // Auto match on likes for seed demonstration
            return res.json({ matched: true, name: user.name });
          }
          res.json({ matched: false });
        });
      } else {
        res.json({ matched: false });
      }
    }
  );
});

// 7. Save/Fetch Joint Profiles (Bands Lineup)
app.post('/api/joint-profiles', authenticateToken, (req, res) => {
  const { bandName, members, genres, rate } = req.body;
  if (!bandName || !members || !genres) {
    return res.status(400).json({ error: "Missing band fields" });
  }

  db.run(
    `INSERT INTO joint_profiles (band_name, members, genres, rate, status) 
     VALUES (?, ?, ?, ?, ?)`,
    [bandName, JSON.stringify(members), JSON.stringify(genres), rate, 'Jamming/Vetting'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.get('/api/joint-profiles', (req, res) => {
  db.all("SELECT * FROM joint_profiles ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
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
  });
});

// 8. Shows Board (List & Create)
app.get('/api/gigs', (req, res) => {
  db.all("SELECT * FROM gigs ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/gigs', authenticateToken, (req, res) => {
  const { venue, event, date, time, pay, contractDetails, hirer } = req.body;
  if (!venue || !event || !pay) {
    return res.status(400).json({ error: "Missing required fields (venue, event, pay)" });
  }

  db.run(
    `INSERT INTO gigs (venue, event, date, time, pay, status, contract_details, hirer) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [venue, event, date || '2026-07-20', time || '8:00 PM', `₹${pay}`, 'Open', contractDetails || 'PA sound provided by organizer.', hirer || 'Host/Cafe'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

// 9. Booking Confirm (Triggers locked advance notification)
app.post('/api/bookings', authenticateToken, (req, res) => {
  const { gigId } = req.body;
  if (!gigId) {
    return res.status(400).json({ error: "Missing gigId" });
  }

  db.run("UPDATE gigs SET status = 'Confirmed' WHERE id = ?", [gigId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetUserId = req.user.id;
    db.run(
      "INSERT INTO notifications (user_id, message, timestamp) VALUES (?, ?, ?)",
      [targetUserId, `Show Booking Confirmed! Please coordinate directly with the venue/musician for the advance.`, nowStr],
      () => {
        res.json({ success: true });
      }
    );
  });
});

// 10. Gear Rentals (List & Book)
app.get('/api/rentals', (req, res) => {
  db.all("SELECT * FROM gear_rentals", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/rentals/book', authenticateToken, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: "Missing itemId" });
  }

  db.run("UPDATE gear_rentals SET status = 'Rented' WHERE id = ?", [itemId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetUserId = req.user.id;
    db.run(
      "INSERT INTO notifications (user_id, message, timestamp) VALUES (?, ?, ?)",
      [targetUserId, `Gear Rental Secured: Pick up scheduled.`, nowStr],
      () => {
        res.json({ success: true, bookedItemId: itemId });
      }
    );
  });
});

// 11. Community Learner's Chatroom API
app.get('/api/community/messages', (req, res) => {
  db.all("SELECT * FROM community_messages ORDER BY id ASC LIMIT 50", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/community/messages', authenticateToken, (req, res) => {
  const { senderName, message, userRole } = req.body;
  if (!senderName || !message) {
    return res.status(400).json({ error: "Missing senderName or message" });
  }

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  db.run(
    "INSERT INTO community_messages (sender_name, message, user_role, timestamp) VALUES (?, ?, ?, ?)",
    [senderName, message, userRole || 'Learner', nowStr],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true, timestamp: nowStr });
    }
  );
});

// 12. Jam Circles API (List, Create, RSVP)
app.get('/api/jams', (req, res) => {
  db.all("SELECT * FROM jam_sessions ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/jams', authenticateToken, (req, res) => {
  const { cafeName, title, date, time, entryFee, slotsTotal, description } = req.body;
  if (!cafeName || !title || !entryFee || !slotsTotal) {
    return res.status(400).json({ error: "Missing required fields (cafeName, title, entryFee, slotsTotal)" });
  }

  db.run(
    `INSERT INTO jam_sessions (cafe_name, title, date, time, entry_fee, slots_total, slots_left, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [cafeName, title, date || '2026-07-20', time || '6:00 PM', `₹${entryFee} (Cover Charge)`, slotsTotal, slotsTotal, description || 'A casual open jam circle.'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.post('/api/jams/rsvp', authenticateToken, (req, res) => {
  const { jamId } = req.body;
  if (!jamId) {
    return res.status(400).json({ error: "Missing jamId" });
  }

  db.run(
    "UPDATE jam_sessions SET slots_left = slots_left - 1 WHERE id = ? AND slots_left > 0",
    [jamId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const targetUserId = req.user.id;
      db.run(
        "INSERT INTO notifications (user_id, message, timestamp) VALUES (?, ?, ?)",
        [targetUserId, `RSVP Confirmed: You booked a slot for Jam Circle! 🎙️`, nowStr],
        () => {
          res.json({ success: true });
        }
      );
    }
  );
});

// 13. 1-on-1 Private Messages API
app.get('/api/messages/history', authenticateToken, (req, res) => {
  const { receiver } = req.query;
  const sender = req.user.id;
  if (!receiver) {
    return res.status(400).json({ error: "Missing receiver parameter" });
  }

  db.all(
    `SELECT * FROM private_messages 
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) 
     ORDER BY id ASC`,
    [sender, receiver, receiver, sender],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/messages/send', authenticateToken, (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.user.id;
  if (!receiverId || !message) {
    return res.status(400).json({ error: "Missing message parameters" });
  }

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  db.run(
    "INSERT INTO private_messages (sender_id, receiver_id, message, timestamp) VALUES (?, ?, ?, ?)",
    [senderId, receiverId, message, nowStr],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true, timestamp: nowStr });
    }
  );
});

// 14. Notifications API
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20",
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/notifications/read', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run(
    "UPDATE notifications SET read_status = 1 WHERE user_id = ?",
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Jam-to-Gig Dual API Server listening on: http://localhost:${PORT}`);
  console.log(`Database File: ${dbPath}\n`);
});
