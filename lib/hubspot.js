import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Dynamically retrieves and cleans the HubSpot token from process.env on every request.
 * Supports fallback variable names (HUBSPOT_PRIVATE_APP_TOKEN, HUBSPOT_ACCESS_TOKEN, HUBSPOT_TOKEN, HUBSPOT_API_KEY).
 */
export function getHubSpotToken() {
  const rawToken = 
    process.env.HUBSPOT_PRIVATE_APP_TOKEN ||
    process.env.HUBSPOT_ACCESS_TOKEN ||
    process.env.HUBSPOT_TOKEN ||
    process.env.HUBSPOT_API_KEY ||
    process.env.VITE_HUBSPOT_PRIVATE_APP_TOKEN;

  if (!rawToken) {
    return null;
  }

  // Trim whitespace, quotes, or trailing carriage returns
  const cleanedToken = rawToken.trim().replace(/^["']|["']$/g, '');
  return cleanedToken || null;
}

export const MISSING_TOKEN_ERROR = 
  'HubSpot token is not configured in environment variables. Please set HUBSPOT_PRIVATE_APP_TOKEN in your .env or host configuration.';
