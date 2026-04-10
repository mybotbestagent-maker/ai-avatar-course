require('dotenv').config();
const twilio = process.env.TWILIO_SID ? require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN) : null;
const FROM = process.env.TWILIO_PHONE || '';

async function sendSMS(to, message) {
  if (!twilio) {
    console.log(`[SMS LOG] To: ${to} | Msg: ${message}`);
    return { status: 'logged' };
  }
  try {
    const result = await twilio.messages.create({ body: message, from: FROM, to });
    console.log(`[SMS SENT] To: ${to}`);
    return result;
  } catch (e) {
    console.error(`[SMS ERROR] ${e.message}`);
    return { error: e.message };
  }
}

async function sendNewLeadSMS(lead) {
  if (!lead.phone) return;
  const msg = `Hi ${lead.name}! This is Gold Hands Handyman. We received your request for ${lead.job_type || 'handyman service'}. We'll call you within 1 minute! 📞`;
  return sendSMS(lead.phone, msg);
}

async function sendBookingConfirmation(lead, job, tech) {
  if (!lead.phone) return;
  const msg = `Hi ${lead.name}! Your appointment is confirmed for ${job.scheduled_date} at ${job.scheduled_time}. Technician: ${tech.name}. Address: ${job.address}. Questions? Call 7375308110`;
  return sendSMS(lead.phone, msg);
}

async function sendTechnicianNotification(lead, job, tech) {
  if (!tech.phone) return;
  const msg = `New job: ${job.scheduled_date} at ${job.scheduled_time}. Client: ${lead.name} ${lead.phone}. Address: ${job.address}. Job: ${job.description || lead.job_type}`;
  return sendSMS(tech.phone, msg);
}

module.exports = { sendSMS, sendNewLeadSMS, sendBookingConfirmation, sendTechnicianNotification };
