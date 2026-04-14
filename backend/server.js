require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3335;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET missing or too short (need 32+ chars). Set it in .env.');
  process.exit(1);
}

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
}));
app.use(express.json({ limit: '1mb' }));

// Stripe webhook needs raw body — must be mounted BEFORE express.json for that specific path.
// Here it's handled inside routes/payments.js via bodyParser.raw for that route only.

app.use(express.static(path.join(__dirname, '../frontend')));

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Seed default admin if users table is empty (one-time bootstrap from env)
(function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    const adminPwd = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (adminPwd) {
      const hash = bcrypt.hashSync(adminPwd, 10);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)').run('admin', hash, 'admin');
      console.log('✅ Bootstrap admin user created (username: admin)');
    } else {
      console.warn('⚠️  No users in DB and ADMIN_BOOTSTRAP_PASSWORD not set. Login will not work.');
    }
  }
})();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, role: user.role });
});

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.get('/invoice/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/invoice.html'));
});

app.use('/webhook', require('./routes/webhook'));
app.get('/auth/callback', (req, res) => {
  res.send('<h2>✅ Authorization received! You can close this window.</h2>');
});

app.use('/api', authMiddleware);

app.use('/api/leads', require('./routes/leads'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/estimates', require('./routes/estimates'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/pricebook', require('./routes/pricebook'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));

app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
  const hourAgo = new Date(Date.now() - 60*60*1000).toISOString().replace('T',' ').slice(0,19);

  const leadsTotal = db.prepare("SELECT COUNT(*) as c FROM leads").get().c;
  const leadsBooked = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status='booked'").get().c;

  res.json({
    leads_today: db.prepare("SELECT COUNT(*) as c FROM leads WHERE date(created_at)=?").get(today).c,
    leads_total: leadsTotal,
    leads_new: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status='new'").get().c,
    jobs_today: db.prepare("SELECT COUNT(*) as c FROM jobs WHERE scheduled_date=?").get(today).c,
    jobs_total: db.prepare("SELECT COUNT(*) as c FROM jobs").get().c,
    revenue_week: db.prepare("SELECT COALESCE(SUM(total),0) as s FROM invoices WHERE status='paid' AND date(created_at)>=?").get(weekAgo).s,
    revenue_month: db.prepare("SELECT COALESCE(SUM(total),0) as s FROM invoices WHERE status='paid' AND date(created_at)>=?").get(monthAgo).s,
    conversion_rate: leadsTotal > 0 ? Math.round(leadsBooked / leadsTotal * 100) : 0,
    needs_attention: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status='new' AND created_at<?").get(hourAgo).c,
    top_techs: db.prepare(`SELECT t.name, COUNT(j.id) as jobs FROM technicians t LEFT JOIN jobs j ON j.technician_id=t.id AND j.scheduled_date>=? GROUP BY t.id ORDER BY jobs DESC LIMIT 5`).all(weekAgo),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Gold Hands running on http://localhost:${PORT}`);
});

module.exports = { requireRole };
