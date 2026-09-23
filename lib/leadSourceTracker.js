import { neon } from '@neondatabase/serverless';

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  return neon(connectionString);
}

/**
 * Saves a record's lead source to Postgres database.
 * @param {string} recordId - HubSpot object ID
 * @param {string} objectType - 'contact' | 'company' | 'deal'
 * @param {string} leadSource - 'Website Form' | 'Admin Dashboard'
 */
export async function recordLeadSource(recordId, objectType, leadSource) {
  if (!recordId) return;
  try {
    const sql = getSql();
    if (!sql) return;

    await sql`
      INSERT INTO record_lead_sources (record_id, object_type, lead_source)
      VALUES (${String(recordId)}, ${objectType}, ${leadSource})
      ON CONFLICT (record_id) DO UPDATE SET lead_source = ${leadSource};
    `;
    console.log(`📌 [LeadSourceTracker] Tracked source for ${objectType} ${recordId}: "${leadSource}"`);
  } catch (err) {
    console.warn(`⚠️ [LeadSourceTracker] Failed to record lead source for ${recordId}:`, err.message);
  }
}

/**
 * Retrieves a mapping of recordId -> leadSource for all stored records.
 * @returns {Promise<Record<string, string>>}
 */
export async function getLeadSourcesMap() {
  try {
    const sql = getSql();
    if (!sql) return {};

    const rows = await sql`
      SELECT record_id, lead_source FROM record_lead_sources;
    `;

    const map = {};
    for (const r of rows) {
      if (r.record_id && r.lead_source) {
        map[String(r.record_id)] = r.lead_source;
      }
    }
    return map;
  } catch (err) {
    console.warn('⚠️ [LeadSourceTracker] Failed to fetch lead sources map:', err.message);
    return {};
  }
}
