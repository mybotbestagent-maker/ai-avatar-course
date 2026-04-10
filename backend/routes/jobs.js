const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendBookingConfirmation, sendTechnicianNotification } = require('../sms');

router.get('/', (req, res) => {
  const jobs = db.prepare(`
    SELECT j.*, l.name as client_name, l.phone as client_phone, l.job_type,
           t.name as tech_name, t.phone as tech_phone
    FROM jobs j
    LEFT JOIN leads l ON j.lead_id = l.id
    LEFT JOIN technicians t ON j.technician_id = t.id
    ORDER BY j.scheduled_date DESC, j.scheduled_time ASC
  `).all();
  res.json(jobs);
});

router.get('/calendar', (req, res) => {
  const { date } = req.query;
  let query = `
    SELECT j.*, l.name as client_name, l.phone as client_phone, l.job_type,
           t.name as tech_name
    FROM jobs j
    LEFT JOIN leads l ON j.lead_id = l.id
    LEFT JOIN technicians t ON j.technician_id = t.id
  `;
  const params = [];
  if (date) { query += ' WHERE j.scheduled_date = ?'; params.push(date); }
  query += ' ORDER BY j.scheduled_date, j.scheduled_time';
  res.json(db.prepare(query).all(...params));
});

router.post('/', async (req, res) => {
  const { lead_id, technician_id, scheduled_date, scheduled_time, city, address, description, notes } = req.body;
  if (!lead_id || !scheduled_date) return res.status(400).json({ error: 'lead_id and scheduled_date required' });

  const result = db.prepare(
    'INSERT INTO jobs (lead_id, technician_id, scheduled_date, scheduled_time, city, address, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(lead_id, technician_id, scheduled_date, scheduled_time, city, address, description, notes);

  // Update lead status to booked
  db.prepare("UPDATE leads SET status = 'booked' WHERE id = ?").run(lead_id);

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
  const tech = technician_id ? db.prepare('SELECT * FROM technicians WHERE id = ?').get(technician_id) : null;

  if (lead && tech) {
    await sendBookingConfirmation(lead, job, tech);
    await sendTechnicianNotification(lead, job, tech);
  }

  res.status(201).json(job);
});

router.put('/:id', (req, res) => {
  const { status, notes, scheduled_date, scheduled_time, address } = req.body;
  db.prepare('UPDATE jobs SET status=COALESCE(?,status), notes=COALESCE(?,notes), scheduled_date=COALESCE(?,scheduled_date), scheduled_time=COALESCE(?,scheduled_time), address=COALESCE(?,address) WHERE id=?')
    .run(status, notes, scheduled_date, scheduled_time, address, req.params.id);
  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
});

module.exports = router;
