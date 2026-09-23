import { neon } from '@neondatabase/serverless';

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ [ErrorLogger] DATABASE_URL environment variable is missing.');
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  return neon(connectionString);
}

// Helper to map Postgres row to API / Frontend expected object shape
function mapRowToErrorLog(row) {
  if (!row) return null;

  const email = row.record_email || '';
  const name = email ? email.split('@')[0] : (row.target || 'Record');
  const autoRetryAttempts = Number(row.auto_retry_attempts || 0);

  let status = row.status;
  if (!status) {
    if (row.resolved) {
      status = 'resolved';
    } else if (autoRetryAttempts >= 3) {
      status = 'failed';
    } else {
      status = 'pending';
    }
  }

  return {
    id: String(row.id),
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    type: row.target || 'contact',
    target: row.target || 'contact',
    operation: row.action || 'create',
    action: row.action || 'create',
    errorMessage: row.error_message || '',
    error_message: row.error_message || '',
    statusCode: 500,
    resolved: Boolean(row.resolved),
    status,
    retryCount: Number(row.retry_count || 0),
    retry_count: Number(row.retry_count || 0),
    autoRetryAttempts,
    auto_retry_attempts: autoRetryAttempts,
    lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at).toISOString() : null,
    last_retry_at: row.last_retry_at ? new Date(row.last_retry_at).toISOString() : null,
    record_email: row.record_email || null,
    contact_id: row.contact_id || null,
    company_id: row.company_id || null,
    entityInfo: {
      email,
      cleanEmail: email,
      name,
      contactId: row.contact_id || null,
      companyId: row.company_id || null
    },
    details: null
  };
}

export async function logSyncError({
  type = 'contact',
  operation = 'create',
  entityInfo = {},
  errorMessage = 'Sync failed'
}) {
  try {
    const sql = getSql();
    const email = entityInfo.email || entityInfo.cleanEmail || null;
    const contactId = entityInfo.contactId || entityInfo.contact_id || null;
    const companyId = entityInfo.companyId || entityInfo.company_id || null;
    const target = type || 'contact';
    const action = operation || 'create';
    const msg = errorMessage || 'Sync failed';

    const rows = await sql`
      INSERT INTO sync_errors (
        record_email,
        target,
        action,
        error_message,
        contact_id,
        company_id,
        auto_retry_attempts,
        status,
        resolved
      ) VALUES (
        ${email},
        ${target},
        ${action},
        ${msg},
        ${contactId},
        ${companyId},
        0,
        'pending',
        false
      )
      RETURNING *
    `;

    const logEntry = mapRowToErrorLog(rows[0]);
    console.log(`📌 [ErrorLogger] Logged DB error (${target}/${action}): ${msg}`);
    return logEntry;
  } catch (err) {
    console.error('🔥 [ErrorLogger] Failed to log sync error to DB:', err);
    return null;
  }
}

export async function getErrorLogs(filters = {}) {
  try {
    const sql = getSql();
    const { resolved, target, status } = filters || {};

    let rows;
    const hasResolved = resolved !== undefined && resolved !== null && resolved !== '';
    const isResolved = Boolean(resolved === true || resolved === 'true');

    if (hasResolved && target && status) {
      rows = await sql`SELECT * FROM sync_errors WHERE resolved = ${isResolved} AND target = ${target} AND status = ${status} ORDER BY timestamp DESC`;
    } else if (hasResolved && target) {
      rows = await sql`SELECT * FROM sync_errors WHERE resolved = ${isResolved} AND target = ${target} ORDER BY timestamp DESC`;
    } else if (hasResolved && status) {
      rows = await sql`SELECT * FROM sync_errors WHERE resolved = ${isResolved} AND status = ${status} ORDER BY timestamp DESC`;
    } else if (hasResolved) {
      rows = await sql`SELECT * FROM sync_errors WHERE resolved = ${isResolved} ORDER BY timestamp DESC`;
    } else if (target && status) {
      rows = await sql`SELECT * FROM sync_errors WHERE target = ${target} AND status = ${status} ORDER BY timestamp DESC`;
    } else if (target) {
      rows = await sql`SELECT * FROM sync_errors WHERE target = ${target} ORDER BY timestamp DESC`;
    } else if (status) {
      rows = await sql`SELECT * FROM sync_errors WHERE status = ${status} ORDER BY timestamp DESC`;
    } else {
      rows = await sql`SELECT * FROM sync_errors ORDER BY timestamp DESC`;
    }

    return (rows || []).map(mapRowToErrorLog);
  } catch (err) {
    console.error('🔥 [ErrorLogger] Failed to fetch error logs from DB:', err);
    return [];
  }
}

export async function getPendingAutoRetryLogs() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM sync_errors 
      WHERE resolved = false 
        AND (status IS NULL OR status IN ('pending', 'retrying'))
        AND COALESCE(auto_retry_attempts, 0) < 3
      ORDER BY timestamp ASC
      LIMIT 20
    `;
    return (rows || []).map(mapRowToErrorLog);
  } catch (err) {
    console.error('🔥 [ErrorLogger] Failed to fetch pending auto-retry logs:', err);
    return [];
  }
}

export async function recordAutoRetryAttempt(id, { success, errorMessage, currentAttempts = 0 }) {
  if (!id) return null;
  try {
    const sql = getSql();
    const nextAttempts = currentAttempts + 1;
    const isResolved = Boolean(success);
    const nextStatus = isResolved ? 'resolved' : (nextAttempts >= 3 ? 'failed' : 'pending');

    const rows = await sql`
      UPDATE sync_errors 
      SET auto_retry_attempts = ${nextAttempts},
          retry_count = retry_count + 1,
          last_retry_at = NOW(),
          status = ${nextStatus},
          resolved = ${isResolved},
          error_message = ${errorMessage || 'Auto-retry executed'}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows.length > 0 ? mapRowToErrorLog(rows[0]) : null;
  } catch (err) {
    console.error(`🔥 [ErrorLogger] Failed to record auto-retry attempt for ID ${id}:`, err);
    return null;
  }
}

export async function getErrorLogById(id) {
  if (!id) return null;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM sync_errors WHERE id = ${id} LIMIT 1
    `;
    return rows.length > 0 ? mapRowToErrorLog(rows[0]) : null;
  } catch (err) {
    console.error(`🔥 [ErrorLogger] Failed to get error log by ID ${id}:`, err);
    return null;
  }
}

export async function markErrorResolved(id) {
  if (!id) return false;
  try {
    const sql = getSql();
    const rows = await sql`
      UPDATE sync_errors 
      SET resolved = true,
          status = 'resolved'
      WHERE id = ${id}
      RETURNING id
    `;
    const success = rows.length > 0;
    if (!success) {
      console.warn(`⚠️ [ErrorLogger] markErrorResolved: No row found with ID '${id}' to mark resolved.`);
    }
    return success;
  } catch (err) {
    console.error(`🔥 [ErrorLogger] CRITICAL: markErrorResolved failed for ID '${id}':`, err);
    return false;
  }
}

export async function removeErrorLog(id) {
  return await markErrorResolved(id);
}

export async function incrementRetryAttempt(id, updates = {}) {
  if (!id) return null;
  try {
    const sql = getSql();
    const newMsg = updates.errorMessage || updates.error_message || null;

    let rows;
    if (newMsg) {
      rows = await sql`
        UPDATE sync_errors 
        SET retry_count = retry_count + 1,
            last_retry_at = NOW(),
            error_message = ${newMsg}
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      rows = await sql`
        UPDATE sync_errors 
        SET retry_count = retry_count + 1,
            last_retry_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }

    return rows.length > 0 ? mapRowToErrorLog(rows[0]) : null;
  } catch (err) {
    console.error(`🔥 [ErrorLogger] Failed to increment retry attempt for ID ${id}:`, err);
    return null;
  }
}

export async function updateErrorLog(id, updates = {}) {
  return await incrementRetryAttempt(id, updates);
}

export async function clearErrorLogs() {
  try {
    const sql = getSql();
    await sql`DELETE FROM sync_errors`;
    return true;
  } catch (err) {
    console.error('🔥 [ErrorLogger] Failed to clear error logs:', err);
    return false;
  }
}

