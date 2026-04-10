const express = require('express');
const router = express.Router();
const db = require('../database');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// List conversations
router.get('/', (req, res) => {
  db.all(`SELECT phone, body, direction, created_at, 
    SUM(CASE WHEN read_status=0 AND direction='in' THEN 1 ELSE 0 END) as unread
    FROM messages GROUP BY phone ORDER BY created_at DESC`, [], (err, rows) => {
    res.json(rows || []);
  });
});

// Get messages for phone
router.get('/:phone', (req, res) => {
  db.all('SELECT * FROM messages WHERE phone=? ORDER BY created_at ASC', [req.params.phone], (err, rows) => {
    db.run('UPDATE messages SET read_status=1 WHERE phone=? AND direction="in"', [req.params.phone]);
    res.json(rows || []);
  });
});

// Send SMS
router.post('/send', async (req, res) => {
  const { phone, body } = req.body;
  try {
    await client.messages.create({ from: process.env.TWILIO_PHONE, to: phone, body });
    db.run('INSERT INTO messages (phone, direction, body) VALUES (?,?,?)', [phone, 'out', body]);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;