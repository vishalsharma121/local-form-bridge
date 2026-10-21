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
  } catch {
    // Ignore if column already exists or table issue
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
      sql`SELECT record_id, lead_source, created_by, created_by_user_id, created_by_email FROM record_lead_sources;`,
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

        const isPortalAuthor = latestAuthor && !latestAuthor.toLowerCase().includes('hubspot') && !latestAuthor.toLowerCase().includes('public') && !latestAuthor.toLowerCase().includes('website');
        let resolvedSource = r.lead_source;
        if (isPortalAuthor || r.created_by_user_id) {
          resolvedSource = 'Admin Dashboard';
        } else if (latestAuthor === 'Public Lead Form' || (resolvedSource || '').toLowerCase().includes('website')) {
          resolvedSource = 'Website Form';
        } else if (!resolvedSource || resolvedSource === 'HubSpot CRM' || resolvedSource === 'HubSpot / Unknown') {
          resolvedSource = 'HubSpot Direct';
        }

        map[String(r.record_id)] = {
          source: resolvedSource,
          created_by: latestAuthor,
          created_by_user_id: r.created_by_user_id,
          created_by_email: r.created_by_email
        };
      }
    }
    return map;
  } catch (err) {
    console.warn('⚠️ [LeadSourceTracker] Failed to fetch lead sources map:', err.message);
    return {};
  }
}

