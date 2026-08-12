// Reads PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, PESAPAL_ENV from Netlify
// environment variables — never hardcode credentials here.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let amount, phone, email, name;
  try {
    const body = JSON.parse(event.body || '{}');
    amount = body.amount;
    phone = body.phone;
    email = body.email;
    name = body.name;
    if (!amount || !phone) throw new Error('amount and phone are required');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: e.message || 'Invalid request body' }) };
  }

  const BASE = process.env.PESAPAL_ENV === 'live'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';

  const siteUrl = process.env.URL || `https://${event.headers.host}`;

  try {
    // 1. Get a fresh auth token (valid ~5 minutes)
    const authRes = await fetch(`${BASE}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
      })
    });
    const authData = await authRes.json();
    if (!authData.token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'PesaPal authentication failed', detail: authData }) };
    }
    const token = authData.token;

    // 2. Register the IPN callback URL (PesaPal requires this before every order in this simple setup)
    const ipnRes = await fetch(`${BASE}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: `${siteUrl}/.netlify/functions/pesapal-ipn`,
        ipn_notification_type: 'GET'
      })
    });
    const ipnData = await ipnRes.json();
    const notificationId = ipnData.ipn_id;
    if (!notificationId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not register IPN', detail: ipnData }) };
    }

    // 3. Submit the order — returns a hosted payment page URL where the visitor picks M-Pesa
    const orderId = `donate-${Date.now()}`;
    const orderRes = await fetch(`${BASE}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: orderId,
        currency: 'KES',
        amount: Number(amount),
        description: 'Support Sheldon Kikechi',
        callback_url: `${siteUrl}/contact.html?donated=true`,
        notification_id: notificationId,
        billing_address: {
          email_address: email || 'guest@sheldonkikechi.com',
          phone_number: phone,
          country_code: 'KE',
          first_name: name || 'Guest',
          last_name: 'Supporter'
        }
      })
    });
    const orderData = await orderRes.json();
    if (!orderData.redirect_url) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not create order', detail: orderData }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_url: orderData.redirect_url })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
