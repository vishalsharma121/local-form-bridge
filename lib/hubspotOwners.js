import { getHubSpotToken } from './hubspot.js';

let cachedOwners = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches all owners from HubSpot CRM (v3 API) with 5-minute caching.
 */
export async function getHubSpotOwners() {
  const now = Date.now();
  if (cachedOwners && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedOwners;
  }

  const token = getHubSpotToken();
  if (!token) return [];

  try {
    const res = await fetch('https://api.hubapi.com/crm/v3/owners/?limit=100', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ [HubSpotOwners] Failed to fetch owners: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    cachedOwners = data.results || [];
    lastCacheTime = now;
    return cachedOwners;
  } catch (err) {
    console.error('🔥 [HubSpotOwners] Error fetching HubSpot owners:', err);
    return [];
  }
}

/**
 * Finds a HubSpot Owner ID matching the given email address (case-insensitive).
 */
export async function getHubSpotOwnerIdByEmail(email) {
  if (!email || typeof email !== 'string') return null;

  const normalized = email.trim().toLowerCase();
  const owners = await getHubSpotOwners();

  const match = owners.find(o => 
    o.email?.toLowerCase() === normalized || 
    o.primaryEmail?.toLowerCase() === normalized
  );

  return match ? String(match.id) : null;
}

/**
 * Creates an engagement Note on a HubSpot object (company, deal, or contact).
 */
export async function createHubSpotNote({ objectType, objectId, noteText }) {
  const token = getHubSpotToken();
  if (!token || !objectId || !noteText) return false;

  const singularType = objectType === 'companies' ? 'company' : (objectType === 'contacts' ? 'contact' : (objectType === 'deals' ? 'deal' : objectType.replace(/s$/, '')));
  const assocTypeId = singularType === 'contact' ? 202 : (singularType === 'company' ? 200 : 214);

  try {
    // 1. Try atomic POST with associations
    const noteRes = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: noteText,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: String(objectId) },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: assocTypeId
              }
            ]
          }
        ]
      }),
    });

    if (noteRes.ok) {
      console.log(`📌 [HubSpotNotes] Created activity note on ${objectType} (${objectId}) via atomic POST`);
      return true;
    }

    // 2. Fallback: Create without associations then PUT association link
    const fallbackRes = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: noteText,
          hs_timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!fallbackRes.ok) {
      console.warn(`⚠️ [HubSpotNotes] Note creation failed: HTTP ${fallbackRes.status}`);
      return false;
    }

    const noteData = await fallbackRes.json();
    const noteId = noteData.id;

    let assocRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/notes/${noteId}/associations/${objectType}/${objectId}/note_to_${singularType}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`📌 [HubSpotNotes] Created activity note on ${objectType} (${objectId}) via PUT fallback: HTTP ${assocRes.status}`);
    return assocRes.ok;
  } catch (err) {
    console.error('🔥 [HubSpotNotes] Failed to create record note:', err);
    return false;
  }
}

function escapeRegExp(string) {
  return string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

/**
 * Scans HubSpot notes and updates creator/editor user names matching a user's email or old name.
 */
export async function syncHubSpotNotesForUser(userEmail, newUserName, oldUserName = '') {
  const token = getHubSpotToken();
  if (!token || !userEmail || !newUserName) return 0;

  try {
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/notes?limit=100&properties=hs_note_body', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) {
      console.warn(`⚠️ [HubSpotNotes] Failed to fetch notes for user update: HTTP ${searchRes.status}`);
      return 0;
    }

    const data = await searchRes.json();
    const notes = data.results || [];
    let updatedCount = 0;

    const normalizedEmail = userEmail.toLowerCase().trim();

    for (const note of notes) {
      const body = note.properties?.hs_note_body || '';
      const lowerBody = body.toLowerCase();

      const matchesEmail = lowerBody.includes(normalizedEmail);
      const matchesOldName = oldUserName && lowerBody.includes(oldUserName.toLowerCase().trim());

      if (matchesEmail || matchesOldName) {
        let updatedBody = body;

        if (matchesEmail) {
          const emailRegex = new RegExp(`((?:Created By|Creator|Editor):\\s*)([^\\(\\n\\•]+)(\\s*\\(${escapeRegExp(userEmail)}\\))`, 'gi');
          updatedBody = updatedBody.replace(emailRegex, `$1${newUserName}$3`);
        }

        if (oldUserName && oldUserName.trim() !== newUserName.trim()) {
          const nameRegex = new RegExp(`((?:Created By|Creator|Editor):\\s*)${escapeRegExp(oldUserName.trim())}`, 'gi');
          updatedBody = updatedBody.replace(nameRegex, `$1${newUserName.trim()}`);
        }

        if (updatedBody !== body) {
          const patchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/notes/${note.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: { hs_note_body: updatedBody }
            }),
          });
          if (patchRes.ok) {
            updatedCount++;
            console.log(`📌 [HubSpotNotes] Updated HubSpot Note ${note.id} creator to "${newUserName}"`);
          }
        }
      }
    }
    return updatedCount;
  } catch (err) {
    console.error('🔥 [HubSpotNotes] Failed to sync user notes in HubSpot:', err);
    return 0;
  }
}

