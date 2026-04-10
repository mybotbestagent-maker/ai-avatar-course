const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const invoices = db.prepare(`
    SELECT i.*, l.name as client_name, l.phone as client_phone
    FROM invoices i
    LEFT JOIN leads l ON i.lead_id = l.id
    ORDER BY i.created_at DESC
  `).all();
  res.json(invoices);
});

router.get('/:id', (req, res) => {
  const inv = db.prepare(`SELECT i.*, l.name as client_name, l.phone as client_phone
    FROM invoices i LEFT JOIN leads l ON i.lead_id = l.id WHERE i.id = ?`).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  inv.items = JSON.parse(inv.items || '[]');
  res.json(inv);
});

router.post('/', (req, res) => {
  const { lead_id, job_id, title, items = [], tax = 0, due_date, notes } = req.body;
  const subtotal = items.reduce((s, i) => s + (i.qty * i.price), 0);
  const total = subtotal + (subtotal * tax / 100);
  const result = db.prepare(
    'INSERT INTO invoices (lead_id, job_id, title, items, subtotal, tax, total, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(lead_id, job_id, title, JSON.stringify(items), subtotal, tax, total, due_date, notes);
  res.status(201).json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { status, paid, due_date, notes, items, tax } = req.body;
  if (items) {
    const subtotal = items.reduce((s, i) => s + (i.qty * i.price), 0);
    const t = tax || 0;
    const total = subtotal + (subtotal * t / 100);
    db.prepare('UPDATE invoices SET items=?, subtotal=?, tax=?, total=? WHERE id=?')
      .run(JSON.stringify(items), subtotal, t, total, req.params.id);
  }
  db.prepare('UPDATE invoices SET status=COALESCE(?,status), paid=COALESCE(?,paid), due_date=COALESCE(?,due_date), notes=COALESCE(?,notes) WHERE id=?')
    .run(status, paid, due_date, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id));
});

module.exports = router;
