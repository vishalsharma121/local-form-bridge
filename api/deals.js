import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap, recordLeadSource } from '../lib/leadSourceTracker.js';
import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            console.log('FEB [API] /api/deals (GET) called');

            const provided = req.headers['x-admin-key'];
            if (!provided || provided !== process.env.ADMIN_KEY) {
                console.log('❌ [API] Unauthorized admin request');
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const token = getHubSpotToken();
            if (!token) {
                console.error('❌ [API]', MISSING_TOKEN_ERROR);
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const response = await fetch(
                'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,pipeline,dealstage,amount,lead_source,createdate',
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const responseText = await response.text();
            let data = {};
            try {
                data = JSON.parse(responseText);
            } catch {
                data = { error: responseText || `HTTP ${response.status}` };
            }

            if (!response.ok) {
                console.error('❌ [API] HubSpot deals fetch error:', response.status, responseText);
                return res.status(response.status).json(data);
            }

            const sourcesMap = await getLeadSourcesMap();

            const deals = (data.results || []).map((d) => ({
                id: d.id,
                dealname: d.properties.dealname || 'Unnamed Deal',
                pipeline: d.properties.pipeline || 'default',
                dealstage: d.properties.dealstage || 'appointmentscheduled',
                amount: d.properties.amount || '0',
                lead_source: d.properties.lead_source || sourcesMap[String(d.id)] || 'HubSpot / Unknown',
                createdate: d.properties.createdate,
            })).sort((a, b) => new Date(b.createdate || 0) - new Date(a.createdate || 0));

            let pipelines = [];
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
                }
            } catch (pErr) {
                console.warn('⚠️ [API] Failed to fetch pipelines:', pErr.message);
            }

            console.log(`✅ [API] Returning ${deals.length} deals and ${pipelines.length} pipelines`);
            return res.status(200).json({ deals, pipelines });
        } catch (err) {
            console.error('🔥 [API] Unexpected error:', err);
            return res.status(500).json({ error: 'Failed to load deals.' });
        }
    }

    if (req.method === 'POST') {
        try {
            console.log('FEB [API] /api/deals (POST) called');

            const { dealname, pipeline, dealstage, amount, contactId, companyId } = req.body || {};

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

            const properties = {
                dealname: dealname.trim(),
                pipeline: finalPipeline,
                dealstage: finalStage,
                amount: finalAmount,
                lead_source: 'Admin Dashboard',
            };

            const safeHubSpotFetch = async (url, opts) => {
                let res = await fetch(url, opts);
                if (!res.ok && res.status === 400) {
                    try {
                        const cloned = res.clone();
                        const errData = await cloned.json();
                        if (errData.message?.includes('PROPERTY_DOESNT_EXIST') || errData.errors?.some(e => e.code === 'PROPERTY_DOESNT_EXIST')) {
                            console.warn('⚠️ [HubSpot Safety Net] Property "lead_source" does not exist in HubSpot portal. Retrying request without lead_source property...');
                            if (opts.body) {
                                const parsed = JSON.parse(opts.body);
                                if (parsed.properties && parsed.properties.lead_source) {
                                    delete parsed.properties.lead_source;
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
                    statusCode: dealRes.status,
                    message: dealData.message || 'Failed to create deal in HubSpot',
                    details: dealData
                });
                return res.status(dealRes.status).json(dealData);
            }

            const dealId = dealData.id;
            console.log(`✅ [API] Deal created with ID: ${dealId}`);
            await recordLeadSource(dealId, 'deal', 'Admin Dashboard');
            logSyncActivity({
                status: 'success',
                type: 'deal',
                operation: 'create',
                entityInfo: { dealName: dealname, amount: finalAmount, id: dealId },
                statusCode: dealRes.status,
                message: `Deal created: ${dealname} ($${finalAmount})`,
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

            const provided = req.headers['x-admin-key'];
            if (!provided || provided !== process.env.ADMIN_KEY) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { id, dealname, pipeline, dealstage, amount } = req.body || {};
            const dealId = id || req.query?.id;

            if (!dealId) {
                return res.status(400).json({ error: 'Deal ID is required for updating.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const properties = {};
            if (dealname !== undefined) properties.dealname = dealname.trim();
            if (pipeline !== undefined) properties.pipeline = pipeline.trim() || 'default';
            if (dealstage !== undefined) properties.dealstage = dealstage.trim().toLowerCase();
            if (amount !== undefined) {
                const cleaned = String(amount).replace(/[^0-9.]/g, '');
                const num = parseFloat(cleaned);
                properties.amount = isNaN(num) || num < 0 ? '0' : String(num);
            }

            let oldRecord = {};
            try {
                const getOldRes = await fetch(
                    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,pipeline,dealstage,amount`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (getOldRes.ok) {
                    const getOldData = await getOldRes.json();
                    oldRecord = getOldData.properties || {};
                }
            } catch (fetchErr) {
                console.warn('⚠️ [API] Could not fetch old deal record:', fetchErr.message);
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

            logSyncActivity({
                status: 'success',
                type: 'deal',
                operation: 'update',
                entityInfo: { dealId, dealname: newName, amount: newAmount, changes },
                statusCode: response.status,
                message: diffSummary,
                details: { dealId, changes, data }
            });

            return res.status(200).json({ success: true, deal: data, changes });
        } catch (err) {
            console.error('🔥 [API] Edit deal error:', err);
            return res.status(500).json({ error: err.message || 'Failed to update deal.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            console.log('FEB [API] /api/deals (DELETE) called');

            const provided = req.headers['x-admin-key'];
            if (!provided || provided !== process.env.ADMIN_KEY) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const dealId = req.query?.id || req.body?.id;
            if (!dealId) {
                return res.status(400).json({ error: 'Deal ID is required for deletion.' });
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
                statusCode: 204,
                message: `Deal deleted from HubSpot (ID: ${dealId})`,
                details: null
            });

            return res.status(200).json({ success: true, message: 'Deal deleted successfully.' });
        } catch (err) {
            console.error('🔥 [API] Delete deal error:', err);
            return res.status(500).json({ error: err.message || 'Failed to delete deal.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

