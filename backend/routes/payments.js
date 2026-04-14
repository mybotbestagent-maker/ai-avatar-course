const express = require('express');
const router = express.Router();
const db = require('../database');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Create payment intent for invoice
router.post('/create-payment-intent/:invoiceId', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
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

// NOTE: previously a public `/payment-success/:invoiceId` endpoint let anyone
// mark an invoice paid. Removed. Use the Stripe webhook below as source of truth.
// For manual payments (cash, Zelle, bank transfer) use the authenticated
// PUT /api/invoices/:id with status='paid'.

const bodyParser = require('express').raw({ type: 'application/json' });
router.post('/stripe-webhook', bodyParser, async (req, res) => {
  if (!stripe) return res.status(503).send('stripe-not-configured');
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('webhook-secret-missing');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const invoiceId = pi.metadata?.invoice_id;
    const tip = parseFloat(pi.metadata?.tip || '0');
    if (invoiceId) {
      db.prepare("UPDATE invoices SET status='paid', paid=total+? WHERE id=?").run(tip, invoiceId);
      console.log(`[STRIPE WEBHOOK] Invoice #${invoiceId} paid via PI ${pi.id}`);
    }
  }
  res.json({ received: true });
});

// Save signature
router.post('/sign/:invoiceId', (req, res) => {
  const { signature } = req.body;
  db.prepare("UPDATE invoices SET notes = COALESCE(notes,'') || ' [SIGNED]' WHERE id=?").run(req.params.invoiceId);
  res.json({ success: true });
});

module.exports = router;
