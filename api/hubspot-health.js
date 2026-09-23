import { getHubSpotToken } from '../lib/hubspot.js';

let cachedHealth = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 5000; // 5-second cache to prevent HubSpot API rate limits on fast polling

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = Date.now();
  if (cachedHealth && now - lastCheckTime < CACHE_TTL_MS) {
    return res.status(200).json(cachedHealth);
  }

  try {
    const token = getHubSpotToken();
    if (!token) {
      cachedHealth = {
        connected: false,
        status: 'UNCONFIGURED',
        message: 'HubSpot token is not configured in environment variables (HUBSPOT_PRIVATE_APP_TOKEN).'
      };
      lastCheckTime = now;
      return res.status(200).json(cachedHealth);
    }

    // Ping HubSpot CRM v3 API with minimal payload
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      cachedHealth = {
        connected: true,
        status: 'HEALTHY',
        message: 'HubSpot API is connected and operational.'
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      let msg = errData.message;
      if (response.status === 401 || response.status === 403) {
        msg = `Authentication Failed (HTTP ${response.status}): Token is invalid or unauthorized.`;
      } else if (response.status >= 500) {
        msg = `HubSpot Outage (HTTP ${response.status}): HubSpot CRM is temporarily unavailable.`;
      } else if (!msg) {
        msg = `HubSpot API error (HTTP ${response.status}).`;
      }

      cachedHealth = {
        connected: false,
        status: response.status === 401 || response.status === 403 ? 'UNAUTHORIZED' : 'ERROR',
        message: msg
      };
    }
  } catch (err) {
    console.error('🔥 [API] HubSpot health check network error:', err);
    cachedHealth = {
      connected: false,
      status: 'NETWORK_ERROR',
      message: `Network/connection error: ${err.message || 'Failed to connect to HubSpot API'}`
    };
  }

  lastCheckTime = now;
  return res.status(200).json(cachedHealth);
}
