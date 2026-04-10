const express = require('express');
const router = express.Router();
const db = require('../database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent for invoice
router.post('/create-payment-intent/:invoiceId', async (req, res) => {
  try {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const lead = inv.lead_id ? db.prepare('SELECT * FROM leads WHERE id = ?').get(inv.lead_id) : null;
    const { tip = 0 } = req.body;
    const totalWithTip = Math.round((parseFloat(inv.total) + parseFloat(tip)) * 100); // cents
    if (totalWithTip < 50) return res.status(400).json({ error: 'Amount too small' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalWithTip,
      currency: 'usd',
      metadata: {
        invoice_id: inv.id.toString(),
        client: lead?.name || 'Unknown',
        tip: tip.toString()
      },
      description: `Invoice #${inv.id} - Gold Hands Handyman - ${lead?.name || ''}`,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: totalWithTip,
    });
  } catch (e) {
    console.error('[STRIPE ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Mark invoice paid after successful payment
router.post('/payment-success/:invoiceId', async (req, res) => {
  const { payment_intent_id, tip = 0 } = req.body;
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.invoiceId);
  if (!inv) return res.status(404).json({ error: 'Not found' });

  db.prepare("UPDATE invoices SET status='paid', paid=total+? WHERE id=?").run(tip, req.params.invoiceId);
  console.log(`[PAYMENT] Invoice #${req.params.invoiceId} paid. PI: ${payment_intent_id}`);
  res.json({ success: true });
});

// Save signature
router.post('/sign/:invoiceId', (req, res) => {
  const { signature } = req.body;
  db.prepare("UPDATE invoices SET notes = COALESCE(notes,'') || ' [SIGNED]' WHERE id=?").run(req.params.invoiceId);
  res.json({ success: true });
});

module.exports = router;
