exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    console.log('M-PESA Callback:', event.body);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ResultCode: 0, ResultDesc: 'Callback received successfully' })
    };
  } catch (err) {
    console.error('callback error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'callback handler error' }) };
  }
};
