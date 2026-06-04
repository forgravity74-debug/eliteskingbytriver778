// BGMI Player ID Verification via Rooter API (real in-game name lookup)

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { playerId } = JSON.parse(event.body || '{}');

    if (!playerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Player ID is required' }),
      };
    }

    if (!/^\d{8,12}$/.test(playerId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid Player ID format. Must be 8-12 digits.' }),
      };
    }

    console.log(`[verify-player] Fetching real BGMI name for ID: ${playerId}`);

    // Step 1: Get auth token from Rooter.gg
    const rooterResponse = await fetch('https://www.rooter.gg/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    });

    // Extract user_auth cookie from set-cookie headers
    const setCookies = rooterResponse.headers.getSetCookie ? rooterResponse.headers.getSetCookie() : [];
    // Fallback: try raw header
    let cookieHeader = setCookies;
    if (!cookieHeader || cookieHeader.length === 0) {
      const raw = rooterResponse.headers.get('set-cookie');
      if (raw) {
        cookieHeader = raw.split(/,(?=\s*\w+=)/);
      }
    }

    let accessToken = '';

    if (cookieHeader && cookieHeader.length > 0) {
      for (const cookie of cookieHeader) {
        if (cookie.includes('user_auth=')) {
          const match = cookie.match(/user_auth=([^;]+)/);
          if (match) {
            try {
              const decoded = decodeURIComponent(match[1]);
              const authData = JSON.parse(decoded);
              accessToken = authData.accessToken || '';
            } catch (e) {
              console.error('[verify-player] Failed to parse user_auth cookie:', e.message);
            }
          }
          if (accessToken) break;
        }
      }
    }

    if (!accessToken) {
      console.error('[verify-player] Failed to obtain Rooter auth token');
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Verification service temporarily unavailable. Please try again.',
        }),
      };
    }

    // Step 2: Query BGMI username via Rooter Bazaar API
    const usernameResponse = await fetch(
      `https://bazaar.rooter.io/order/getUnipinUsername?gameCode=BGMI_IN&id=${playerId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Device-Type': 'web',
          'App-Version': '1.0.0',
          'Device-Id': 'eliteskins-verify',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    const data = await usernameResponse.json();
    console.log(`[verify-player] Rooter API response:`, JSON.stringify(data));

    if (data.transaction === 'SUCCESS' && data.unipinRes?.username) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          name: data.unipinRes.username,
          message: 'ID Verified',
        }),
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: data.message || 'Player not found. Please check the UID and try again.',
        }),
      };
    }
  } catch (error) {
    console.error('[verify-player] Error:', error.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Verification service error. Please try again.',
      }),
    };
  }
}
