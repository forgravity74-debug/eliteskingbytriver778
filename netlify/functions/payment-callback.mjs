// JazPays Payment Webhook Callback Handler
// Webhook Payload: { orderNo, merchantOrder, status, amount, signature }

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Accept both POST and GET callbacks
  let params;
  if (event.httpMethod === 'POST') {
    try {
      const contentType = event.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        params = JSON.parse(event.body || '{}');
      } else {
        params = Object.fromEntries(new URLSearchParams(event.body || ''));
      }
    } catch {
      params = Object.fromEntries(new URLSearchParams(event.body || ''));
    }
  } else if (event.httpMethod === 'GET') {
    params = event.queryStringParameters || {};
  } else {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  console.log(`[payment-callback] JazPays webhook received:`, JSON.stringify(params));

  try {
    // Extract JazPays webhook fields
    const gatewayOrderNo = params.orderNo || '';
    const merchantOrder = params.merchantOrder || params.merchant_order_no || '';
    const status = params.status || '';
    const paymentAmount = params.amount || '';
    const callbackSignature = params.signature || '';

    console.log(`[payment-callback] Gateway Order: ${gatewayOrderNo}, Merchant Order: ${merchantOrder}, Status: ${status}, Amount: ${paymentAmount}`);

    // Validate: status must be "success"
    if (status === 'success') {
      console.log(`[payment-callback] ✅ Payment SUCCESS for order: ${merchantOrder} (Gateway: ${gatewayOrderNo}), Amount: ₹${paymentAmount}`);
      // TODO: Mark order as paid in your database, trigger skin delivery, etc.
    } else {
      console.log(`[payment-callback] ❌ Payment FAILED/PENDING for order: ${merchantOrder}, Status: ${status}`);
    }

    // Return "success" to acknowledge receipt and stop JazPays retries
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'success',
    };
  } catch (error) {
    console.error('[payment-callback] Error processing webhook:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Callback processing failed' }),
    };
  }
}
