const axios = require('axios');

function formatPhone(p) {
  p = (p || '').replace(/\D/g, '');
  if (p.length === 10 && p.startsWith('0')) return '254' + p.slice(1);
  if (p.length === 9 && p.startsWith('7')) return '254' + p;
  if (p.length === 12 && p.startsWith('254')) return p;
  throw new Error('Invalid phone format');
}

function getNairobiTimestamp() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000); // UTC+3
  const pad = n => String(n).padStart(2, '0');
  return d.getUTCFullYear()
    + pad(d.getUTCMonth() + 1)
    + pad(d.getUTCDate())
    + pad(d.getUTCHours())
    + pad(d.getUTCMinutes())
    + pad(d.getUTCSeconds());
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const body = JSON.parse(event.body || '{}');
    const phone = body.phone;
    const amount = Number(body.amount || 0);

    if (!phone || !amount) {
      return { statusCode: 400, body: JSON.stringify({ error: 'phone and amount are required' }) };
    }

    let msisdn;
    try { msisdn = formatPhone(phone); } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid phone format' }) };
    }

    // === Get access token ===
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;
    const basic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${basic}` }
    });
    const token = tokenRes.data.access_token;

    // === STK push payload ===
    const shortcode = process.env.SHORTCODE;
    const passkey = process.env.PASSKEY;
    const timestamp = getNairobiTimestamp();
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
    const callbackUrl = process.env.CALLBACK_URL;

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: msisdn,
      PartyB: shortcode,
      PhoneNumber: msisdn,
      CallBackURL: callbackUrl,
      AccountReference: "TFXGStore",
      TransactionDesc: "Robot purchase"
    };

    const stkRes = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stkRes.data)
    };

  } catch (err) {
    console.error('pay function error', err.response?.data || err.message || err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
