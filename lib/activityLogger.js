import { neon } from '@neondatabase/serverless';

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ [ActivityLogger] DATABASE_URL environment variable is missing.');
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  return neon(connectionString);
}

function mapRowToActivity(row) {
  if (!row) return null;

  const email = row.record_email || '';
  const name = email ? email.split('@')[0] : (row.target || 'Record');

  return {
    id: String(row.id),
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    status: row.status || 'success',
    type: row.target || 'contact',
    target: row.target || 'contact',
    operation: row.action || 'create',
    action: row.action || 'create',
    message: row.message || '',
    record_email: row.record_email || null,
    statusCode: row.status === 'success' ? 200 : 400,
    entityInfo: {
      email,
      cleanEmail: email,
      name
    },
    details: null
  };
}

export async function logSyncActivity({
  status = 'success',
  type = 'contact',
  operation = 'create',
  entityInfo = {},
  message = ''
}) {
  try {
    const sql = getSql();
    const email = entityInfo.email || entityInfo.cleanEmail || entityInfo.contactEmail || entityInfo.name || 'system@internal';
    const target = type || 'contact';
    const action = operation || 'create';
    const activityStatus = status || 'success';
    const msg = message || `${status === 'success' ? 'Successfully processed' : 'Failed'} ${target} ${action}`;

    const rows = await sql`
      INSERT INTO sync_activity (
        record_email,
        target,
        action,
        status,
        message
      ) VALUES (
        ${email},
        ${target},
        ${action},
        ${activityStatus},
        ${msg}
      )
      RETURNING *
    `;

    const entry = mapRowToActivity(rows[0]);
    console.log(`📡 [ActivityLogger] Logged DB activity (${activityStatus} ${target}/${action}): ${msg}`);
    return entry;
  } catch (err) {
    console.error('🔥 [ActivityLogger] Failed to log sync activity to DB:', err);
    return null;
  }
}

export async function getSyncActivities() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM sync_activity ORDER BY timestamp DESC
    `;
    return (rows || []).map(mapRowToActivity);
  } catch (err) {
    console.error('🔥 [ActivityLogger] Failed to fetch sync activities from DB:', err);
    return [];
  }
}

export async function clearSyncActivities() {
  try {
    const sql = getSql();
    await sql`TRUNCATE TABLE sync_activity`;
    return true;
  } catch (err) {
    console.error('🔥 [ActivityLogger] Failed to clear sync activities:', err);
    return false;
  }
}
