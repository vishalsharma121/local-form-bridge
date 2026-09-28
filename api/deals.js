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

            console.log(`✅ [API] Returning ${deals.length} deals`);
            return res.status(200).json({ deals });
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

            const VALID_DEAL_STAGES = [
                'appointmentscheduled',
                'qualifiedtobuy',
                'presentationscheduled',
                'decisionmakerboughtin',
                'contractsent',
                'closedwon',
                'closedlost',
            ];

            const requestedStage = dealstage?.toString().toLowerCase().trim();
            const finalStage = VALID_DEAL_STAGES.includes(requestedStage)
                ? requestedStage
                : 'appointmentscheduled';

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

    return res.status(405).json({ error: 'Method not allowed' });
}
