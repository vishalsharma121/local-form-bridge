import { neon } from '@neondatabase/serverless';

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  return neon(connectionString);
}

/**
 * Ensures created_by, created_by_user_id, and created_by_email columns exist in record_lead_sources.
 */
async function ensureColumns(sql) {
  try {
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS created_by TEXT;
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS created_by_email TEXT;
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS assigned_to TEXT;
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER;
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS assigned_user_email TEXT;
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `;
    await sql`
      ALTER TABLE record_lead_sources ADD COLUMN IF NOT EXISTS assigned_by TEXT;
    `;
  } catch {
    // Ignore if column already exists or table issue
  }
}

/**
 * Assigns or reassigns a deal to a specific sales team member.
 * Non-destructive: preserves existing lead source and creation history.
 * @param {string} recordId - HubSpot Deal ID
 * @param {number|null} assignedUserId - User ID of assigned team member
 * @param {string|null} assignedTo - Full name of assigned team member
 * @param {string|null} assignedUserEmail - Email of assigned team member
 * @param {string} assignedBy - Name of admin/manager who assigned the deal
 */
export async function assignDeal(recordId, assignedUserId, assignedTo, assignedUserEmail, assignedBy = 'Admin') {
  if (!recordId) return;
  try {
    const sql = getSql();
    if (!sql) return;

    await ensureColumns(sql);

    const uId = assignedUserId ? Number(assignedUserId) : null;
    const uEmail = assignedUserEmail ? assignedUserEmail.toLowerCase().trim() : null;
    const isClearing = !uId && !assignedTo && !uEmail;
    const targetName = isClearing ? null : (assignedTo || (uEmail ? uEmail.split('@')[0] : 'Team Member'));

    await sql`
      INSERT INTO record_lead_sources (record_id, object_type, lead_source, assigned_to, assigned_user_id, assigned_user_email, assigned_by, assigned_at)
      VALUES (${String(recordId)}, 'deal', 'HubSpot Direct', ${targetName}, ${uId}, ${uEmail}, ${assignedBy}, NOW())
      ON CONFLICT (record_id) DO UPDATE SET
        assigned_to = EXCLUDED.assigned_to,
        assigned_user_id = EXCLUDED.assigned_user_id,
        assigned_user_email = EXCLUDED.assigned_user_email,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = NOW();
    `;
    console.log(`📌 [LeadSourceTracker] ${isClearing ? 'Cleared handler on' : 'Assigned'} deal ${recordId}${isClearing ? '' : ` to "${targetName}" (id: ${uId})`} by "${assignedBy}"`);
  } catch (err) {
    console.warn(`⚠️ [LeadSourceTracker] Failed to assign deal ${recordId}:`, err.message);
  }
}

/**
 * Saves a record's lead source & creator user details to Postgres database.
 * @param {string} recordId - HubSpot object ID
 * @param {string} objectType - 'contact' | 'company' | 'deal'
 * @param {string} leadSource - 'Website Form' | 'Admin Dashboard'
 * @param {string} createdBy - Name of creator user (e.g. 'dev starkedgee')
 * @param {number|null} userId - User ID of creator
 * @param {string|null} userEmail - Email of creator
 */
export async function recordLeadSource(recordId, objectType, leadSource, createdBy = null, userId = null, userEmail = null) {
  if (!recordId) return;
  try {
    const sql = getSql();
    if (!sql) return;

    await ensureColumns(sql);

    const author = createdBy || (leadSource === 'Website Form' ? 'Public Lead Form' : 'Admin User');
    const uId = userId ? Number(userId) : null;
    const uEmail = userEmail ? userEmail.toLowerCase().trim() : null;

    await sql`
      INSERT INTO record_lead_sources (record_id, object_type, lead_source, created_by, created_by_user_id, created_by_email)
      VALUES (${String(recordId)}, ${objectType}, ${leadSource}, ${author}, ${uId}, ${uEmail})
      ON CONFLICT (record_id) DO UPDATE SET 
        lead_source = CASE
          WHEN record_lead_sources.lead_source IN ('Admin Dashboard', 'Bridge Portal', 'Website Form') THEN record_lead_sources.lead_source
          ELSE COALESCE(EXCLUDED.lead_source, record_lead_sources.lead_source)
        END,
        created_by = CASE
          WHEN record_lead_sources.created_by_user_id IS NOT NULL THEN record_lead_sources.created_by
          ELSE COALESCE(EXCLUDED.created_by, record_lead_sources.created_by)
        END,
        created_by_user_id = COALESCE(record_lead_sources.created_by_user_id, EXCLUDED.created_by_user_id),
        created_by_email = COALESCE(record_lead_sources.created_by_email, EXCLUDED.created_by_email);
    `;
    console.log(`📌 [LeadSourceTracker] Tracked source for ${objectType} ${recordId}: "${leadSource}" by "${author}" (user ${uId}/${uEmail})`);
  } catch (err) {
    console.warn(`⚠️ [LeadSourceTracker] Failed to record lead source for ${recordId}:`, err.message);
  }
}

/**
 * Retrieves a mapping of recordId -> { lead_source, created_by } for all stored records.
 * Dynamically resolves creator user names against live app_users table.
 * @returns {Promise<Record<string, { source: string, created_by: string }>>}
 */
export async function getLeadSourcesMap() {
  try {
    const sql = getSql();
    if (!sql) return {};

    await ensureColumns(sql);

    const [rows, users] = await Promise.all([
      sql`SELECT record_id, object_type, lead_source, created_by, created_by_user_id, created_by_email, assigned_to, assigned_user_id, assigned_user_email, assigned_at, assigned_by FROM record_lead_sources;`,
      sql`SELECT id, name, email FROM app_users;`.catch(() => [])
    ]);

    const userByIdMap = {};
    const userByEmailMap = {};
    const userByNameMap = {};

    if (Array.isArray(users)) {
      for (const u of users) {
        if (u.id) userByIdMap[Number(u.id)] = u.name;
        if (u.email) userByEmailMap[u.email.toLowerCase().trim()] = u.name;
        if (u.name) userByNameMap[u.name.toLowerCase().trim()] = u.name;
      }
    }

    // Historical legacy name aliases mapping to active users
    const legacyNameMap = {
      'vishal view profile': userByEmailMap['dev@starkedge.com'] || userByNameMap['dev starkedgee'] || 'dev starkedgee',
      'vishuss': userByEmailMap['vishu@gmail.com'] || 'vishu'
    };

    const map = {};
    for (const r of rows) {
      if (r.record_id) {
        let rawAuthor = r.created_by || (r.lead_source === 'Website Form' ? 'Public Lead Form' : 'Admin User');
        let latestAuthor = rawAuthor;

        // 1. Match by user ID if available
        if (r.created_by_user_id && userByIdMap[Number(r.created_by_user_id)]) {
          latestAuthor = userByIdMap[Number(r.created_by_user_id)];
        }
        // 2. Match by email if available
        else if (r.created_by_email && userByEmailMap[r.created_by_email.toLowerCase().trim()]) {
          latestAuthor = userByEmailMap[r.created_by_email.toLowerCase().trim()];
        }
        // 3. Match by current name in app_users
        else if (userByNameMap[rawAuthor.toLowerCase().trim()]) {
          latestAuthor = userByNameMap[rawAuthor.toLowerCase().trim()];
        }
        // 4. Match by legacy alias map
        else if (legacyNameMap[rawAuthor.toLowerCase().trim()]) {
          latestAuthor = legacyNameMap[rawAuthor.toLowerCase().trim()];
        }

        let resolvedSource = r.lead_source;
        const isPortalAuthor = Boolean(r.created_by_user_id || r.lead_source === 'Admin Dashboard' || r.lead_source === 'Bridge Portal');
        if (isPortalAuthor) {
          resolvedSource = 'Admin Dashboard';
        } else if (r.lead_source === 'Website Form' || latestAuthor === 'Public Lead Form' || (resolvedSource || '').toLowerCase().includes('website')) {
          resolvedSource = 'Website Form';
        } else if ((resolvedSource || '').toLowerCase().includes('webhook')) {
          resolvedSource = 'HubSpot Webhook';
        } else if (!resolvedSource || resolvedSource === 'HubSpot CRM' || resolvedSource === 'HubSpot / Unknown' || resolvedSource === 'HubSpot Direct') {
          resolvedSource = 'HubSpot Direct';
        }

        let resolvedAssignee = r.assigned_to;
        if (r.assigned_user_id && userByIdMap[Number(r.assigned_user_id)]) {
          resolvedAssignee = userByIdMap[Number(r.assigned_user_id)];
        } else if (r.assigned_user_email && userByEmailMap[r.assigned_user_email.toLowerCase().trim()]) {
          resolvedAssignee = userByEmailMap[r.assigned_user_email.toLowerCase().trim()];
        }

        map[String(r.record_id)] = {
          object_type: r.object_type || null,
          source: resolvedSource,
          created_by: latestAuthor,
          created_by_user_id: r.created_by_user_id,
          created_by_email: r.created_by_email,
          assigned_to: resolvedAssignee || null,
          assigned_user_id: r.assigned_user_id ? Number(r.assigned_user_id) : null,
          assigned_user_email: r.assigned_user_email || null,
          assigned_at: r.assigned_at || null,
          assigned_by: r.assigned_by || null
        };
      }
    }
    return map;
  } catch (err) {
    console.warn('⚠️ [LeadSourceTracker] Failed to fetch lead sources map:', err.message);
    return {};
  }
}

