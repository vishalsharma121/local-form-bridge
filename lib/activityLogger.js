import { neon } from '@neondatabase/serverless';
import { getLeadSourcesMap } from './leadSourceTracker.js';

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

  const email = row.user_email || row.record_email || '';
  const name = row.user_name || (email ? email.split('@')[0] : (row.target || 'Record'));

  const act = {
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
    userId: row.user_id ? Number(row.user_id) : null,
    userEmail: row.user_email || null,
    userName: row.user_name || null,
    entityInfo: {
      email,
      cleanEmail: email,
      name
    },
    details: null
  };

  if (row.user_name || row.user_email) {
    act.entityInfo.createdBy = {
      name: row.user_name || (row.user_email ? row.user_email.split('@')[0] : 'Team Member'),
      email: row.user_email || null,
      id: row.user_id ? Number(row.user_id) : null
    };
  }

  return act;
}

export async function logSyncActivity({
  status = 'success',
  type = 'contact',
  operation = 'create',
  entityInfo = {},
  user = null,
  message = ''
}) {
  try {
    const sql = getSql();
    const userInfo = user || entityInfo.user || entityInfo.created_by || null;
    const authorEmail = userInfo?.email || (typeof entityInfo.createdBy === 'object' ? entityInfo.createdBy?.email : null) || null;
    const authorName = userInfo?.name || (typeof entityInfo.createdBy === 'object' ? entityInfo.createdBy?.name : null) || null;
    const authorId = userInfo?.userId || userInfo?.id || (typeof entityInfo.createdBy === 'object' ? entityInfo.createdBy?.id : null) || null;

    const email = entityInfo.email || entityInfo.cleanEmail || entityInfo.contactEmail || entityInfo.record_email || authorEmail || 'system@internal';
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
        message,
        user_id,
        user_email,
        user_name
      ) VALUES (
        ${email},
        ${target},
        ${action},
        ${activityStatus},
        ${msg},
        ${authorId ? Number(authorId) : null},
        ${authorEmail ? authorEmail.toLowerCase().trim() : null},
        ${authorName ? authorName.trim() : null}
      )
      RETURNING *
    `;

    const entry = mapRowToActivity(rows[0]);
    if (entry && userInfo) {
      entry.entityInfo = {
        ...(entry.entityInfo || {}),
        createdBy: { name: userInfo.name, email: userInfo.email, role: userInfo.role }
      };
    }
    console.log(`📡 [ActivityLogger] Logged DB activity (${activityStatus} ${target}/${action}): ${msg}`);
    return entry;
  } catch (err) {
    console.error('🔥 [ActivityLogger] Failed to log sync activity to DB:', err);
    return null;
  }
}

import { listUsers } from './userAuth.js';

function escapeRegExp(string) {
  return string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

export async function getSyncActivities() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM sync_activity ORDER BY timestamp DESC
    `;
    const activities = (rows || []).map(mapRowToActivity);

    try {
      const [sourcesMap, registeredUsers] = await Promise.all([
        getLeadSourcesMap(),
        listUsers()
      ]);

      const userEmailMap = {};
      const userNameMap = {};
      if (Array.isArray(registeredUsers)) {
        for (const u of registeredUsers) {
          if (u.email) {
            userEmailMap[u.email.toLowerCase().trim()] = u;
          }
          if (u.name) {
            userNameMap[u.name.toLowerCase().trim()] = u;
          }
        }
      }

      for (const act of activities) {
        if (!act) continue;

        act.entityInfo = act.entityInfo || {};
        const emailCandidate = (act.record_email || act.entityInfo?.email || act.entityInfo?.cleanEmail || '').toLowerCase().trim();
        const bracketMatch = act.message?.match(/^\[([^\]]+)\]/)?.[1];
        const byMatchRaw = act.message?.match(/(?:created|updated|deleted)\s+by\s+([^:\(\n]+)/i)?.[1];
        const byMatch = byMatchRaw ? byMatchRaw.trim() : null;

        let liveUser = null;

        // 0. Priority 0: Direct userEmail or userId on activity record
        if (act.userEmail && userEmailMap[act.userEmail.toLowerCase().trim()]) {
          liveUser = userEmailMap[act.userEmail.toLowerCase().trim()];
        }
        else if (act.userId && Array.isArray(registeredUsers)) {
          liveUser = registeredUsers.find(u => Number(u.id) === Number(act.userId)) || null;
        }
        // 1. Priority 1: Live app user match by email candidate
        else if (emailCandidate && userEmailMap[emailCandidate]) {
          liveUser = userEmailMap[emailCandidate];
        }
        // 2. Priority 2: Match by bracket name or byMatch in registered users
        else if (bracketMatch && userNameMap[bracketMatch.toLowerCase().trim()]) {
          liveUser = userNameMap[bracketMatch.toLowerCase().trim()];
        }
        else if (byMatch && userNameMap[byMatch.toLowerCase().trim()]) {
          liveUser = userNameMap[byMatch.toLowerCase().trim()];
        }

        if (liveUser) {
          act.entityInfo.createdBy = {
            name: liveUser.name,
            email: liveUser.email,
            role: liveUser.role
          };

          if (act.message && liveUser.name) {
            if (bracketMatch && bracketMatch.trim() !== liveUser.name) {
              act.message = act.message.replace(`[${bracketMatch}]`, `[${liveUser.name}]`);
            }
            if (byMatch && byMatch !== liveUser.name) {
              const regex = new RegExp(`((?:created|updated|deleted)\\s+by\\s+)` + escapeRegExp(byMatch), 'i');
              act.message = act.message.replace(regex, `$1${liveUser.name}`);
            }
          }
        }
        else if (bracketMatch) {
          act.entityInfo.createdBy = {
            name: bracketMatch,
            role: 'Admin'
          };
        }

        // Always resolve lead_source from record_lead_sources map
        const idCandidate = act.entityInfo?.contactId || act.entityInfo?.companyId || act.entityInfo?.dealId || act.entityInfo?.id;
        let matched = idCandidate ? sourcesMap[String(idCandidate)] : null;
        if (!matched && emailCandidate) {
          matched = sourcesMap[emailCandidate];
        }

        if (matched) {
          if (matched.created_by && !act.entityInfo.createdBy?.name) {
            const creatorName = matched.created_by;
            const matchedUser = userNameMap[creatorName.toLowerCase().trim()];
            const finalName = matchedUser ? matchedUser.name : creatorName;
            act.entityInfo.createdBy = {
              name: finalName,
              role: creatorName.toLowerCase().includes('super') ? 'Super Admin' : 'Admin'
            };
          }
          if (matched.source) {
            act.entityInfo.lead_source = matched.source;
          }
        }

        // Fallback default lead source if missing
        if (!act.entityInfo.lead_source) {
          if (userEmailMap[emailCandidate] || liveUser || act.operation === 'create' || act.operation === 'update') {
            act.entityInfo.lead_source = 'Admin Dashboard';
          }
        }
      }
    } catch (enrichErr) {
      console.warn('⚠️ [ActivityLogger] Failed to enrich activity logs:', enrichErr.message);
    }

    return activities;
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
