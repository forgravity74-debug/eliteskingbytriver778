// JazPays Payment Gateway Integration
import { createHash } from 'crypto';

const JAZPAYS_CONFIG = {
  baseUrl: 'https://api.jazpays.com/v1/create',
  merchantId: process.env.JAZPAYS_MERCHANT_ID || '100222049',
  apiKey: process.env.JAZPAYS_API_KEY || 'b54849355bc9fe4b4ab33923e251c89d',
};

/**
 * Generate MD5 signature for JazPays API
 * 
 * Steps from JazPays docs:
 * 1. Collect: merchant_id, amount, merchant_order_no, callback_url
 * 2. Sort alphabetically → amount, callback_url, merchant_id, merchant_order_no
 * 3. Build string → amount=X&callback_url=X&merchant_id=X&merchant_order_no=X
 * 4. Append API key → ...&key=API_KEY
 * 5. MD5 hash → signature
 */
function generateSignature(merchant_id, amount, merchant_order_no, callback_url, apiKey) {
  const params = {};
  if (merchant_id) params.merchant_id = merchant_id;
  if (amount) params.amount = amount;
  if (merchant_order_no) params.merchant_order_no = merchant_order_no;
  if (callback_url) params.callback_url = callback_url;

  const sortedKeys = Object.keys(params).sort();

  let signStr = '';
  for (const key of sortedKeys) {
    signStr += `${key}=${params[key]}&`;
  }

  signStr += `key=${apiKey}`;

  return createHash('md5').update(signStr).digest('hex');
}

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { playerId, packageId, amount, price, name, email, phone } = JSON.parse(event.body || '{}');

    if (!playerId || !packageId || !price) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://eliteskins.in';
    const callbackUrl = `${siteUrl}/api/payment-callback`;

    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const merchantOrderNo = `ES_${playerId}_${Date.now()}${randomSuffix}`;

    const formattedAmount = parseFloat(price).toFixed(2);

    const signature = generateSignature(
      JAZPAYS_CONFIG.merchantId,
      formattedAmount,
      merchantOrderNo,
      callbackUrl,
      JAZPAYS_CONFIG.apiKey
    );

    const requestBody = {
      merchant_id: JAZPAYS_CONFIG.merchantId,
      api_key: JAZPAYS_CONFIG.apiKey,
      amount: formattedAmount,
      merchant_order_no: merchantOrderNo,
      callback_url: callbackUrl,
      signature: signature,
    };

    console.log(`[create-payment] JazPays payment for Player: ${playerId}, Amount: ₹${formattedAmount}, OrderNo: ${merchantOrderNo}`);

    const response = await fetch(JAZPAYS_CONFIG.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log(`[create-payment] JazPays response:`, JSON.stringify(data));

    // Handle various possible payment URL field names
    const payUrl = data.payment_url || data.payurl || data.pay_url || data.url;

    if ((data.success === true || data.status === 'success') && payUrl) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          paymentUrl: payUrl,
          method: 'redirect',
        }),
      };
    } else {
      console.error(`[create-payment] JazPays error:`, data.message || JSON.stringify(data));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: data.message || 'Payment gateway temporarily unavailable. Please try again.',
        }),
      };
    }
  } catch (error) {
    console.error('[create-payment] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create payment order. Please try again.' }),
    };
  }
}
