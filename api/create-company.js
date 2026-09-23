import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { recordLeadSource } from '../lib/leadSourceTracker.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐞 [API] /api/create-company called');

        const { name, domain, contactId } = req.body || {};

        if (!name?.trim() && !domain?.trim()) {
            return res.status(400).json({ error: 'Company name or domain is required.' });
        }

        const token = getHubSpotToken();
        if (!token) {
            await logSyncError({
                type: 'company',
                operation: 'auth',
                entityInfo: { name, domain },
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

        const targetName = (name || domain).trim();
        const targetDomain = (domain || '').trim();

        const properties = {
            name: targetName,
            domain: targetDomain,
            lead_source: 'Admin Dashboard',
        };

        // Helper function to search existing company in HubSpot
        const findCompanyInHubSpot = async (filterProperty, filterValue) => {
            if (!filterValue) return null;
            const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    filterGroups: [
                        {
                            filters: [
                                {
                                    propertyName: filterProperty,
                                    operator: 'EQ',
                                    value: filterValue,
                                },
                            ],
                        },
                    ],
                }),
            });
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.results && searchData.results.length > 0) {
                    return searchData.results[0];
                }
            }
            return null;
        };

        let companyData = null;

        if (targetDomain) {
            companyData = await findCompanyInHubSpot('domain', targetDomain);
            if (companyData) {
                console.log(`🔄 [API] Existing company found by domain "${targetDomain}": ID ${companyData.id}`);
            }
        }

        if (!companyData && targetName) {
            companyData = await findCompanyInHubSpot('name', targetName);
            if (companyData) {
                console.log(`🔄 [API] Existing company found by name "${targetName}": ID ${companyData.id}`);
            }
        }

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

        if (!companyData) {
            // Create Company in HubSpot
            const companyRes = await safeHubSpotFetch('https://api.hubapi.com/crm/v3/objects/companies', {
                method: 'POST',
                headers,
                body: JSON.stringify({ properties }),
            });

            companyData = await companyRes.json();
            if (!companyRes.ok) {
                logSyncError({
                    type: 'company',
                    operation: 'create',
                    entityInfo: { name: targetName, domain: targetDomain },
                    statusCode: companyRes.status,
                    errorMessage: companyData.message || 'Failed to create company in HubSpot',
                    details: companyData
                });
                logSyncActivity({
                    status: 'failure',
                    type: 'company',
                    operation: 'create',
                    entityInfo: { name: targetName, domain: targetDomain },
                    statusCode: companyRes.status,
                    message: companyData.message || 'Failed to create company in HubSpot',
                    details: companyData
                });
                return res.status(companyRes.status).json(companyData);
            }
        const companyId = companyData.id;
        await recordLeadSource(companyId, 'company', 'Admin Dashboard');
            logSyncActivity({
                status: 'success',
                type: 'company',
                operation: 'create',
                entityInfo: { name: targetName, domain: targetDomain, id: companyData.id },
                statusCode: companyRes.status,
                message: `Company created: ${targetName}`,
                details: companyData
            });
        }

        const companyId = companyData.id;

        // Associate Company with Contact if contactId provided
        if (contactId) {
            try {
                await fetch(
                    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
                    { method: 'PUT', headers }
                );
                console.log(`🔗 [API] Associated Contact ${contactId} with Company ${companyId}`);
            } catch (assocErr) {
                console.warn('⚠️ [API] Company association warning:', assocErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            company: companyData,
        });
    } catch (err) {
        console.error('🔥 [API] Create company error:', err);
        await logSyncError({
            type: 'company',
            operation: 'create',
            entityInfo: { name: req.body?.name || req.body?.domain || 'unknown' },
            statusCode: 500,
            errorMessage: err.message || 'Unexpected server error during company sync',
            details: null
        });
        await logSyncActivity({
            status: 'failure',
            type: 'company',
            operation: 'create',
            entityInfo: { name: req.body?.name || req.body?.domain || 'unknown' },
            statusCode: 500,
            message: err.message || 'Unexpected server error during company sync',
            details: null
        });
        return res.status(500).json({ error: 'Failed to create company.' });
    }
}
