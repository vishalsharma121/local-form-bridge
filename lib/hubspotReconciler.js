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
const RECONCILE_THROTTLE_MS = 45000; // 45-second throttle for automatic background polling

/**
 * Reconciles contacts, companies, and deals created or updated directly in HubSpot CRM
 * into the Local Form Bridge `sync_activity` feed so team members see all CRM activity in real time.
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

    // 2. Fetch newest 25 contacts sorted by hs_lastmodifieddate DESC
    const contactsRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        limit: 25,
        properties: [
          'firstname',
          'lastname',
          'email',
          'hubspot_owner_id',
          'lifecyclestage',
          'hs_lead_status',
          'createdate',
          'hs_lastmodifieddate',
          'lead_source'
        ]
      })
    }).catch(() => null);

    if (contactsRes && contactsRes.ok) {
      const contactsData = await contactsRes.json();
      const results = contactsData.results || [];

      for (const c of results) {
        const email = (c.properties?.email || '').trim();
        const cid = String(c.id);
        if (!email && !cid) continue;

        const createdAt = c.properties?.createdate ? new Date(c.properties.createdate) : new Date();
        const modifiedAt = c.properties?.hs_lastmodifieddate ? new Date(c.properties.hs_lastmodifieddate) : createdAt;
        const isUpdate = (modifiedAt.getTime() - createdAt.getTime()) > 30000; // Modified >30s after creation

        const fn = c.properties?.firstname || '';
        const ln = (c.properties?.lastname === '-' ? '' : c.properties?.lastname) || '';
        const fullName = `${fn} ${ln}`.trim() || email || 'Contact';
        const ownerInfo = ownersMap[String(c.properties?.hubspot_owner_id)];
        const authorName = ownerInfo?.name || 'HubSpot CRM';
        const authorEmail = ownerInfo?.email || 'crm@hubspot.com';

        if (!isUpdate) {
          // Record CREATION
          const [tracked, existing] = await Promise.all([
            sql`SELECT record_id FROM record_lead_sources WHERE record_id = ${cid} LIMIT 1`,
            sql`SELECT id FROM sync_activity WHERE (record_email = ${email} AND action = 'create' AND target = 'contact') OR message LIKE ${'%' + cid + '%'} LIMIT 1`
          ]);

          if (tracked.length === 0 && existing.length === 0) {
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
            console.log(`📡 [Reconciler] Contact created: ${fullName} [ID #${cid}]`);
          }
        } else {
          // Record UPDATE / EDIT
          const recentThreshold = new Date(modifiedAt.getTime() - 120000);
          const existingUpdate = await sql`
            SELECT id FROM sync_activity 
            WHERE target = 'contact' 
              AND action = 'update' 
              AND (message LIKE ${'%' + cid + '%'} OR record_email = ${email})
              AND timestamp >= ${recentThreshold}
            LIMIT 1
          `;

          if (existingUpdate.length === 0) {
            const stage = c.properties?.lifecyclestage ? ` [Stage: ${c.properties.lifecyclestage}]` : '';
            const status = c.properties?.hs_lead_status ? ` [Status: ${c.properties.hs_lead_status}]` : '';
            const message = `[HubSpot CRM] Contact updated: ${fullName} (${email || 'No email'})${stage}${status} [ID #${cid}]`;

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
                'update',
                'success',
                ${message},
                ${authorName},
                ${authorEmail},
                ${modifiedAt}
              )
            `;
            newlyLoggedCount++;
            console.log(`📡 [Reconciler] Contact updated: ${fullName} [ID #${cid}]`);
          }
        }
      }
    }

    // 3. Fetch newest 20 companies sorted by hs_lastmodifieddate DESC
    const compRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        limit: 20,
        properties: [
          'name',
          'domain',
          'industry',
          'type',
          'hubspot_owner_id',
          'createdate',
          'hs_lastmodifieddate',
          'lead_source'
        ]
      })
    }).catch(() => null);

    if (compRes && compRes.ok) {
      const compData = await compRes.json();
      const results = compData.results || [];

      for (const comp of results) {
        const compId = String(comp.id);
        const name = (comp.properties?.name || '').trim();
        if (!name && !compId) continue;

        const createdAt = comp.properties?.createdate ? new Date(comp.properties.createdate) : new Date();
        const modifiedAt = comp.properties?.hs_lastmodifieddate ? new Date(comp.properties.hs_lastmodifieddate) : createdAt;
        const isUpdate = (modifiedAt.getTime() - createdAt.getTime()) > 30000;

        const ownerInfo = ownersMap[String(comp.properties?.hubspot_owner_id)];
        const authorName = ownerInfo?.name || 'HubSpot CRM';
        const authorEmail = ownerInfo?.email || 'crm@hubspot.com';
        const domain = comp.properties?.domain || '';

        if (!isUpdate) {
          // Company CREATION
          const [tracked, existing] = await Promise.all([
            sql`SELECT record_id FROM record_lead_sources WHERE record_id = ${compId} LIMIT 1`,
            sql`SELECT id FROM sync_activity WHERE (target = 'company' AND action = 'create' AND message LIKE ${'%' + compId + '%'}) OR (target = 'company' AND action = 'create' AND message LIKE ${'%' + name + '%'}) LIMIT 1`
          ]);

          if (tracked.length === 0 && existing.length === 0) {
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
            console.log(`📡 [Reconciler] Company created: ${name} [ID #${compId}]`);
          }
        } else {
          // Company UPDATE / EDIT
          const recentThreshold = new Date(modifiedAt.getTime() - 120000);
          const existingUpdate = await sql`
            SELECT id FROM sync_activity 
            WHERE target = 'company' 
              AND action = 'update' 
              AND message LIKE ${'%' + compId + '%'}
              AND timestamp >= ${recentThreshold}
            LIMIT 1
          `;

          if (existingUpdate.length === 0) {
            const industry = comp.properties?.industry ? ` [Industry: ${comp.properties.industry}]` : '';
            const message = `[HubSpot CRM] Company updated: "${name}" ${domain ? `(${domain})` : ''}${industry} [ID #${compId}]`;

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
                'update',
                'success',
                ${message},
                ${authorName},
                ${authorEmail},
                ${modifiedAt}
              )
            `;
            newlyLoggedCount++;
            console.log(`📡 [Reconciler] Company updated: ${name} [ID #${compId}]`);
          }
        }
      }
    }

    // 4. Fetch newest 20 deals sorted by hs_lastmodifieddate DESC
    const dealsRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        limit: 20,
        properties: [
          'dealname',
          'amount',
          'dealstage',
          'pipeline',
          'hubspot_owner_id',
          'createdate',
          'hs_lastmodifieddate',
          'lead_source'
        ]
      })
    }).catch(() => null);

    if (dealsRes && dealsRes.ok) {
      const dealsData = await dealsRes.json();
      const results = dealsData.results || [];

      for (const deal of results) {
        const dealId = String(deal.id);
        const dealName = (deal.properties?.dealname || '').trim();
        if (!dealName && !dealId) continue;

        const createdAt = deal.properties?.createdate ? new Date(deal.properties.createdate) : new Date();
        const modifiedAt = deal.properties?.hs_lastmodifieddate ? new Date(deal.properties.hs_lastmodifieddate) : createdAt;
        const isUpdate = (modifiedAt.getTime() - createdAt.getTime()) > 30000;

        const ownerInfo = ownersMap[String(deal.properties?.hubspot_owner_id)];
        const authorName = ownerInfo?.name || 'HubSpot CRM';
        const authorEmail = ownerInfo?.email || 'crm@hubspot.com';
        const amount = deal.properties?.amount ? `$${Number(deal.properties.amount).toLocaleString()}` : '$0';
        const stage = deal.properties?.dealstage ? ` [Stage: ${deal.properties.dealstage}]` : '';

        if (!isUpdate) {
          // Deal CREATION
          const [tracked, existing] = await Promise.all([
            sql`SELECT record_id FROM record_lead_sources WHERE record_id = ${dealId} LIMIT 1`,
            sql`SELECT id FROM sync_activity WHERE (target = 'deal' AND action = 'create' AND message LIKE ${'%' + dealId + '%'}) OR (target = 'deal' AND action = 'create' AND message LIKE ${'%' + dealName + '%'}) LIMIT 1`
          ]);

          if (tracked.length === 0 && existing.length === 0) {
            const message = `[HubSpot CRM] Deal created: ${dealName} (${amount})${stage} [ID #${dealId}]`;

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
            console.log(`📡 [Reconciler] Deal created: ${dealName} [ID #${dealId}]`);
          }
        } else {
          // Deal UPDATE / EDIT
          const recentThreshold = new Date(modifiedAt.getTime() - 120000);
          const existingUpdate = await sql`
            SELECT id FROM sync_activity 
            WHERE target = 'deal' 
              AND action = 'update' 
              AND message LIKE ${'%' + dealId + '%'}
              AND timestamp >= ${recentThreshold}
            LIMIT 1
          `;

          if (existingUpdate.length === 0) {
            const message = `[HubSpot CRM] Deal updated: "${dealName}" (${amount})${stage} [ID #${dealId}]`;

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
                'update',
                'success',
                ${message},
                ${authorName},
                ${authorEmail},
                ${modifiedAt}
              )
            `;
            newlyLoggedCount++;
            console.log(`📡 [Reconciler] Deal updated: ${dealName} [ID #${dealId}]`);
          }
        }
      }
    }

    return { success: true, newlyLoggedCount };
  } catch (err) {
    console.error('🔥 [Reconciler] Error during HubSpot activity reconciliation:', err);
    return { error: err.message };
  }
}
