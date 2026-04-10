const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all estimates
router.get('/', (req, res) => {
  const estimates = db.prepare(`
    SELECT e.*, l.name as client_name, l.phone as client_phone
    FROM estimates e
    LEFT JOIN leads l ON e.lead_id = l.id
    ORDER BY e.created_at DESC
  `).all();
  res.json(estimates);
});

router.get('/:id', (req, res) => {
  const e = db.prepare(`SELECT e.*, l.name as client_name, l.phone as client_phone
    FROM estimates e LEFT JOIN leads l ON e.lead_id = l.id WHERE e.id = ?`).get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  e.items = JSON.parse(e.items || '[]');
  res.json(e);
});

router.post('/', (req, res) => {
  const { lead_id, job_id, title, items = [], tax = 0, notes } = req.body;
  const subtotal = items.reduce((s, i) => s + (i.qty * i.price), 0);
  const total = subtotal + (subtotal * tax / 100);
  const result = db.prepare(
    'INSERT INTO estimates (lead_id, job_id, title, items, subtotal, tax, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(lead_id, job_id, title, JSON.stringify(items), subtotal, tax, total, notes);
  res.status(201).json(db.prepare('SELECT * FROM estimates WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { title, items, tax, status, notes } = req.body;
  const parsedItems = items || [];
  const subtotal = parsedItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const t = tax !== undefined ? tax : 0;
  const total = subtotal + (subtotal * t / 100);
  db.prepare('UPDATE estimates SET title=COALESCE(?,title), items=COALESCE(?,items), subtotal=?, tax=COALESCE(?,tax), total=?, status=COALESCE(?,status), notes=COALESCE(?,notes) WHERE id=?')
    .run(title, items ? JSON.stringify(items) : null, subtotal || null, t, total || null, status, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id));
});

// Convert estimate to invoice
router.post('/:id/convert', (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).json({ error: 'Not found' });
  const result = db.prepare(
    'INSERT INTO invoices (lead_id, job_id, estimate_id, title, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(est.lead_id, est.job_id, est.id, est.title, est.items, est.subtotal, est.tax, est.total, 'pending');
  db.prepare("UPDATE estimates SET status = 'converted' WHERE id = ?").run(est.id);
  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid));
});

module.exports = router;
