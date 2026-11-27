import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap, recordLeadSource, assignDeal } from '../lib/leadSourceTracker.js';
import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { authenticateRequest, listUsers } from '../lib/userAuth.js';
import { can, formatRole } from '../lib/permissions.js';
import { getHubSpotOwnerIdByEmail, createHubSpotNote } from '../lib/hubspotOwners.js';
import {
    HUBSPOT_HANDLER_PROPERTY,
    getHandlerOptionValue,
    ensureHandlerOptionInHubSpot,
    updateHubSpotDealHandlers,
    resolveDealHandlerFromHubSpot
} from '../lib/hubspotDealHandlers.js';
import { getDealActivities } from '../lib/dealActivities.js';

let cachedPipelines = null;
let lastPipelinesCheckTime = 0;
const PIPELINES_CACHE_TTL_MS = 600000; // 10-minute cache for deal pipelines metadata

let dealsCache = null;
let dealsCacheTime = 0;
const DEALS_CACHE_TTL_MS = 120 * 1000; // 2 minutes

function invalidateDealsCache() {
    dealsCache = null;
    dealsCacheTime = 0;
}

/**
 * Concurrently fetches all deals from HubSpot using Search API pagination.
 */
async function fetchAllDealsFromHubSpot(token) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const properties = [
        'dealname', 'pipeline', 'dealstage', 'amount', 'closedate',
        'hubspot_owner_id', 'dealtype', 'hs_priority', 'lead_source',
        'description', 'createdate', HUBSPOT_HANDLER_PROPERTY
    ];

    const initialRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            limit: 100,
            after: 0,
            sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
            properties
        })
    });

    const initialData = await initialRes.json();
    if (!initialRes.ok) {
        throw new Error(initialData.message || `HubSpot API error ${initialRes.status}`);
    }

    const total = initialData.total || (initialData.results || []).length;
    let allResults = [...(initialData.results || [])];

    if (total > 100) {
        const pageOffsets = [];
        for (let offset = 100; offset < total && offset <= 10000; offset += 100) {
            pageOffsets.push(offset);
        }

        const remainingPages = await Promise.all(
            pageOffsets.map(offset =>
                fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        limit: 100,
                        after: offset,
                        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
                        properties
                    })
                }).then(r => r.json()).catch(() => ({ results: [] }))
            )
        );

        for (const page of remainingPages) {
            if (Array.isArray(page.results)) {
                allResults.push(...page.results);
            }
        }
    }

    return { results: allResults, total };
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            console.log('FEB [API] /api/deals (GET) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                console.log('❌ [API] Unauthorized admin request');
                return res.status(401).json({ error: 'Unauthorized. Please log in.' });
            }
            if (!can(auth.user, 'view', 'deals')) {
                console.log('⚠️ [API] Access restricted to deals');
                return res.status(403).json({ error: 'Access restricted to deals.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                console.error('❌ [API]', MISSING_TOKEN_ERROR);
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            // Action: Fetch live timeline activities for a specific deal
            if (req.query?.action === 'activities' && req.query?.dealId) {
                try {
                    const dealId = String(req.query.dealId);
                    const activitiesData = await getDealActivities(dealId);
                    return res.status(200).json({ success: true, ...activitiesData });
                } catch (actErr) {
                    console.error('🔥 [API/Deals] Failed to fetch deal activities:', actErr);
                    return res.status(500).json({ error: actErr.message || 'Failed to load deal activities.' });
                }
            }

            if (req.query?.refresh === 'true') {
                invalidateDealsCache();
            }

            const nowDeals = Date.now();
            let rawDealsData = null;
            if (dealsCache && (nowDeals - dealsCacheTime < DEALS_CACHE_TTL_MS)) {
                rawDealsData = dealsCache;
            } else {
                rawDealsData = await fetchAllDealsFromHubSpot(token);
                dealsCache = rawDealsData;
                dealsCacheTime = nowDeals;
            }

            const [sourcesMap, allUsers] = await Promise.all([
                getLeadSourcesMap(),
                listUsers().catch(() => [])
            ]);

            const usersById = {};
            const usersByEmail = {};
            const usersByName = {};
            for (const u of (allUsers || [])) {
                if (u.id) usersById[Number(u.id)] = u;
                if (u.email) usersByEmail[u.email.toLowerCase().trim()] = u;
                if (u.name) usersByName[u.name.toLowerCase().trim()] = u;
            }

            const deals = (rawDealsData.results || []).map((d) => {
                const srcInfo = sourcesMap[String(d.id)];
                const srcName = typeof srcInfo === 'object' ? srcInfo?.source : srcInfo;
                const creatorUserId = typeof srcInfo === 'object' ? srcInfo?.created_by_user_id : null;
                const creatorEmail = typeof srcInfo === 'object' ? srcInfo?.created_by_email : null;
                const resolvedHandler = resolveDealHandlerFromHubSpot(
                    d.properties[HUBSPOT_HANDLER_PROPERTY],
                    usersById,
                    usersByEmail,
                    usersByName
                );
                const assignedTo = resolvedHandler.assigned_to;
                const assignedUserId = resolvedHandler.assigned_user_id;
                const assignedUserEmail = resolvedHandler.assigned_user_email;
                const assignedUserIds = resolvedHandler.assigned_user_ids || [];
                const assignedUserEmails = resolvedHandler.assigned_user_emails || [];
                const assignedHandlers = resolvedHandler.assigned_handlers || [];
                const assignedAt = srcInfo?.assigned_at || null;
                const assignedBy = srcInfo?.assigned_by || null;
                const description = d.properties.description || '';

                let creator = typeof srcInfo === 'object' ? srcInfo?.created_by : null;

                const isPortalDeal = Boolean(
                    creatorUserId || 
                    srcName === 'Admin Dashboard' || 
                    srcName === 'Bridge Portal' || 
                    (description && description.toLowerCase().includes('via admin dashboard'))
                );

                let leadSource = 'HubSpot Direct';
                if (isPortalDeal) {
                    leadSource = 'Admin Dashboard';
                } else if (creator === 'Public Lead Form' || srcName === 'Website Form' || (srcName || '').toLowerCase().includes('website')) {
                    leadSource = 'Website Form';
                } else if ((srcName || '').toLowerCase().includes('webhook') || (d.properties.lead_source || '').toLowerCase().includes('webhook')) {
                    leadSource = 'HubSpot Webhook';
                } else if (srcName === 'HubSpot CRM' || srcName === 'HubSpot Direct' || d.properties.lead_source) {
                    leadSource = srcName || d.properties.lead_source || 'HubSpot Direct';
                }

                if (!creator) {
                    if (leadSource === 'Website Form' || leadSource.toLowerCase().includes('website')) {
                        creator = 'Public Lead Form';
                    } else if (leadSource === 'Admin Dashboard' || leadSource.toLowerCase().includes('admin')) {
                        creator = 'Admin User';
                    } else {
                        creator = 'HubSpot CRM';
                    }
                }

                return {
                    id: d.id,
                    dealname: d.properties.dealname || 'Unnamed Deal',
                    pipeline: d.properties.pipeline || 'default',
                    dealstage: d.properties.dealstage || 'appointmentscheduled',
                    amount: d.properties.amount || '0',
                    closedate: d.properties.closedate || null,
                    hubspot_owner_id: d.properties.hubspot_owner_id || '',
                    dealtype: d.properties.dealtype || '',
                    hs_priority: d.properties.hs_priority || '',
                    lead_source: leadSource,
                    hubspot_lead_source: d.properties.lead_source || '',
                    created_by: creator,
                    created_by_user_id: creatorUserId,
                    created_by_email: creatorEmail,
                    assigned_to: assignedTo,
                    assigned_user_id: assignedUserId,
                    assigned_user_email: assignedUserEmail,
                    assigned_user_ids: assignedUserIds,
                    assigned_user_emails: assignedUserEmails,
                    assigned_handlers: assignedHandlers,
                    assigned_at: assignedAt,
                    assigned_by: assignedBy,
                    description: description,
                    createdate: d.properties.createdate,
                };
            }).sort((a, b) => new Date(b.createdate || 0) - new Date(a.createdate || 0));

            let pipelines = [];
            const now = Date.now();
            if (cachedPipelines && (now - lastPipelinesCheckTime < PIPELINES_CACHE_TTL_MS)) {
                pipelines = cachedPipelines;
            } else {
                try {
                    const pipeRes = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (pipeRes.ok) {
                        const pipeData = await pipeRes.json();
                        pipelines = (pipeData.results || []).map((p) => ({
                            id: p.id,
                            label: p.label || p.id,
                            stages: (p.stages || []).map((s) => ({
                                id: s.id,
                                label: s.label || s.id,
                                displayOrder: s.displayOrder !== undefined ? s.displayOrder : 0
                            })).sort((a, b) => a.displayOrder - b.displayOrder)
                        }));
                        if (pipelines.length > 0) {
                            cachedPipelines = pipelines;
                            lastPipelinesCheckTime = now;
                        }
                    }
                } catch (pErr) {
                    console.warn('⚠️ [API] Failed to fetch pipelines:', pErr.message);
                }
            }

            // Role-based visibility: Super Admin and Admin see all deals, Team Member only sees assigned or self-created deals
            const isSuperAdmin = auth.user?.role === 'super_admin' || auth.user?.role === 'super admin' || auth.user?.role === 'admin';
            let visibleDeals = deals;

            if (!isSuperAdmin) {
                const userEmail = (auth.user?.email || '').toLowerCase().trim();
                const userId = Number(auth.user?.userId || auth.user?.id);
                const userName = (auth.user?.name || '').toLowerCase().trim();

                visibleDeals = deals.filter((d) => {
                    // 1. Explicit Assignment to Team Member (single or multi-handler)
                    const isAssignedId = (d.assigned_user_ids && d.assigned_user_ids.map(Number).includes(userId)) ||
                                         (d.assigned_user_id && Number(d.assigned_user_id) === userId);
                    const isAssignedEmail = (d.assigned_user_emails && d.assigned_user_emails.includes(userEmail)) ||
                                            (d.assigned_user_email && d.assigned_user_email.toLowerCase().trim() === userEmail);
                    const isAssignedName = (d.assigned_handlers && d.assigned_handlers.some(h => (h.name || '').toLowerCase().trim() === userName)) ||
                                           (d.assigned_to && d.assigned_to.toLowerCase().includes(userName));

                    // 2. Self-Created Deals
                    const matchCreatorId = d.created_by_user_id && Number(d.created_by_user_id) === userId;
                    const matchCreatorEmail = d.created_by_email && d.created_by_email.toLowerCase().trim() === userEmail;
                    const matchDescriptionEmail = userEmail && d.description && d.description.toLowerCase().includes(userEmail);

                    // 3. Fallback: Deal title contains team member name (e.g. "upwork - Rakesh - ...")
                    const isNameInTitle = userName && userName.length >= 3 && d.dealname && (
                        d.dealname.toLowerCase().startsWith(`upwork - ${userName}`) ||
                        d.dealname.toLowerCase().includes(`- ${userName} -`) ||
                        d.dealname.toLowerCase().includes(`- ${userName}`)
                    );

                    return Boolean(isAssignedId || isAssignedEmail || isAssignedName || matchCreatorId || matchCreatorEmail || matchDescriptionEmail || isNameInTitle);
                });
                console.log(`🔒 [API/Deals] Filtered deals for team member "${auth.user?.email}": ${visibleDeals.length} of ${deals.length} deals visible`);
            }

            const responseTotal = isSuperAdmin
                ? (rawDealsData.total !== undefined ? rawDealsData.total : deals.length)
                : visibleDeals.length;

            console.log(`✅ [API] Returning ${visibleDeals.length} deals (total: ${responseTotal}, CRM total: ${rawDealsData.total}) and ${pipelines.length} pipelines`);
            return res.status(200).json({ deals: visibleDeals, total: responseTotal, pipelines });
        } catch (err) {
            console.error('🔥 [API] Unexpected error:', err);
            return res.status(500).json({ error: 'Failed to load deals.' });
        }
    }

    if (req.method === 'POST') {
        try {
            console.log('FEB [API] /api/deals (POST) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Action: Assign Deal(s) to a team member (Two-Way Sync with HubSpot `deal_handled_by`)
            if (req.body?.action === 'assign') {
                const isSuperAdmin = auth.user?.role === 'super_admin' || auth.user?.role === 'super admin' || auth.user?.role === 'admin';
                if (!isSuperAdmin) {
                    return res.status(403).json({ error: 'Permission denied. Only managers/admins can assign deals.' });
                }

                const { dealId, dealIds, assignedUserId, assignedUserIds, assignedTo, assignedUserEmail } = req.body || {};
                const targetIds = Array.isArray(dealIds) ? dealIds : dealId ? [dealId] : [];

                if (targetIds.length === 0) {
                    return res.status(400).json({ error: 'Please provide at least one deal ID to assign.' });
                }

                const handlerIds = Array.isArray(assignedUserIds)
                    ? assignedUserIds
                    : (assignedUserId ? [assignedUserId] : []);

                // 1. Write `deal_handled_by` directly to HubSpot CRM (single or batch)
                const hsSync = await updateHubSpotDealHandlers(targetIds, handlerIds);
                if (!hsSync.success) {
                    return res.status(hsSync.status || 502).json({
                        error: `Failed to sync "Deal Handled By" to HubSpot CRM: ${hsSync.error}`
                    });
                }

                // 2. Mirror assignment metadata to Neon Postgres audit table
                const primaryUserId = handlerIds[0] ? Number(handlerIds[0]) : null;
                for (const id of targetIds) {
                    await assignDeal(
                        id,
                        primaryUserId,
                        assignedTo || null,
                        assignedUserEmail || null,
                        auth.user?.name || 'Admin User'
                    );
                }

                const actionLabel = handlerIds.length > 0
                    ? `Assigned ${targetIds.length} deal(s) to ${assignedTo || 'team members'} (synced to HubSpot)`
                    : `Cleared handlers on ${targetIds.length} deal(s) (synced to HubSpot)`;

                await logSyncActivity({
                    type: 'deal',
                    operation: 'update',
                    entityInfo: { dealIds: targetIds, assignedTo: assignedTo || null },
                    user: auth.user,
                    message: `${actionLabel} by ${auth.user?.name || 'Admin'}`,
                    status: 'success',
                    statusCode: 200
                });

                invalidateDealsCache();
                return res.status(200).json({
                    success: true,
                    count: targetIds.length,
                    assignedTo: assignedTo || null,
                    hubspotValue: hsSync.value
                });
            }

            if (!can(auth.user, 'create', 'deals')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow creating deals.' });
            }

            const {
                dealname,
                pipeline,
                dealstage,
                amount,
                closedate,
                hubspot_owner_id,
                assigned_user_id,
                assigned_to,
                assigned_user_email,
                deal_lead_source,
                dealtype,
                hs_priority,
                contactId,
                companyId,
            } = req.body || {};

            if (!dealname?.trim()) {
                return res.status(400).json({ error: 'Deal name is required.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                await logSyncError({
                    type: 'deal',
                    operation: 'auth',
                    entityInfo: { dealName: dealname },
                    statusCode: 500,
                    errorMessage: MISSING_TOKEN_ERROR,
                    details: null
                });
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const finalStage = dealstage?.toString().trim() || 'appointmentscheduled';

            const finalPipeline = (pipeline && typeof pipeline === 'string' && pipeline.trim())
                ? pipeline.trim()
                : 'default';

            const parseNumericAmount = (val) => {
                if (val === null || val === undefined) return '0';
                const cleaned = String(val).replace(/[^0-9.]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) || num < 0 ? '0' : String(num);
            };

            const finalAmount = parseNumericAmount(amount);

            const chosenOwnerId = hubspot_owner_id || (await getHubSpotOwnerIdByEmail(auth.user?.email));

            const userName = auth.user?.name || 'Admin User';
            const userEmail = auth.user?.email || 'admin@system';

            const properties = {
                dealname: dealname.trim(),
                pipeline: finalPipeline,
                dealstage: finalStage,
                amount: finalAmount,
                description: `Created by ${userName} (${userEmail}) via Admin Dashboard`,
            };

            if (deal_lead_source) {
                const formattedLeadSource = Array.isArray(deal_lead_source)
                    ? deal_lead_source.map(v => String(v).trim()).filter(Boolean).join(';')
                    : String(deal_lead_source).trim();
                if (formattedLeadSource) {
                    properties.lead_source = formattedLeadSource;
                }
            }

            if (closedate) {
                try {
                    const d = new Date(closedate);
                    if (!isNaN(d.getTime())) {
                        properties.closedate = d.toISOString();
                    }
                } catch {
                    properties.closedate = closedate;
                }
            }

            if (chosenOwnerId) {
                properties.hubspot_owner_id = String(chosenOwnerId);
                console.log(`👤 [API] Setting HubSpot Owner ID ${chosenOwnerId} for deal created by "${userEmail}"`);
            }

            if (dealtype && String(dealtype).trim()) {
                properties.dealtype = String(dealtype).trim();
            }

            if (hs_priority && String(hs_priority).trim()) {
                properties.hs_priority = String(hs_priority).trim();
            }

            // Set HubSpot `deal_handled_by` on newly created deals
            const isCreatorAdmin = auth.user?.role === 'super_admin' || auth.user?.role === 'super admin' || auth.user?.role === 'admin';
            const creatorUid = auth.user?.userId || auth.user?.id || null;
            const handlerIds = Array.isArray(req.body?.assigned_user_ids) && req.body.assigned_user_ids.length > 0
                ? req.body.assigned_user_ids.map(Number).filter(Boolean)
                : (assigned_user_id ? [Number(assigned_user_id)] : (!isCreatorAdmin && creatorUid ? [Number(creatorUid)] : []));

            const finalAssignedUserId = handlerIds[0] || null;
            const finalAssignedTo = assigned_to || (!isCreatorAdmin ? userName : null);
            const finalAssignedEmail = assigned_user_email || (!isCreatorAdmin ? userEmail : null);

            if (handlerIds.length > 0) {
                for (const hid of handlerIds) {
                    await ensureHandlerOptionInHubSpot(hid);
                }
                properties[HUBSPOT_HANDLER_PROPERTY] = handlerIds.map(hid => getHandlerOptionValue(hid)).join(';');
            }

            const safeHubSpotFetch = async (url, opts) => {
                let res = await fetch(url, opts);
                if (!res.ok && res.status === 400) {
                    try {
                        const cloned = res.clone();
                        const errData = await cloned.json();
                        const isPropMissingOrInvalid =
                            errData.message?.includes('PROPERTY_DOESNT_EXIST') ||
                            errData.message?.includes('INVALID_OPTION') ||
                            errData.errors?.some(e => e.code === 'PROPERTY_DOESNT_EXIST' || e.code === 'INVALID_OPTION');
                        if (isPropMissingOrInvalid) {
                            console.warn('⚠️ [HubSpot Safety Net] Property safety net triggered. Stripping incompatible custom property and retrying...');
                            if (opts.body) {
                                const parsed = JSON.parse(opts.body);
                                let modified = false;
                                if (parsed.properties && parsed.properties.lead_source && errData.message?.includes('lead_source')) {
                                    delete parsed.properties.lead_source;
                                    modified = true;
                                }
                                if (parsed.properties && parsed.properties.hubspot_owner_id && errData.message?.includes('hubspot_owner_id')) {
                                    delete parsed.properties.hubspot_owner_id;
                                    modified = true;
                                }
                                if (parsed.properties && parsed.properties.dealtype && errData.message?.includes('dealtype')) {
                                    delete parsed.properties.dealtype;
                                    modified = true;
                                }
                                if (parsed.properties && parsed.properties.hs_priority && errData.message?.includes('hs_priority')) {
                                    delete parsed.properties.hs_priority;
                                    modified = true;
                                }
                                if (modified) {
                                    opts.body = JSON.stringify(parsed);
                                    res = await fetch(url, opts);
                                }
                            }
                        }
                    } catch {
                        // Ignore parse errors
                    }
                }
                return res;
            };

            const dealRes = await safeHubSpotFetch('https://api.hubapi.com/crm/v3/objects/deals', {
                method: 'POST',
                headers,
                body: JSON.stringify({ properties }),
            });

            const dealData = await dealRes.json();
            if (!dealRes.ok) {
                logSyncError({
                    type: 'deal',
                    operation: 'create',
                    entityInfo: { dealName: dealname, amount: finalAmount },
                    statusCode: dealRes.status,
                    errorMessage: dealData.message || 'Failed to create deal in HubSpot',
                    details: dealData
                });
                logSyncActivity({
                    status: 'failure',
                    type: 'deal',
                    operation: 'create',
                    entityInfo: { dealName: dealname, amount: finalAmount },
                    user: auth.user,
                    statusCode: dealRes.status,
                    message: dealData.message || 'Failed to create deal in HubSpot',
                    details: dealData
                });
                return res.status(dealRes.status).json(dealData);
            }

            const dealId = dealData.id;
            console.log(`✅ [API] Deal created with ID: ${dealId}`);
            await recordLeadSource(dealId, 'deal', 'Admin Dashboard', userName, auth.user?.userId, auth.user?.email);
            if (finalAssignedUserId) {
                await assignDeal(dealId, finalAssignedUserId, finalAssignedTo, finalAssignedEmail, userName);
            }

            // Attach creator Note in HubSpot
            const noteContent = `📌 Deal Created via Local Form Bridge\n• Created By: ${userName} (${userEmail})\n• Role: ${formatRole(auth.user?.role)}\n• Lead Source: Admin Dashboard\n• Timestamp: ${new Date().toLocaleString()}`;
            await createHubSpotNote({ objectType: 'deals', objectId: dealId, noteText: noteContent });

            logSyncActivity({
                status: 'success',
                type: 'deal',
                operation: 'create',
                entityInfo: { dealName: dealname, amount: finalAmount, id: dealId },
                user: auth.user,
                statusCode: dealRes.status,
                message: `Deal created by ${userName}: ${dealname} ($${finalAmount})`,
                details: dealData
            });

            if (contactId) {
                try {
                    await fetch(
                        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
                        { method: 'PUT', headers }
                    );
                    console.log(`🔗 [API] Associated Deal ${dealId} with Contact ${contactId}`);
                } catch (assocErr) {
                    console.warn('⚠️ [API] Contact association warning:', assocErr.message);
                }
            }

            if (companyId) {
                try {
                    await fetch(
                        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/deal_to_company`,
                        { method: 'PUT', headers }
                    );
                    console.log(`🔗 [API] Associated Deal ${dealId} with Company ${companyId}`);
                } catch (assocErr) {
                    console.warn('⚠️ [API] Company association warning:', assocErr.message);
                }
            }

            invalidateDealsCache();
            return res.status(200).json({
                success: true,
                deal: dealData,
            });
        } catch (err) {
            console.error('🔥 [API] Create deal error:', err);
            await logSyncError({
                type: 'deal',
                operation: 'create',
                entityInfo: { dealName: req.body?.dealname || 'unknown' },
                statusCode: 500,
                errorMessage: err.message || 'Unexpected server error during deal sync',
                details: null
            });
            await logSyncActivity({
                status: 'failure',
                type: 'deal',
                operation: 'create',
                entityInfo: { dealName: req.body?.dealname || 'unknown' },
                statusCode: 500,
                message: err.message || 'Unexpected server error during deal sync',
                details: null
            });
            return res.status(500).json({ error: 'Failed to create deal.' });
        }
    }

    if (req.method === 'PUT') {
        try {
            console.log('FEB [API] /api/deals (PUT) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'edit', 'deals')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow editing deals.' });
            }

            const { id, dealname, pipeline, dealstage, amount, closedate, hubspot_owner_id, dealtype, hs_priority, deal_lead_source } = req.body || {};
            const dealId = id || req.query?.id;

            if (!dealId) {
                return res.status(400).json({ error: 'Deal ID is required for updating.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            let oldRecord = {};
            try {
                const getOldRes = await fetch(
                    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,pipeline,dealstage,amount,closedate,hubspot_owner_id,dealtype,hs_priority,${HUBSPOT_HANDLER_PROPERTY}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (getOldRes.ok) {
                    const getOldData = await getOldRes.json();
                    oldRecord = getOldData.properties || {};
                }
            } catch (fetchErr) {
                console.warn('⚠️ [API] Could not fetch old deal record:', fetchErr.message);
            }

            const isSuperAdmin = auth.user?.role === 'super_admin' || auth.user?.role === 'super admin' || auth.user?.role === 'admin';
            if (!isSuperAdmin) {
                const userEmail = (auth.user?.email || '').toLowerCase().trim();
                const userId = Number(auth.user?.userId || auth.user?.id);
                const userName = (auth.user?.name || '').toLowerCase().trim();
                const sourcesMap = await getLeadSourcesMap();
                const srcInfo = sourcesMap[String(dealId)];

                const hsHandlerRaw = String(oldRecord[HUBSPOT_HANDLER_PROPERTY] || '').trim().toLowerCase();
                const expectedOptVal = getHandlerOptionValue(userId).toLowerCase();
                const rawParts = hsHandlerRaw.split(';').map(p => p.trim());
                const isHubSpotAssigned = Boolean(
                    hsHandlerRaw && (
                        (expectedOptVal && (hsHandlerRaw === expectedOptVal || rawParts.includes(expectedOptVal))) ||
                        (userEmail && (hsHandlerRaw === userEmail || rawParts.includes(userEmail))) ||
                        (userName && (hsHandlerRaw === userName || rawParts.includes(userName)))
                    )
                );

                const isOwner = isHubSpotAssigned ||
                                (srcInfo?.created_by_user_id && Number(srcInfo.created_by_user_id) === userId) ||
                                (srcInfo?.created_by_email && srcInfo.created_by_email.toLowerCase().trim() === userEmail) ||
                                (srcInfo?.assigned_user_id && Number(srcInfo.assigned_user_id) === userId) ||
                                (srcInfo?.assigned_user_email && srcInfo.assigned_user_email.toLowerCase().trim() === userEmail) ||
                                (srcInfo?.assigned_to && srcInfo.assigned_to.toLowerCase().trim() === userName);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Permission denied. Team members can only update deals assigned to them or created by them.' });
                }
            }

            const properties = {};
            if (dealname !== undefined) properties.dealname = dealname.trim();
            if (pipeline !== undefined) properties.pipeline = pipeline.trim() || 'default';
            if (dealstage !== undefined) properties.dealstage = dealstage.trim();
            if (amount !== undefined) {
                const cleaned = String(amount).replace(/[^0-9.]/g, '');
                const num = parseFloat(cleaned);
                properties.amount = isNaN(num) || num < 0 ? '0' : String(num);
            }
            if (closedate !== undefined) {
                if (closedate) {
                    try {
                        const d = new Date(closedate);
                        properties.closedate = !isNaN(d.getTime()) ? d.toISOString() : closedate;
                    } catch {
                        properties.closedate = closedate;
                    }
                } else {
                    properties.closedate = '';
                }
            }
            if (hubspot_owner_id !== undefined) {
                properties.hubspot_owner_id = String(hubspot_owner_id || '').trim();
            }
            if (dealtype !== undefined) {
                properties.dealtype = String(dealtype || '').trim();
            }
            if (hs_priority !== undefined) {
                properties.hs_priority = String(hs_priority || '').trim();
            }
            if (deal_lead_source !== undefined) {
                properties.lead_source = Array.isArray(deal_lead_source)
                    ? deal_lead_source.map(v => String(v).trim()).filter(Boolean).join(';')
                    : String(deal_lead_source || '').trim();
            }

            if (isSuperAdmin && (req.body?.assigned_user_ids !== undefined || req.body?.assigned_user_id !== undefined || req.body?.assigned_to !== undefined)) {
                const handlerIds = Array.isArray(req.body.assigned_user_ids)
                    ? req.body.assigned_user_ids.map(Number).filter(Boolean)
                    : (req.body.assigned_user_id ? [Number(req.body.assigned_user_id)] : []);

                if (handlerIds.length > 0) {
                    for (const hid of handlerIds) {
                        await ensureHandlerOptionInHubSpot(hid);
                    }
                    properties[HUBSPOT_HANDLER_PROPERTY] = handlerIds.map(hid => getHandlerOptionValue(hid)).join(';');
                } else {
                    properties[HUBSPOT_HANDLER_PROPERTY] = '';
                }
                await assignDeal(
                    dealId,
                    handlerIds[0] || null,
                    req.body.assigned_to || null,
                    req.body.assigned_user_email || null,
                    auth.user?.name || 'Admin User'
                );
            }

            const diffParts = [];
            const changes = {};

            const oldName = oldRecord.dealname || '';
            const newName = properties.dealname !== undefined ? properties.dealname : oldName;
            if (newName && newName !== oldName) {
                changes.dealname = { old: oldName || '—', new: newName };
                diffParts.push(`Deal Name ("${oldName || '—'}" → "${newName}")`);
            }

            const oldPipeline = oldRecord.pipeline || 'default';
            const newPipeline = properties.pipeline !== undefined ? properties.pipeline : oldPipeline;
            if (newPipeline !== oldPipeline) {
                changes.pipeline = { old: oldPipeline, new: newPipeline };
                diffParts.push(`Pipeline ("${oldPipeline}" → "${newPipeline}")`);
            }

            const oldStage = oldRecord.dealstage || '';
            const newStage = properties.dealstage !== undefined ? properties.dealstage : oldStage;
            if (newStage !== oldStage) {
                changes.dealstage = { old: oldStage || '—', new: newStage };
                diffParts.push(`Stage ("${oldStage || '—'}" → "${newStage}")`);
            }

            const oldAmount = oldRecord.amount || '0';
            const newAmount = properties.amount !== undefined ? properties.amount : oldAmount;
            if (newAmount !== oldAmount) {
                changes.amount = { old: `$${Number(oldAmount).toLocaleString()}`, new: `$${Number(newAmount).toLocaleString()}` };
                diffParts.push(`Amount ("$${Number(oldAmount).toLocaleString()}" → "$${Number(newAmount).toLocaleString()}")`);
            }

            if (properties.closedate !== undefined && properties.closedate !== (oldRecord.closedate || '')) {
                changes.closedate = { old: oldRecord.closedate || '—', new: properties.closedate || '—' };
                diffParts.push(`Close Date ("${oldRecord.closedate || '—'}" → "${properties.closedate || '—'}")`);
            }

            if (properties.dealtype !== undefined && properties.dealtype !== (oldRecord.dealtype || '')) {
                changes.dealtype = { old: oldRecord.dealtype || '—', new: properties.dealtype || '—' };
                diffParts.push(`Deal Type ("${oldRecord.dealtype || '—'}" → "${properties.dealtype || '—'}")`);
            }

            if (properties.hs_priority !== undefined && properties.hs_priority !== (oldRecord.hs_priority || '')) {
                changes.hs_priority = { old: oldRecord.hs_priority || '—', new: properties.hs_priority || '—' };
                diffParts.push(`Priority ("${oldRecord.hs_priority || '—'}" → "${properties.hs_priority || '—'}")`);
            }

            const diffSummary = diffParts.length > 0
                ? `Deal updated: ${diffParts.join(', ')}`
                : `Deal updated (ID: ${dealId}): No fields changed`;

            const safeHubSpotPatch = async (url, token, initialProperties) => {
                let propertiesToUpdate = { ...initialProperties };
                
                for (let attempt = 0; attempt < 5; attempt++) {
                    let res = await fetch(url, {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ properties: propertiesToUpdate }),
                    });

                    if (res.ok) return res;

                    if (res.status === 400) {
                        try {
                            const cloned = res.clone();
                            const errData = await cloned.json();
                            const errStr = JSON.stringify(errData);
                            
                            let missingProperties = [];

                            if (errData.errors && Array.isArray(errData.errors)) {
                                errData.errors.forEach(e => {
                                    if (e.code === 'PROPERTY_DOESNT_EXIST' && e.name) {
                                        missingProperties.push(e.name);
                                    }
                                });
                            }

                            const propMatches = errStr.match(/Property \\?"?([a-zA-Z0-9_]+)\\?"? does not exist/gi) || [];
                            propMatches.forEach(m => {
                                const clean = m.replace(/Property \\?"?/i, '').replace(/\\?"? does not exist/i, '').trim();
                                if (clean) missingProperties.push(clean);
                            });

                            const nameMatches = errStr.match(/"name"\s*:\s*\\?"([a-zA-Z0-9_]+)\\?"/gi) || [];
                            nameMatches.forEach(m => {
                                const clean = m.replace(/"name"\s*:\s*\\?"/i, '').replace(/\\?"$/, '').trim();
                                if (clean) missingProperties.push(clean);
                            });

                            if (missingProperties.length > 0) {
                                let removedAny = false;
                                missingProperties.forEach(prop => {
                                    if (propertiesToUpdate[prop] !== undefined) {
                                        console.warn(`⚠️ [HubSpot Safety Net] Property "${prop}" does not exist in HubSpot portal. Stripping property and retrying...`);
                                        delete propertiesToUpdate[prop];
                                        removedAny = true;
                                    }
                                });
                                if (removedAny) continue;
                            }
                            return res;
                        } catch {
                            return res;
                        }
                    }
                    return res;
                }
            };

            const response = await safeHubSpotPatch(
                `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
                token,
                properties
            );

            const data = await response.json();
            if (!response.ok) {
                logSyncError({
                    type: 'deal',
                    operation: 'update',
                    entityInfo: { dealId, dealname: newName, amount: newAmount, changes },
                    statusCode: response.status,
                    errorMessage: data.message || 'Failed to update deal in HubSpot',
                    details: data
                });
                return res.status(response.status).json(data);
            }

            // Post update Note in HubSpot timeline
            const userName = auth.user?.name || 'Admin User';
            const userEmail = auth.user?.email || 'admin@system';
            if (diffParts.length > 0) {
                const noteContent = `📝 Updated via Admin Dashboard\n• Editor: ${userName} (${userEmail})\n• Changes: ${diffParts.join(', ')}\n• Timestamp: ${new Date().toLocaleString()}`;
                await createHubSpotNote({ objectType: 'deals', objectId: dealId, noteText: noteContent });
            }

            logSyncActivity({
                status: 'success',
                type: 'deal',
                operation: 'update',
                entityInfo: { dealId, dealname: newName, amount: newAmount, changes },
                user: auth.user,
                statusCode: response.status,
                message: `[${userName}] ${diffSummary}`,
                details: { dealId, changes, data }
            });

            invalidateDealsCache();
            return res.status(200).json({ success: true, deal: data, changes });
        } catch (err) {
            console.error('🔥 [API] Edit deal error:', err);
            return res.status(500).json({ error: err.message || 'Failed to update deal.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            console.log('FEB [API] /api/deals (DELETE) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'delete', 'deals')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow deleting deals.' });
            }

            const dealId = req.query?.id || req.body?.id;
            if (!dealId) {
                return res.status(400).json({ error: 'Deal ID is required for deletion.' });
            }

            const isSuperAdmin = auth.user?.role === 'super_admin' || auth.user?.role === 'super admin' || auth.user?.role === 'admin';
            if (!isSuperAdmin) {
                const userEmail = (auth.user?.email || '').toLowerCase().trim();
                const userId = Number(auth.user?.userId || auth.user?.id);
                const sourcesMap = await getLeadSourcesMap();
                const srcInfo = sourcesMap[String(dealId)];
                const isOwner = (srcInfo?.created_by_user_id && Number(srcInfo.created_by_user_id) === userId) ||
                                (srcInfo?.created_by_email && srcInfo.created_by_email.toLowerCase().trim() === userEmail);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Permission denied. Team members can only delete deals they created.' });
                }
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json().catch(() => ({}));
                logSyncError({
                    type: 'deal',
                    operation: 'delete',
                    entityInfo: { dealId },
                    statusCode: response.status,
                    errorMessage: data.message || 'Failed to delete deal in HubSpot',
                    details: data
                });
                return res.status(response.status).json(data);
            }

            logSyncActivity({
                status: 'success',
                type: 'deal',
                operation: 'delete',
                entityInfo: { dealId },
                user: auth.user,
                statusCode: 204,
                message: `Deal deleted by ${auth.user?.name || 'User'} (ID: ${dealId})`,
                details: null
            });

            invalidateDealsCache();
            return res.status(200).json({ success: true, message: 'Deal deleted successfully.' });
        } catch (err) {
            console.error('🔥 [API] Delete deal error:', err);
            return res.status(500).json({ error: err.message || 'Failed to delete deal.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

