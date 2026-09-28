import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap, recordLeadSource } from '../lib/leadSourceTracker.js';
import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            console.log('🐞 [API] /api/companies (GET) called');

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
                'https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name,domain,lead_source,createdate',
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
                console.error('❌ [API] HubSpot companies fetch error:', response.status, responseText);
                return res.status(response.status).json(data);
            }

            const sourcesMap = await getLeadSourcesMap();

            const companies = (data.results || []).map((c) => ({
                id: c.id,
                name: c.properties.name || c.properties.domain || 'Unnamed Company',
                domain: c.properties.domain || '—',
                lead_source: c.properties.lead_source || sourcesMap[String(c.id)] || 'HubSpot / Unknown',
                createdate: c.properties.createdate,
            })).sort((a, b) => new Date(b.createdate || 0) - new Date(a.createdate || 0));

            console.log(`✅ [API] Returning ${companies.length} companies`);
            return res.status(200).json({ companies });
        } catch (err) {
            console.error('🔥 [API] Unexpected error:', err);
            return res.status(500).json({ error: 'Failed to load companies.' });
        }
    }

    if (req.method === 'POST') {
        try {
            console.log('🐞 [API] /api/companies (POST) called');

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

    return res.status(405).json({ error: 'Method not allowed' });
}
