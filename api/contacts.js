import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap, recordLeadSource } from '../lib/leadSourceTracker.js';
import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { getAppSetting } from '../lib/appSettings.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            console.log('🐞 [API] /api/contacts (GET) called');

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
                'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,subject,message,lead_source,createdate&sorts=-createdate',
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
                console.error('❌ [API] HubSpot contacts fetch error:', response.status, responseText);
                return res.status(response.status).json(data);
            }

            const sourcesMap = await getLeadSourcesMap();

            const contacts = (data.results || []).map((c) => ({
                id: c.id,
                firstname: c.properties.firstname || '',
                lastname: c.properties.lastname || '',
                name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim() || 'Lead',
                email: c.properties.email || '',
                phone: c.properties.phone || '',
                subject: c.properties.subject || '',
                message: c.properties.message || '',
                lead_source: c.properties.lead_source || sourcesMap[String(c.id)] || 'HubSpot / Unknown',
                createdate: c.properties.createdate,
            }));

            return res.status(200).json({ contacts });
        } catch (err) {
            console.error('🔥 [API] Unexpected error:', err);
            return res.status(500).json({ error: 'Failed to load contacts.' });
        }
    }

    if (req.method === 'POST') {
        try {
            console.log('🐞 [API] /api/contacts (POST) called');

            const { 
                name, 
                email, 
                phone, 
                subject, 
                message,
                companyName,
                companyDomain,
                dealName,
                pipeline,
                dealStage,
                dealAmount
            } = req.body || {};

            if (!name?.trim() || !email?.trim()) {
                console.log('❌ [API] Validation failed: name or email missing');
                return res.status(400).json({
                    error: 'Name and email are required.',
                });
            }

            const [firstname, ...rest] = name.trim().split(/\s+/);
            const lastname = rest.join(' ') || '-';
            const cleanEmail = email.trim();

            const token = getHubSpotToken();
            if (!token) {
                console.error('❌ [API]', MISSING_TOKEN_ERROR);
                await logSyncError({
                    type: 'contact',
                    operation: 'auth',
                    entityInfo: { email: cleanEmail, name },
                    statusCode: 500,
                    errorMessage: MISSING_TOKEN_ERROR,
                    details: null
                });
                return res.status(500).json({
                    error: MISSING_TOKEN_ERROR,
                });
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const properties = {
                firstname,
                lastname,
                email: cleanEmail,
                phone: phone || '',
                subject: subject || '',
                message: message || '',
                lead_source: 'Website Form',
            };

            const safeFetch = async (url, opts) => {
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

            console.log('🔍 [API] Checking whether contact already exists:', cleanEmail);

            const lookup = await fetch(
                `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(cleanEmail)}?idProperty=email`,
                { headers }
            );

            let response;
            let action = '';
            let data;

            if (lookup.status === 200) {
                action = 'update';
                const existing = await lookup.json();
                console.log('🔄 [API] Existing contact found. ID:', existing.id);

                response = await safeFetch(
                    `https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`,
                    {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({ properties }),
                    }
                );
                data = await response.json();
            } else if (lookup.status === 404) {
                action = 'create';
                console.log('🆕 [API] Creating new HubSpot contact');
                response = await safeFetch(
                    'https://api.hubapi.com/crm/v3/objects/contacts',
                    {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ properties }),
                    }
                );
                data = await response.json();

                if (!response.ok && (response.status === 409 || response.status === 400)) {
                    console.warn('⚡ [API] Race condition detected during contact creation. Retrying lookup...');
                    
                    const retryLookup = await fetch(
                        `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(cleanEmail)}?idProperty=email`,
                        { headers }
                    );

                    if (retryLookup.status === 200) {
                        const existingRetry = await retryLookup.json();
                        action = 'update';
                        console.log('🔄 [API] Race condition resolved. Updating contact ID:', existingRetry.id);

                        response = await safeFetch(
                            `https://api.hubapi.com/crm/v3/objects/contacts/${existingRetry.id}`,
                            {
                                method: 'PATCH',
                                headers,
                                body: JSON.stringify({ properties }),
                            }
                        );
                        data = await response.json();
                    }
                }
            } else {
                const errorText = await lookup.text();
                console.error('❌ [API] HubSpot lookup failed:', lookup.status);
                logSyncError({
                    type: 'contact',
                    operation: 'lookup',
                    entityInfo: { email: cleanEmail, name },
                    statusCode: lookup.status,
                    errorMessage: 'HubSpot contact lookup failed',
                    details: errorText
                });
                return res.status(lookup.status).json({
                    error: 'HubSpot lookup failed',
                    details: errorText,
                });
            }

            if (!response.ok) {
                console.error('❌ [API] HubSpot contact request failed:', response.status);
                logSyncError({
                    type: 'contact',
                    operation: action || 'create',
                    entityInfo: { email: cleanEmail, name },
                    statusCode: response.status,
                    errorMessage: data.message || 'Contact sync failed in HubSpot',
                    details: data
                });
                logSyncActivity({
                    status: 'failure',
                    type: 'contact',
                    operation: action || 'create',
                    entityInfo: { email: cleanEmail, name },
                    statusCode: response.status,
                    message: data.message || 'Contact sync failed in HubSpot',
                    details: data
                });
                return res.status(response.status).json({
                    ...data,
                    action,
                });
            }

            const contactId = data.id;
            console.log(`✅ [API] Contact ${action} successful. ID: ${contactId}`);
            await recordLeadSource(contactId, 'contact', 'Website Form');
            logSyncActivity({
                status: 'success',
                type: 'contact',
                operation: action || 'create',
                entityInfo: { email: cleanEmail, name, id: contactId },
                statusCode: response.status,
                message: `Contact ${action} successful (${cleanEmail})`,
                details: data
            });

            const autoCreateSetting = await getAppSetting('auto_create_company_deal', 'false');
            const autoCreateEnabled = String(autoCreateSetting).toLowerCase() === 'true';

            let companyId = null;
            let companyError = null;
            let finalCompanyName = companyName?.trim();
            let finalCompanyDomain = companyDomain?.trim();

            const hasExplicitCompanyInfo = Boolean(finalCompanyName || finalCompanyDomain);
            const shouldProcessCompany = hasExplicitCompanyInfo || autoCreateEnabled;

            if (shouldProcessCompany) {
                if (!finalCompanyName) {
                    const emailParts = cleanEmail.split('@');
                    if (emailParts.length === 2) {
                        const domainPart = emailParts[1].toLowerCase();
                        const ignoredDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
                        if (!ignoredDomains.includes(domainPart)) {
                            finalCompanyDomain = domainPart;
                            const compBasename = domainPart.split('.')[0];
                            finalCompanyName = compBasename.charAt(0).toUpperCase() + compBasename.slice(1);
                        } else {
                            finalCompanyName = `${firstname}'s Company`;
                        }
                    } else {
                        finalCompanyName = `${firstname}'s Company`;
                    }
                }

                try {
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
                                return searchData.results[0].id;
                            }
                        }
                        return null;
                    };

                    if (finalCompanyDomain) {
                        companyId = await findCompanyInHubSpot('domain', finalCompanyDomain);
                        if (companyId) {
                            console.log(`🔄 [API] Existing company found by domain "${finalCompanyDomain}": ID ${companyId}`);
                        }
                    }

                    if (!companyId && finalCompanyName) {
                        companyId = await findCompanyInHubSpot('name', finalCompanyName);
                        if (companyId) {
                            console.log(`🔄 [API] Existing company found by name "${finalCompanyName}": ID ${companyId}`);
                        }
                    }

                    if (!companyId) {
                        console.log(`🏢 [API] Creating new Company "${finalCompanyName}" in HubSpot`);
                        const compRes = await safeFetch('https://api.hubapi.com/crm/v3/objects/companies', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                properties: {
                                    name: finalCompanyName,
                                    domain: finalCompanyDomain || '',
                                    lead_source: 'Website Form',
                                },
                            }),
                        });

                        if (compRes.ok) {
                            const compData = await compRes.json();
                            companyId = compData.id;
                            console.log(`✅ [API] Company created: ID ${companyId}`);
                            await recordLeadSource(companyId, 'company', 'Website Form');
                            logSyncActivity({
                                status: 'success',
                                type: 'company',
                                operation: 'create',
                                entityInfo: { name: finalCompanyName, domain: finalCompanyDomain, id: companyId },
                                statusCode: compRes.status,
                                message: `Company created: ${finalCompanyName}`,
                                details: compData
                            });
                        } else {
                            const compErrData = await compRes.json();
                            companyError = {
                                status: compRes.status,
                                message: compErrData.message || compErrData.error || 'Failed to create Company in HubSpot',
                                category: compErrData.category || 'CRM_ERROR'
                            };
                            console.warn('⚠️ [API] Company creation failed:', companyError);
                            logSyncError({
                                type: 'company',
                                operation: 'create',
                                entityInfo: { name: finalCompanyName, domain: finalCompanyDomain, contactEmail: cleanEmail, contactId },
                                statusCode: compRes.status,
                                errorMessage: companyError.message,
                                details: compErrData
                            });
                            logSyncActivity({
                                status: 'failure',
                                type: 'company',
                                operation: 'create',
                                entityInfo: { name: finalCompanyName, domain: finalCompanyDomain, contactEmail: cleanEmail, contactId },
                                statusCode: compRes.status,
                                message: companyError.message,
                                details: compErrData
                            });
                        }
                    }

                    if (companyId) {
                        await fetch(
                            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
                            { method: 'PUT', headers }
                        );
                        console.log(`🔗 [API] Associated Contact ${contactId} with Company ${companyId}`);
                    }
                } catch (compErr) {
                    companyError = { message: compErr.message || 'Company processing error' };
                    console.warn('⚠️ [API] Company lookup/creation error:', compErr.message);
                    logSyncError({
                        type: 'company',
                        operation: 'create',
                        entityInfo: { name: finalCompanyName, domain: finalCompanyDomain, contactEmail: cleanEmail, contactId },
                        statusCode: 500,
                        errorMessage: compErr.message,
                        details: null
                    });
                    logSyncActivity({
                        status: 'failure',
                        type: 'company',
                        operation: 'create',
                        entityInfo: { name: finalCompanyName, domain: finalCompanyDomain, contactEmail: cleanEmail, contactId },
                        statusCode: 500,
                        message: compErr.message || 'Company processing error',
                        details: null
                    });
                }
            } else {
                console.log('ℹ️ [API] Skipping Company creation (fields blank & auto_create_company_deal is OFF)');
            }

            let dealId = null;
            let dealError = null;
            let finalDealName = dealName?.trim() || (subject ? `${name.trim()} - ${subject} Deal` : '');
            let finalDealStage = 'appointmentscheduled';

            const hasExplicitDealInfo = Boolean(dealName?.trim());
            const shouldProcessDeal = hasExplicitDealInfo || autoCreateEnabled;

            if (shouldProcessDeal) {
                const VALID_DEAL_STAGES = [
                    'appointmentscheduled',
                    'qualifiedtobuy',
                    'presentationscheduled',
                    'decisionmakerboughtin',
                    'contractsent',
                    'closedwon',
                    'closedlost',
                ];

                const requestedStage = dealStage?.toString().toLowerCase().trim();
                finalDealStage = VALID_DEAL_STAGES.includes(requestedStage)
                    ? requestedStage
                    : 'appointmentscheduled';

                if (!finalDealName) {
                    finalDealName = `${name.trim()} - ${subject || 'New Lead'} Deal`;
                }

                const finalPipeline = (pipeline && typeof pipeline === 'string' && pipeline.trim())
                    ? pipeline.trim()
                    : 'default';

                const parseNumericAmount = (val) => {
                    if (val === null || val === undefined) return '0';
                    const cleaned = String(val).replace(/[^0-9.]/g, '');
                    const num = parseFloat(cleaned);
                    return isNaN(num) || num < 0 ? '0' : String(num);
                };

                const finalAmount = parseNumericAmount(dealAmount);

                try {
                    const assocRes = await fetch(
                        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/deals`,
                        { headers }
                    );

                    if (assocRes.ok) {
                        const assocData = await assocRes.json();
                        if (assocData.results && assocData.results.length > 0) {
                            dealId = assocData.results[0].id;
                            console.log(`🔄 [API] Existing deal found for contact. Updating Deal ID: ${dealId}`);

                            const updateProperties = {
                                dealname: finalDealName,
                                pipeline: finalPipeline,
                                dealstage: finalDealStage,
                                ...(dealAmount ? { amount: finalAmount } : {}),
                            };

                            const updateRes = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
                                method: 'PATCH',
                                headers,
                                body: JSON.stringify({ properties: updateProperties }),
                            });
                            if (updateRes.ok) {
                                console.log(`✅ [API] Deal updated successfully. ID: ${dealId}`);
                            } else {
                                const updateErrData = await updateRes.json();
                                dealError = {
                                    status: updateRes.status,
                                    message: updateErrData.message || 'Failed to update existing deal',
                                };
                                console.warn('⚠️ [API] Deal update failed:', dealError);
                                logSyncError({
                                    type: 'deal',
                                    operation: 'update',
                                    entityInfo: { dealName: finalDealName, contactEmail: cleanEmail, contactId, companyId, dealId },
                                    statusCode: updateRes.status,
                                    errorMessage: dealError.message,
                                    details: updateErrData
                                });
                                logSyncActivity({
                                    status: 'failure',
                                    type: 'deal',
                                    operation: 'update',
                                    entityInfo: { dealName: finalDealName, contactEmail: cleanEmail, contactId, companyId, dealId },
                                    statusCode: updateRes.status,
                                    message: dealError.message,
                                    details: updateErrData
                                });
                            }
                        }
                    }

                    if (!dealId && !dealError) {
                        console.log(`💼 [API] Creating new Deal "${finalDealName}" in Stage "${finalDealStage}"`);
                        
                        const dealBody = {
                            properties: {
                                dealname: finalDealName,
                                pipeline: finalPipeline,
                                dealstage: finalDealStage,
                                amount: finalAmount,
                                lead_source: 'Website Form',
                            },
                            associations: [
                                {
                                    to: { id: contactId },
                                    types: [
                                        {
                                            associationCategory: 'HUBSPOT_DEFINED',
                                            associationTypeId: 3
                                        }
                                    ]
                                },
                                ...(companyId ? [{
                                    to: { id: companyId },
                                    types: [
                                        {
                                            associationCategory: 'HUBSPOT_DEFINED',
                                            associationTypeId: 5
                                        }
                                    ]
                                }] : [])
                            ]
                        };

                        const dealRes = await safeFetch('https://api.hubapi.com/crm/v3/objects/deals', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({ properties: dealBody.properties, associations: dealBody.associations }),
                        });

                        if (dealRes.ok) {
                            const dealData = await dealRes.json();
                            dealId = dealData.id;
                            console.log(`✅ [API] New deal created: ID ${dealId}`);
                            await recordLeadSource(dealId, 'deal', 'Website Form');
                            logSyncActivity({
                                status: 'success',
                                type: 'deal',
                                operation: 'create',
                                entityInfo: { dealName: finalDealName, amount: finalAmount, contactId, companyId, id: dealId },
                                statusCode: dealRes.status,
                                message: `Deal created: ${finalDealName} ($${finalAmount})`,
                                details: dealData
                            });
                        } else {
                            const dealErrData = await dealRes.json();
                            dealError = {
                                status: dealRes.status,
                                message: dealErrData.message || dealErrData.error || 'Failed to create Deal in HubSpot',
                                category: dealErrData.category || 'CRM_ERROR'
                            };
                            console.warn('⚠️ [API] Deal creation response not OK:', dealError);
                            logSyncError({
                                type: 'deal',
                                operation: 'create',
                                entityInfo: { dealName: finalDealName, contactEmail: cleanEmail, contactId, companyId },
                                statusCode: dealRes.status,
                                errorMessage: dealError.message,
                                details: dealErrData
                            });
                            logSyncActivity({
                                status: 'failure',
                                type: 'deal',
                                operation: 'create',
                                entityInfo: { dealName: finalDealName, contactEmail: cleanEmail, contactId, companyId },
                                statusCode: dealRes.status,
                                message: dealError.message,
                                details: dealErrData
                            });
                        }
                    }

                    if (dealId) {
                        try {
                            await fetch(
                                `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
                                { method: 'PUT', headers }
                            );
                            if (companyId) {
                                await fetch(
                                    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/deal_to_company`,
                                    { method: 'PUT', headers }
                                );
                            }
                        } catch {
                            // Ignored
                        }
                    }
                } catch (dealErr) {
                    dealError = { message: dealErr.message || 'Deal processing error' };
                    console.warn('⚠️ [API] Deal lookup/creation error:', dealErr.message);
                    logSyncError({
                        type: 'deal',
                        operation: 'create',
                        entityInfo: { dealName: finalDealName, contactEmail: cleanEmail, contactId, companyId },
                        statusCode: 500,
                        errorMessage: dealErr.message,
                        details: null
                    });
                    logSyncActivity({
                        status: 'failure',
                        type: 'deal',
                        operation: 'create',
                        entityInfo: { dealName: finalDealName, contactEmail: cleanEmail, contactId, companyId },
                        statusCode: 500,
                        message: dealErr.message || 'Deal processing error',
                        details: null
                    });
                }
            } else {
                console.log('ℹ️ [API] Skipping Deal creation (dealName blank & auto_create_company_deal is OFF)');
            }

            const debugMode = req.headers['x-debug-mode'] === 'true';

            return res.status(200).json({
                ...data,
                action,
                companyId,
                companyName: finalCompanyName,
                companyDomain: finalCompanyDomain,
                companyError: companyError || null,
                dealId,
                dealName: finalDealName,
                dealStage: finalDealStage,
                dealError: dealError || null,
                ...(debugMode && {
                    debug: {
                        endpoint: '/api/contacts',
                        hubspot: 'connected',
                        action,
                        contactId,
                        companyId,
                        companyError,
                        companyName: finalCompanyName,
                        dealId,
                        dealError,
                        dealName: finalDealName,
                        dealStage: finalDealStage,
                        lookupStatus: lookup.status,
                        responseStatus: response.status,
                    },
                }),
            });

        } catch (err) {
            console.error('🔥 [API] Unexpected error in contacts (POST):', err);
            logSyncError({
                type: 'contact',
                operation: 'create',
                entityInfo: { email: req.body?.email || 'unknown', name: req.body?.name || 'unknown' },
                statusCode: 500,
                errorMessage: err.message || 'Unexpected server error during contact sync',
                details: null
            });
            return res.status(500).json({
                error: 'Failed to create or update contact/company/deal.',
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}