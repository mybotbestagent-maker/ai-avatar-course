const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM price_book WHERE active = 1';
  const params = [];
  if (search) { query += ' AND (name LIKE ? OR category LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  query += ' ORDER BY category, name';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { name, price, category, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO price_book (name, price, category, note) VALUES (?, ?, ?, ?)').run(name, price || 0, category || 'General', note || '');
  res.status(201).json(db.prepare('SELECT * FROM price_book WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, price, category, note, active } = req.body;
  db.prepare('UPDATE price_book SET name=COALESCE(?,name), price=COALESCE(?,price), category=COALESCE(?,category), note=COALESCE(?,note), active=COALESCE(?,active) WHERE id=?')
    .run(name, price, category, note, active, req.params.id);
  res.json(db.prepare('SELECT * FROM price_book WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE price_book SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
