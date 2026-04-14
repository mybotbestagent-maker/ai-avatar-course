const express = require('express');
const router = express.Router();
const db = require('../database');

const twilioClient = process.env.TWILIO_SID
  ? require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
  : null;

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT phone,
           MAX(created_at) as last_at,
           (SELECT body FROM messages m2 WHERE m2.phone = m1.phone ORDER BY created_at DESC LIMIT 1) as last_body,
           SUM(CASE WHEN read_status=0 AND direction='in' THEN 1 ELSE 0 END) as unread
    FROM messages m1
    GROUP BY phone
    ORDER BY last_at DESC
  `).all();
  res.json(rows);
});

router.get('/:phone', (req, res) => {
  const rows = db.prepare('SELECT * FROM messages WHERE phone=? ORDER BY created_at ASC').all(req.params.phone);
  db.prepare("UPDATE messages SET read_status=1 WHERE phone=? AND direction='in'").run(req.params.phone);
  res.json(rows);
});

router.post('/send', async (req, res) => {
  const { phone, body } = req.body || {};
  if (!phone || !body) return res.status(400).json({ error: 'phone and body required' });
  try {
    if (twilioClient) {
      await twilioClient.messages.create({ from: process.env.TWILIO_PHONE, to: phone, body });
    }
    db.prepare('INSERT INTO messages (phone, direction, body) VALUES (?,?,?)').run(phone, 'out', body);
    res.json({ ok: true, twilio: !!twilioClient });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
