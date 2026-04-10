const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendNewLeadSMS } = require('../sms');

// Thumbtack webhook
router.post('/thumbtack', async (req, res) => {
  console.log('[WEBHOOK] Thumbtack lead received:', JSON.stringify(req.body));
  try {
    const payload = req.body;

    // Parse Thumbtack webhook format
    const name = payload.customer?.name || payload.leadName || 'Unknown';
    const phone = payload.customer?.phone || payload.phone || '';
    const job_type = payload.request?.title || payload.serviceType || '';
    const description = payload.request?.description || payload.description || '';
    const city = payload.request?.location?.city || payload.city || '';
    const thumbtack_id = payload.leadID || payload.id || '';

    // Check for duplicate
    if (thumbtack_id) {
      const existing = db.prepare('SELECT id FROM leads WHERE thumbtack_id = ?').get(thumbtack_id);
      if (existing) return res.json({ status: 'duplicate', id: existing.id });
    }

    const result = db.prepare(
      'INSERT INTO leads (name, phone, job_type, description, city, source, thumbtack_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, phone, job_type, description, city, 'thumbtack', thumbtack_id);

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);

    // Send auto-SMS
    await sendNewLeadSMS(lead);

    console.log(`[WEBHOOK] Lead created: ${name} | ${phone} | ${job_type}`);
    res.json({ status: 'ok', lead_id: result.lastInsertRowid });
  } catch (e) {
    console.error('[WEBHOOK ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
