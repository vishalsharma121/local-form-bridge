import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { recordLeadSource } from '../lib/leadSourceTracker.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐞 [API] /api/create-deal called');

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

        // Create Deal in HubSpot
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

        // Associate Deal with Contact if contactId provided
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

        // Associate Deal with Company if companyId provided
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
