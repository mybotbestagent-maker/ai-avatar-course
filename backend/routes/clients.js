const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const clients = db.prepare(`
    SELECT c.*,
      COUNT(DISTINCT j.id) as jobs_count,
      COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total ELSE 0 END), 0) as total_spent,
      MAX(j.scheduled_date) as last_job_date
    FROM clients c
    LEFT JOIN jobs j ON j.lead_id = c.lead_id
    LEFT JOIN invoices i ON i.lead_id = c.lead_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const jobs = db.prepare(`SELECT j.*, t.name as tech_name FROM jobs j LEFT JOIN technicians t ON j.technician_id = t.id WHERE j.lead_id = ? ORDER BY j.scheduled_date DESC`).all(client.lead_id);
  const invoices = db.prepare('SELECT * FROM invoices WHERE lead_id = ? ORDER BY created_at DESC').all(client.lead_id);
  res.json({ ...client, jobs, invoices });
});

router.post('/', (req, res) => {
  const { name, phone, email, address, city, tags, notes, lead_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO clients (name, phone, email, address, city, tags, notes, lead_id) VALUES (?,?,?,?,?,?,?,?)').run(name, phone||'', email||'', address||'', city||'', JSON.stringify(tags||[]), notes||'', lead_id||null);
  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, phone, email, address, city, tags, notes } = req.body;
  db.prepare('UPDATE clients SET name=COALESCE(?,name), phone=COALESCE(?,phone), email=COALESCE(?,email), address=COALESCE(?,address), city=COALESCE(?,city), tags=COALESCE(?,tags), notes=COALESCE(?,notes) WHERE id=?')
    .run(name, phone, email, address, city, tags ? JSON.stringify(tags) : null, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

module.exports = router;
