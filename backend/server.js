require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3335;
const JWT_SECRET = 'goldHands_jwt_secret_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Auth middleware ──
function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Auth routes (public) ──
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = [
    { username: 'dispatcher', password: 'goldHands2026', role: 'dispatcher' },
    { username: 'admin', password: 'admin2026', role: 'admin' },
  ];
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, role: user.role });
});

// ── Public routes ──
app.get('/invoice/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/invoice.html'));
});
app.use('/api/payments', require('./routes/payments')); // Stripe webhooks need to be public
app.use('/webhook', require('./routes/webhook'));
app.get('/auth/callback', (req, res) => {
  res.send('<h2>✅ Authorization received! You can close this window.</h2>');
});

// ── Protected API routes ──
app.use('/api', authMiddleware);

app.use('/api/leads', require('./routes/leads'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/estimates', require('./routes/estimates'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/pricebook', require('./routes/pricebook'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/messages', require('./routes/messages'));

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const db = require('./database');
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Gold Hands running on http://localhost:${PORT}`);
});
