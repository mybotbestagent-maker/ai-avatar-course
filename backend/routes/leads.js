const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendNewLeadSMS } = require('../sms');

// GET all leads
router.get('/', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM leads';
  const params = [];
  const conditions = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (search) { conditions.push('(name LIKE ? OR phone LIKE ? OR job_type LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET single lead
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

// POST create lead
router.post('/', async (req, res) => {
  const { name, phone, job_type, description, city, source } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare(
    'INSERT INTO leads (name, phone, job_type, description, city, source) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone || '', job_type || '', description || '', city || '', source || 'manual');
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
  await sendNewLeadSMS(lead);
  res.status(201).json(lead);
});

// PUT update lead
router.put('/:id', (req, res) => {
  const { name, phone, job_type, description, city, status } = req.body;
  db.prepare(
    'UPDATE leads SET name=COALESCE(?,name), phone=COALESCE(?,phone), job_type=COALESCE(?,job_type), description=COALESCE(?,description), city=COALESCE(?,city), status=COALESCE(?,status) WHERE id=?'
  ).run(name, phone, job_type, description, city, status, req.params.id);
  res.json(db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id));
});

// DELETE lead
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
