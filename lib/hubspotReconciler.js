import { neon } from '@neondatabase/serverless';
import { getHubSpotToken } from './hubspot.js';
import { getHubSpotOwners } from './hubspotOwners.js';
import { recordLeadSource } from './leadSourceTracker.js';

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

let lastReconcileTime = 0;
const RECONCILE_THROTTLE_MS = 300000; // Throttle to max once every 5 minutes (prevents API choking)

/**
 * Reconciles contacts, companies, and deals created directly in HubSpot CRM
 * into the Local Form Bridge `sync_activity` feed so Super Admin sees all CRM activity.
 */
export async function reconcileExternalHubSpotActivities(force = false) {
  const now = Date.now();
  if (!force && (now - lastReconcileTime < RECONCILE_THROTTLE_MS)) {
    return { skipped: true, reason: 'throttled' };
  }
  lastReconcileTime = now;

  const sql = getSql();
  if (!sql) return { error: 'No database connection' };

  const token = getHubSpotToken();
  if (!token) return { error: 'No HubSpot token' };

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Fetch owners to map owner IDs to actual team names and emails
    const rawOwners = await getHubSpotOwners().catch(() => []);
    const ownersMap = {};
    for (const o of rawOwners) {
      ownersMap[String(o.id)] = {
        name: `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email || `Owner #${o.id}`,
        email: o.email || o.primaryEmail || ''
      };
    }

    let newlyLoggedCount = 0;

    // 2. Fetch newest 25 contacts from HubSpot
    const contactsRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        limit: 25,
        properties: ['firstname', 'lastname', 'email', 'hubspot_owner_id', 'createdate', 'lead_source']
      })
    }).catch(() => null);

    if (contactsRes && contactsRes.ok) {
      const contactsData = await contactsRes.json();
      const results = contactsData.results || [];

      for (const c of results) {
        const email = (c.properties?.email || '').trim();
        const cid = String(c.id);
        if (!email && !cid) continue;

        // Check if record is already tracked in record_lead_sources or activity exists
        const [tracked, existing] = await Promise.all([
          sql`SELECT record_id FROM record_lead_sources WHERE record_id = ${cid} LIMIT 1`,
          sql`SELECT id FROM sync_activity WHERE (record_email = ${email} AND action = 'create' AND target = 'contact') OR message LIKE ${'%' + cid + '%'} LIMIT 1`
        ]);

        if (tracked.length > 0 || existing.length > 0) continue;

        if (existing.length === 0) {
          const fn = c.properties?.firstname || '';
          const ln = (c.properties?.lastname === '-' ? '' : c.properties?.lastname) || '';
          const fullName = `${fn} ${ln}`.trim() || email || 'Contact';
          const ownerInfo = ownersMap[String(c.properties?.hubspot_owner_id)];
          const authorName = ownerInfo?.name || 'HubSpot CRM';
          const authorEmail = ownerInfo?.email || 'crm@hubspot.com';
          const createdAt = c.properties?.createdate ? new Date(c.properties.createdate) : new Date();

          const message = `[HubSpot CRM] Contact created: ${fullName} (${email || 'No email'}) [ID #${cid}]`;

          await sql`
            INSERT INTO sync_activity (
              record_email,
              target,
              action,
              status,
              message,
              user_name,
              user_email,
              timestamp
            ) VALUES (
              ${email || 'hubspot@crm'},
              'contact',
              'create',
              'success',
              ${message},
              ${authorName},
              ${authorEmail},
              ${createdAt}
            )
          `;

          await recordLeadSource(cid, 'contact', 'HubSpot CRM', authorName, null, authorEmail).catch(() => {});
          newlyLoggedCount++;
          console.log(`📡 [Reconciler] Reconciled contact creation into Activity Feed: ${fullName} (${email}) [ID #${cid}]`);
        }
      }
    }

    // 3. Fetch newest 20 companies from HubSpot
    const compRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        limit: 20,
        properties: ['name', 'domain', 'hubspot_owner_id', 'createdate', 'lead_source']
      })
    }).catch(() => null);

    if (compRes && compRes.ok) {
      const compData = await compRes.json();
      const results = compData.results || [];

      for (const comp of results) {
        const compId = String(comp.id);
        const name = (comp.properties?.name || '').trim();
        if (!name && !compId) continue;

        // Check if record is already tracked in record_lead_sources or activity exists
        const [tracked, existing] = await Promise.all([
          sql`SELECT record_id FROM record_lead_sources WHERE record_id = ${compId} LIMIT 1`,
          sql`SELECT id FROM sync_activity WHERE (target = 'company' AND action = 'create' AND message LIKE ${'%' + compId + '%'}) OR (target = 'company' AND action = 'create' AND message LIKE ${'%' + name + '%'}) LIMIT 1`
        ]);

        if (tracked.length > 0 || existing.length > 0) continue;

        if (existing.length === 0) {
          const ownerInfo = ownersMap[String(comp.properties?.hubspot_owner_id)];
          const authorName = ownerInfo?.name || 'HubSpot CRM';
          const authorEmail = ownerInfo?.email || 'crm@hubspot.com';
          const createdAt = comp.properties?.createdate ? new Date(comp.properties.createdate) : new Date();
          const domain = comp.properties?.domain || '';

          const message = `[HubSpot CRM] Company created: ${name} ${domain ? `(${domain})` : ''} [ID #${compId}]`;

          await sql`
            INSERT INTO sync_activity (
              record_email,
              target,
              action,
              status,
              message,
              user_name,
              user_email,
              timestamp
            ) VALUES (
              ${authorEmail},
              'company',
              'create',
              'success',
              ${message},
              ${authorName},
              ${authorEmail},
              ${createdAt}
            )
          `;

          await recordLeadSource(compId, 'company', 'HubSpot CRM', authorName, null, authorEmail).catch(() => {});
          newlyLoggedCount++;
          console.log(`📡 [Reconciler] Reconciled company creation into Activity Feed: ${name} [ID #${compId}]`);
        }
      }
    }

    // 4. Fetch newest 20 deals from HubSpot
    const dealsRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        limit: 20,
        properties: ['dealname', 'amount', 'dealstage', 'hubspot_owner_id', 'createdate', 'lead_source']
      })
    }).catch(() => null);

    if (dealsRes && dealsRes.ok) {
      const dealsData = await dealsRes.json();
      const results = dealsData.results || [];

      for (const deal of results) {
        const dealId = String(deal.id);
        const dealName = (deal.properties?.dealname || '').trim();
        if (!dealName && !dealId) continue;

        // Check if record is already tracked in record_lead_sources or activity exists
        const [tracked, existing] = await Promise.all([
          sql`SELECT record_id FROM record_lead_sources WHERE record_id = ${dealId} LIMIT 1`,
          sql`SELECT id FROM sync_activity WHERE (target = 'deal' AND action = 'create' AND message LIKE ${'%' + dealId + '%'}) OR (target = 'deal' AND action = 'create' AND message LIKE ${'%' + dealName + '%'}) LIMIT 1`
        ]);

        if (tracked.length > 0 || existing.length > 0) continue;

        if (existing.length === 0) {
          const ownerInfo = ownersMap[String(deal.properties?.hubspot_owner_id)];
          const authorName = ownerInfo?.name || 'HubSpot CRM';
          const authorEmail = ownerInfo?.email || 'crm@hubspot.com';
          const createdAt = deal.properties?.createdate ? new Date(deal.properties.createdate) : new Date();
          const amount = deal.properties?.amount ? `$${Number(deal.properties.amount).toLocaleString()}` : '$0';

          const message = `[HubSpot CRM] Deal created: ${dealName} (${amount}) [ID #${dealId}]`;

          await sql`
            INSERT INTO sync_activity (
              record_email,
              target,
              action,
              status,
              message,
              user_name,
              user_email,
              timestamp
            ) VALUES (
              ${authorEmail},
              'deal',
              'create',
              'success',
              ${message},
              ${authorName},
              ${authorEmail},
              ${createdAt}
            )
          `;

          await recordLeadSource(dealId, 'deal', 'HubSpot CRM', authorName, null, authorEmail).catch(() => {});
          newlyLoggedCount++;
          console.log(`📡 [Reconciler] Reconciled deal creation into Activity Feed: ${dealName} [ID #${dealId}]`);
        }
      }
    }

    return { success: true, newlyLoggedCount };
  } catch (err) {
    console.error('🔥 [Reconciler] Error during HubSpot activity reconciliation:', err);
    return { error: err.message };
  }
}
