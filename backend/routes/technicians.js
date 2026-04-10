const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM technicians WHERE active = 1').all());
});

router.post('/', (req, res) => {
  const { name, phone, cities } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO technicians (name, phone, cities) VALUES (?, ?, ?)').run(name, phone || '', JSON.stringify(cities || []));
  res.status(201).json(db.prepare('SELECT * FROM technicians WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, phone, cities, active } = req.body;
  db.prepare('UPDATE technicians SET name=COALESCE(?,name), phone=COALESCE(?,phone), cities=COALESCE(?,cities), active=COALESCE(?,active) WHERE id=?')
    .run(name, phone, cities ? JSON.stringify(cities) : null, active, req.params.id);
  res.json(db.prepare('SELECT * FROM technicians WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE technicians SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
