import { getHubSpotToken } from './hubspot.js';
import { listUsers } from './userAuth.js';

export const HUBSPOT_HANDLER_PROPERTY = 'deal_handled_by';

let knownSyncedValues = new Set();
let lastSyncTimestamp = 0;
const SYNC_CACHE_MS = 5 * 60 * 1000; // 5 minutes

export function getHandlerOptionValue(userId) {
  if (!userId && userId !== 0) return '';
  const num = Number(userId);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `user_${num}`;
}

export function parseHandlerUserId(rawValue) {
  if (!rawValue) return null;
  const match = String(rawValue).trim().match(/^user_(\d+)$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Syncs all Bridge App team members (app_users) into HubSpot's `deal_handled_by` dropdown options.
 * - Active users: { value: "user_<id>", label: "<name>", hidden: false }
 * - Inactive users: { value: "user_<id>", label: "<name> (Inactive)", hidden: true }
 * - Deleted users or manual HubSpot options: preserved safely (never deleted) so historical deals stay intact.
 */
export async function syncTeamMembersToHubSpotDealProperty(usersInput = null) {
  const token = getHubSpotToken();
  if (!token) {
    return { synced: false, error: 'HubSpot token not configured' };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Read existing HubSpot property definition (non-destructive merge)
    const getRes = await fetch(
      `https://api.hubapi.com/crm/v3/properties/deals/${HUBSPOT_HANDLER_PROPERTY}`,
      { headers }
    );

    if (getRes.status === 404) {
      console.warn(`⚠️ [HubSpotDealHandlers] Property "${HUBSPOT_HANDLER_PROPERTY}" does not exist in HubSpot yet.`);
      return { synced: false, missingProperty: true, error: `Property "${HUBSPOT_HANDLER_PROPERTY}" not found in HubSpot.` };
    }

    if (!getRes.ok) {
      const errText = await getRes.text();
      console.warn(`⚠️ [HubSpotDealHandlers] Could not read "${HUBSPOT_HANDLER_PROPERTY}" (HTTP ${getRes.status}):`, errText);
      return { synced: false, error: `HTTP ${getRes.status}: ${errText}` };
    }

    const propDef = await getRes.json();
    const existingOptions = Array.isArray(propDef.options) ? propDef.options : [];
    const existingByValue = new Map();
    for (const opt of existingOptions) {
      if (opt && opt.value) {
        existingByValue.set(String(opt.value), opt);
      }
    }

    // 2. Load current app_users from Neon Postgres
    const users = Array.isArray(usersInput) ? usersInput : await listUsers();
    const activeUsers = users.filter(u => Boolean(u.is_active));
    const activeValues = new Set();
    const mergedOptions = [];
    let displayOrder = 0;

    // 3. Upsert all active users first (clean ordering in HubSpot dropdown)
    for (const u of activeUsers) {
      const val = getHandlerOptionValue(u.id);
      if (!val || activeValues.has(val)) continue;
      activeValues.add(val);

      const cleanLabel = (u.name || u.email || `User ${u.id}`).trim();
      mergedOptions.push({
        label: cleanLabel,
        value: val,
        displayOrder: displayOrder++,
        hidden: false
      });
    }

    // 4. Preserve any custom non-Bridge options created in HubSpot directly
    // (options that do NOT follow the pattern 'user_<id>')
    for (const [val, opt] of existingByValue.entries()) {
      if (!val || activeValues.has(val)) continue;
      const isBridgeUser = /^user_\d+$/i.test(val);
      // If it's a custom non-Bridge option created in HubSpot, preserve it
      if (!isBridgeUser) {
        activeValues.add(val);
        mergedOptions.push({
          label: (opt.label || val).trim(),
          value: val,
          displayOrder: displayOrder++,
          hidden: Boolean(opt.hidden)
        });
      }
      // If it IS a Bridge user option (^user_\d+$) but not in activeUsers (deleted or inactive),
      // we omit it so HubSpot permanently deletes it from the dropdown options.
    }

    if (mergedOptions.length === 0) {
      return { synced: true, count: 0, activeCount: 0 };
    }

    // 6. PATCH HubSpot property options
    const patchRes = await fetch(
      `https://api.hubapi.com/crm/v3/properties/deals/${HUBSPOT_HANDLER_PROPERTY}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ options: mergedOptions })
      }
    );

    if (!patchRes.ok) {
      const errData = await patchRes.json().catch(() => ({}));
      console.error(`❌ [HubSpotDealHandlers] Failed to update "${HUBSPOT_HANDLER_PROPERTY}" options (HTTP ${patchRes.status}):`, errData);
      return { synced: false, error: errData.message || `HTTP ${patchRes.status}` };
    }

    knownSyncedValues = new Set(mergedOptions.filter(o => !o.hidden).map(o => o.value));
    lastSyncTimestamp = Date.now();

    console.log(`✅ [HubSpotDealHandlers] Synced ${activeUsers.length} active (${mergedOptions.length} total) options to HubSpot "${HUBSPOT_HANDLER_PROPERTY}"`);
    return {
      synced: true,
      activeCount: activeUsers.length,
      totalCount: mergedOptions.length
    };
  } catch (err) {
    console.error('🔥 [HubSpotDealHandlers] Unexpected sync error:', err);
    return { synced: false, error: err.message };
  }
}

/**
 * Ensures the given userId's `user_<id>` option exists in HubSpot's `deal_handled_by` dropdown before writing it to a deal.
 */
export async function ensureHandlerOptionInHubSpot(userId) {
  const val = getHandlerOptionValue(userId);
  if (!val) return true;

  const now = Date.now();
  if (knownSyncedValues.has(val) && (now - lastSyncTimestamp < SYNC_CACHE_MS)) {
    return true;
  }

  const res = await syncTeamMembersToHubSpotDealProperty();
  return Boolean(res.synced);
}

/**
 * Updates `deal_handled_by` on one or more deals in HubSpot CRM without touching any other deal properties.
 * Supports clearing the handler when `assignedUserId` is null/empty.
 */
export async function updateHubSpotDealHandlers(dealIds, assignedUserIdsOrId) {
  const ids = (Array.isArray(dealIds) ? dealIds : [dealIds]).map(id => String(id)).filter(Boolean);
  if (ids.length === 0) return { success: true, count: 0 };

  const token = getHubSpotToken();
  if (!token) {
    return { success: false, error: 'HubSpot token not configured' };
  }

  // Handle single ID, array of IDs, or semicolon string e.g. "user_1;user_3"
  const rawIds = Array.isArray(assignedUserIdsOrId)
    ? assignedUserIdsOrId
    : (assignedUserIdsOrId ? [assignedUserIdsOrId] : []);

  const validIds = [];
  for (const item of rawIds) {
    if (typeof item === 'string' && item.includes(';')) {
      const parts = item.split(';').map(p => parseHandlerUserId(p) || p.trim()).filter(Boolean);
      validIds.push(...parts);
    } else {
      const parsed = parseHandlerUserId(item) || (Number(item) ? Number(item) : item);
      if (parsed) validIds.push(parsed);
    }
  }

  // Deduplicate user IDs
  const uniqueIds = Array.from(new Set(validIds.map(id => String(id))));

  let optionValue = '';
  if (uniqueIds.length > 0) {
    for (const uid of uniqueIds) {
      if (Number(uid)) {
        await ensureHandlerOptionInHubSpot(Number(uid));
      }
    }
    optionValue = uniqueIds.map(uid => getHandlerOptionValue(uid)).join(';');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  async function executeWrite() {
    if (ids.length === 1) {
      const res = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${ids[0]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: {
            [HUBSPOT_HANDLER_PROPERTY]: optionValue
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    }

    // Batch update in chunks of 100 (HubSpot batch limit)
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/batch/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: chunk.map(id => ({
            id,
            properties: {
              [HUBSPOT_HANDLER_PROPERTY]: optionValue
            }
          }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, status: res.status, data };
      }
    }
    return { ok: true, status: 200, data: {} };
  }

  let attempt = await executeWrite();

  // Self-healing retry: if option was missing in HubSpot dropdown, sync options and retry once
  if (!attempt.ok && attempt.status === 400 && optionValue) {
    console.warn(`⚠️ [HubSpotDealHandlers] 400 error writing "${optionValue}"; refreshing HubSpot dropdown options and retrying once...`);
    knownSyncedValues.clear();
    await syncTeamMembersToHubSpotDealProperty();
    attempt = await executeWrite();
  }

  if (!attempt.ok) {
    const errMsg = attempt.data?.message || `HubSpot HTTP ${attempt.status}`;
    console.error(`❌ [HubSpotDealHandlers] Failed to update HubSpot deal(s):`, errMsg);
    return { success: false, error: errMsg, status: attempt.status };
  }

  console.log(`✅ [HubSpotDealHandlers] Updated HubSpot "${HUBSPOT_HANDLER_PROPERTY}" = "${optionValue || '(cleared)'}" on ${ids.length} deal(s)`);
  return { success: true, count: ids.length, value: optionValue };
}

/**
 * Resolves a deal's handler cleanly from HubSpot's `deal_handled_by` property using live app_users lookup.
 * HubSpot `deal_handled_by` is the authoritative two-way source of truth:
 * - "user_<id>" -> resolves live name & email from app_users (immune to renames!)
 * - custom name/email string -> matches app_users by email or name if possible, else preserves label
 * - empty / null -> unassigned (null)
 */
export function resolveDealHandlerFromHubSpot(hubspotRawValue, usersById = {}, usersByEmail = {}, usersByName = {}) {
  const raw = hubspotRawValue ? String(hubspotRawValue).trim() : '';
  if (!raw) {
    return {
      assigned_user_id: null,
      assigned_to: null,
      assigned_user_email: null,
      assigned_user_ids: [],
      assigned_handlers: []
    };
  }

  // Support multiple semicolon-delimited values (e.g. "user_1;user_3")
  const rawParts = raw.split(';').map(p => p.trim()).filter(Boolean);
  const resolvedHandlers = [];

  for (const part of rawParts) {
    const parsedId = parseHandlerUserId(part);
    if (parsedId !== null) {
      const user = usersById[parsedId];
      if (user) {
        resolvedHandlers.push({
          id: Number(user.id),
          name: user.name || user.email,
          email: user.email ? user.email.toLowerCase().trim() : null
        });
        continue;
      }
      resolvedHandlers.push({
        id: parsedId,
        name: `User #${parsedId}`,
        email: null
      });
      continue;
    }

    const lower = part.toLowerCase();
    const byEmail = usersByEmail[lower];
    if (byEmail) {
      resolvedHandlers.push({
        id: Number(byEmail.id),
        name: byEmail.name || byEmail.email,
        email: byEmail.email ? byEmail.email.toLowerCase().trim() : null
      });
      continue;
    }

    const byName = usersByName[lower];
    if (byName) {
      resolvedHandlers.push({
        id: Number(byName.id),
        name: byName.name || byName.email,
        email: byName.email ? byName.email.toLowerCase().trim() : null
      });
      continue;
    }

    resolvedHandlers.push({
      id: null,
      name: part,
      email: null
    });
  }

  if (resolvedHandlers.length === 0) {
    return {
      assigned_user_id: null,
      assigned_to: null,
      assigned_user_email: null,
      assigned_user_ids: [],
      assigned_handlers: []
    };
  }

  const assignedUserIds = resolvedHandlers.map(h => h.id).filter(id => id !== null);
  const names = resolvedHandlers.map(h => h.name).filter(Boolean);
  const emails = resolvedHandlers.map(h => h.email).filter(Boolean);

  return {
    assigned_user_id: assignedUserIds[0] || null,
    assigned_to: names.join(', '),
    assigned_user_email: emails[0] || null,
    assigned_user_ids: assignedUserIds,
    assigned_user_emails: emails,
    assigned_handlers: resolvedHandlers
  };
}
