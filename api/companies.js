import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap, recordLeadSource } from '../lib/leadSourceTracker.js';
import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { authenticateRequest } from '../lib/userAuth.js';
import { can, formatRole } from '../lib/permissions.js';
import { getHubSpotOwnerIdByEmail, createHubSpotNote } from '../lib/hubspotOwners.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            console.log('🐞 [API] /api/companies (GET) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                console.log('❌ [API] Unauthorized admin request');
                return res.status(401).json({ error: 'Unauthorized. Please log in.' });
            }
            if (!can(auth.user, 'view', 'companies')) {
                console.log('⚠️ [API] Access restricted to companies');
                return res.status(403).json({ error: 'Access restricted to companies.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                console.error('❌ [API]', MISSING_TOKEN_ERROR);
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const response = await fetch(
                'https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name,domain,hubspot_owner_id,industry,type,city,state,zip,numberofemployees,annualrevenue,timezone,description,linkedin_company_page,lead_source,createdate',
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

            const companies = (data.results || []).map((c) => {
                const srcInfo = sourcesMap[String(c.id)];
                const srcName = typeof srcInfo === 'object' ? srcInfo?.source : srcInfo;
                let creator = typeof srcInfo === 'object' ? srcInfo?.created_by : null;

                const isPortalCreator = creator && !creator.toLowerCase().includes('hubspot') && !creator.toLowerCase().includes('public') && !creator.toLowerCase().includes('website');
                let leadSource = srcName || c.properties.lead_source || 'HubSpot Direct';

                if (isPortalCreator || srcInfo?.created_by_user_id) {
                    leadSource = 'Admin Dashboard';
                } else if (creator === 'Public Lead Form' || (leadSource || '').toLowerCase().includes('website')) {
                    leadSource = 'Website Form';
                } else if ((leadSource || '').toLowerCase().includes('webhook')) {
                    leadSource = 'HubSpot Webhook';
                } else if (!leadSource || leadSource === 'HubSpot CRM' || leadSource === 'HubSpot / Unknown') {
                    leadSource = 'HubSpot Direct';
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
                    id: c.id,
                    name: c.properties.name || c.properties.domain || 'Unnamed Company',
                    domain: c.properties.domain || '—',
                    hubspot_owner_id: c.properties.hubspot_owner_id || '',
                    industry: c.properties.industry || '',
                    type: c.properties.type || '',
                    city: c.properties.city || '',
                    state: c.properties.state || '',
                    zip: c.properties.zip || '',
                    numberofemployees: c.properties.numberofemployees || '',
                    annualrevenue: c.properties.annualrevenue || '',
                    timezone: c.properties.timezone || '',
                    description: c.properties.description || '',
                    linkedin_company_page: c.properties.linkedin_company_page || '',
                    lead_source: leadSource,
                    created_by: creator,
                    createdate: c.properties.createdate,
                };
            }).sort((a, b) => new Date(b.createdate || 0) - new Date(a.createdate || 0));

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

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'create', 'companies')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow creating companies.' });
            }

            const {
                name,
                domain,
                hubspot_owner_id,
                industry,
                type,
                city,
                state,
                zip,
                numberofemployees,
                annualrevenue,
                timezone,
                description,
                linkedin_company_page,
                contactId,
                allowUpdateIfExists,
            } = req.body || {};

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

            const targetName = (name || domain || '').trim();
            const targetDomain = (domain || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

            const userName = auth.user?.name || 'Admin User';
            const userEmail = auth.user?.email || 'admin@system';

            const properties = {
                name: targetName,
                lead_source: 'Admin Dashboard',
            };

            if (targetDomain) {
                properties.domain = targetDomain;
            }

            const chosenOwnerId = hubspot_owner_id || (await getHubSpotOwnerIdByEmail(auth.user?.email));
            if (chosenOwnerId) {
                properties.hubspot_owner_id = String(chosenOwnerId);
                console.log(`👤 [API] Setting HubSpot Owner ID ${chosenOwnerId}`);
            }

            if (industry && String(industry).trim()) {
                properties.industry = String(industry).trim();
            }

            if (type && String(type).trim()) {
                properties.type = String(type).trim();
            }

            if (city && String(city).trim()) {
                properties.city = String(city).trim();
            }

            if (state && String(state).trim()) {
                properties.state = String(state).trim();
            }

            if (zip && String(zip).trim()) {
                properties.zip = String(zip).trim();
            }

            if (numberofemployees !== undefined && String(numberofemployees).trim() !== '') {
                properties.numberofemployees = String(numberofemployees).trim();
            }

            if (annualrevenue !== undefined && String(annualrevenue).trim() !== '') {
                properties.annualrevenue = String(annualrevenue).trim();
            }

            if (timezone && String(timezone).trim()) {
                properties.timezone = String(timezone).trim();
            }

            if (description && String(description).trim()) {
                properties.description = String(description).trim();
            } else {
                properties.description = `Created by ${userName} (${userEmail}) via Admin Dashboard`;
            }

            if (linkedin_company_page && String(linkedin_company_page).trim()) {
                properties.linkedin_company_page = String(linkedin_company_page).trim();
            }

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
                        properties: [
                            'name', 'domain', 'hubspot_owner_id', 'industry', 'type',
                            'city', 'state', 'zip', 'numberofemployees', 'annualrevenue',
                            'timezone', 'description', 'linkedin_company_page', 'createdate'
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
                            console.warn('⚠️ [HubSpot Safety Net] Property safety trigger. Stripping custom property and retrying...');
                            if (opts.body) {
                                const parsed = JSON.parse(opts.body);
                                let modified = false;
                                if (parsed.properties && parsed.properties.lead_source) {
                                    delete parsed.properties.lead_source;
                                    modified = true;
                                }
                                if (parsed.properties && parsed.properties.hubspot_owner_id && errData.message?.includes('hubspot_owner_id')) {
                                    delete parsed.properties.hubspot_owner_id;
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

            if (companyData) {
                if (!allowUpdateIfExists) {
                    const existingName = companyData.properties?.name || targetName;
                    const existingDomain = companyData.properties?.domain || targetDomain;
                    console.warn(`⚠️ [API] Duplicate company creation rejected for domain/name: ${targetDomain || targetName} (ID: ${companyData.id})`);
                    return res.status(409).json({
                        error: `A company with domain "${existingDomain || targetName}" already exists in HubSpot CRM (${existingName}, ID #${companyData.id}). Duplicate creation is blocked.`,
                        code: 'COMPANY_ALREADY_EXISTS',
                        existingCompany: {
                            id: companyData.id,
                            name: existingName,
                            domain: existingDomain,
                            industry: companyData.properties?.industry || '',
                            type: companyData.properties?.type || '',
                            createdate: companyData.properties?.createdate
                        }
                    });
                } else {
                    console.log(`🔄 [API] allowUpdateIfExists enabled: Updating existing company ID ${companyData.id}`);
                    const updateRes = await safeHubSpotFetch(`https://api.hubapi.com/crm/v3/objects/companies/${companyData.id}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({ properties }),
                    });
                    if (updateRes.ok) {
                        companyData = await updateRes.json();
                        logSyncActivity({
                            status: 'success',
                            type: 'company',
                            operation: 'update',
                            entityInfo: { name: targetName, domain: targetDomain, id: companyData.id },
                            user: auth.user,
                            statusCode: 200,
                            message: `Company updated by ${userName}: ${targetName}`,
                            details: companyData
                        });
                    }
                }
            } else {
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
                        user: auth.user,
                        statusCode: companyRes.status,
                        message: companyData.message || 'Failed to create company in HubSpot',
                        details: companyData
                    });
                    return res.status(companyRes.status).json(companyData);
                }
                const companyId = companyData.id;
                await recordLeadSource(companyId, 'company', 'Admin Dashboard', userName, auth.user?.userId, auth.user?.email);

                // Attach creator Note in HubSpot
                const noteContent = `📌 Company Created via Local Form Bridge\n• Created By: ${userName} (${userEmail})\n• Role: ${formatRole(auth.user?.role)}\n• Lead Source: Admin Dashboard\n• Timestamp: ${new Date().toLocaleString()}`;
                await createHubSpotNote({ objectType: 'companies', objectId: companyId, noteText: noteContent });

                logSyncActivity({
                    status: 'success',
                    type: 'company',
                    operation: 'create',
                    entityInfo: { name: targetName, domain: targetDomain, id: companyData.id },
                    user: auth.user,
                    statusCode: companyRes.status,
                    message: `Company created by ${userName}: ${targetName}`,
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

    if (req.method === 'PUT') {
        try {
            console.log('🐞 [API] /api/companies (PUT) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'edit', 'companies')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow editing companies.' });
            }

            const {
                id,
                name,
                domain,
                hubspot_owner_id,
                industry,
                type,
                city,
                state,
                zip,
                numberofemployees,
                annualrevenue,
                timezone,
                description,
                linkedin_company_page,
            } = req.body || {};
            const companyId = id || req.query?.id;

            if (!companyId) {
                return res.status(400).json({ error: 'Company ID is required for updating.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            let oldRecord = {};
            try {
                const getOldRes = await fetch(
                    `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name,domain,hubspot_owner_id,industry,type,city,state,zip,numberofemployees,annualrevenue,timezone,description,linkedin_company_page`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (getOldRes.ok) {
                    const getOldData = await getOldRes.json();
                    oldRecord = getOldData.properties || {};
                }
            } catch (fetchErr) {
                console.warn('⚠️ [API] Could not fetch old company record:', fetchErr.message);
            }

            const properties = {};
            const diffParts = [];
            const changes = {};

            if (name !== undefined) {
                const trimmed = name.trim();
                properties.name = trimmed;
                const oldName = oldRecord.name || '';
                if (trimmed && trimmed !== oldName) {
                    changes.name = { old: oldName || '—', new: trimmed };
                    diffParts.push(`Name ("${oldName || '—'}" → "${trimmed}")`);
                }
            }

            if (domain !== undefined) {
                const trimmedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
                properties.domain = trimmedDomain;
                const oldDomain = oldRecord.domain || '';
                if (trimmedDomain !== oldDomain) {
                    changes.domain = { old: oldDomain || '—', new: trimmedDomain || '—' };
                    diffParts.push(`Domain ("${oldDomain || '—'}" → "${trimmedDomain || '—'}")`);
                }
            }

            if (hubspot_owner_id !== undefined) {
                properties.hubspot_owner_id = hubspot_owner_id ? String(hubspot_owner_id) : '';
                const oldOwner = oldRecord.hubspot_owner_id || '';
                if (properties.hubspot_owner_id !== oldOwner) {
                    changes.hubspot_owner_id = { old: oldOwner || '—', new: properties.hubspot_owner_id || '—' };
                    diffParts.push(`Owner ("${oldOwner || '—'}" → "${properties.hubspot_owner_id || '—'}")`);
                }
            }

            if (industry !== undefined) {
                properties.industry = String(industry).trim();
                const oldInd = oldRecord.industry || '';
                if (properties.industry !== oldInd) {
                    changes.industry = { old: oldInd || '—', new: properties.industry || '—' };
                    diffParts.push(`Industry ("${oldInd || '—'}" → "${properties.industry || '—'}")`);
                }
            }

            if (type !== undefined) {
                properties.type = String(type).trim();
                const oldType = oldRecord.type || '';
                if (properties.type !== oldType) {
                    changes.type = { old: oldType || '—', new: properties.type || '—' };
                    diffParts.push(`Type ("${oldType || '—'}" → "${properties.type || '—'}")`);
                }
            }

            if (city !== undefined) {
                properties.city = String(city).trim();
                const oldVal = oldRecord.city || '';
                if (properties.city !== oldVal) {
                    changes.city = { old: oldVal || '—', new: properties.city || '—' };
                    diffParts.push(`City ("${oldVal || '—'}" → "${properties.city || '—'}")`);
                }
            }

            if (state !== undefined) {
                properties.state = String(state).trim();
                const oldVal = oldRecord.state || '';
                if (properties.state !== oldVal) {
                    changes.state = { old: oldVal || '—', new: properties.state || '—' };
                    diffParts.push(`State/Region ("${oldVal || '—'}" → "${properties.state || '—'}")`);
                }
            }

            if (zip !== undefined) {
                properties.zip = String(zip).trim();
                const oldVal = oldRecord.zip || '';
                if (properties.zip !== oldVal) {
                    changes.zip = { old: oldVal || '—', new: properties.zip || '—' };
                    diffParts.push(`Postal Code ("${oldVal || '—'}" → "${properties.zip || '—'}")`);
                }
            }

            if (numberofemployees !== undefined) {
                properties.numberofemployees = String(numberofemployees).trim();
                const oldVal = oldRecord.numberofemployees || '';
                if (properties.numberofemployees !== oldVal) {
                    changes.numberofemployees = { old: oldVal || '—', new: properties.numberofemployees || '—' };
                    diffParts.push(`Employees ("${oldVal || '—'}" → "${properties.numberofemployees || '—'}")`);
                }
            }

            if (annualrevenue !== undefined) {
                properties.annualrevenue = String(annualrevenue).trim();
                const oldVal = oldRecord.annualrevenue || '';
                if (properties.annualrevenue !== oldVal) {
                    changes.annualrevenue = { old: oldVal || '—', new: properties.annualrevenue || '—' };
                    diffParts.push(`Annual Revenue ("${oldVal || '—'}" → "${properties.annualrevenue || '—'}")`);
                }
            }

            if (timezone !== undefined) {
                properties.timezone = String(timezone).trim();
                const oldVal = oldRecord.timezone || '';
                if (properties.timezone !== oldVal) {
                    changes.timezone = { old: oldVal || '—', new: properties.timezone || '—' };
                    diffParts.push(`Time Zone ("${oldVal || '—'}" → "${properties.timezone || '—'}")`);
                }
            }

            if (description !== undefined) {
                properties.description = String(description).trim();
                const oldVal = oldRecord.description || '';
                if (properties.description !== oldVal) {
                    changes.description = { old: oldVal || '—', new: properties.description || '—' };
                    diffParts.push(`Description updated`);
                }
            }

            if (linkedin_company_page !== undefined) {
                properties.linkedin_company_page = String(linkedin_company_page).trim();
                const oldVal = oldRecord.linkedin_company_page || '';
                if (properties.linkedin_company_page !== oldVal) {
                    changes.linkedin_company_page = { old: oldVal || '—', new: properties.linkedin_company_page || '—' };
                    diffParts.push(`LinkedIn Page ("${oldVal || '—'}" → "${properties.linkedin_company_page || '—'}")`);
                }
            }

            const diffSummary = diffParts.length > 0
                ? `Company updated: ${diffParts.join(', ')}`
                : `Company updated (ID: ${companyId}): No fields changed`;

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
                `https://api.hubapi.com/crm/v3/objects/companies/${companyId}`,
                token,
                properties
            );

            const finalName = properties.name !== undefined ? properties.name : (oldRecord.name || 'Company');
            const finalDomain = properties.domain !== undefined ? properties.domain : (oldRecord.domain || '—');

            const data = await response.json();

            if (!response.ok) {
                logSyncError({
                    type: 'company',
                    operation: 'update',
                    entityInfo: { companyId, name: finalName, domain: finalDomain, changes },
                    statusCode: response.status,
                    errorMessage: data.message || 'Failed to update company in HubSpot',
                    details: data
                });
                return res.status(response.status).json(data);
            }

            // Post update Note in HubSpot timeline
            const userName = auth.user?.name || 'Admin User';
            const userEmail = auth.user?.email || 'admin@system';
            if (diffParts.length > 0) {
                const noteContent = `📝 Updated via Admin Dashboard\n• Editor: ${userName} (${userEmail})\n• Changes: ${diffParts.join(', ')}\n• Timestamp: ${new Date().toLocaleString()}`;
                await createHubSpotNote({ objectType: 'companies', objectId: companyId, noteText: noteContent });
            }

            logSyncActivity({
                status: 'success',
                type: 'company',
                operation: 'update',
                entityInfo: { companyId, name: finalName, domain: finalDomain, changes },
                user: auth.user,
                statusCode: response.status,
                message: `[${userName}] ${diffSummary}`,
                details: { companyId, changes, data }
            });

            return res.status(200).json({ success: true, company: data, changes });
        } catch (err) {
            console.error('🔥 [API] Edit company error:', err);
            return res.status(500).json({ error: err.message || 'Failed to update company.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            console.log('🐞 [API] /api/companies (DELETE) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'delete', 'companies')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow deleting companies.' });
            }

            const companyId = req.query?.id || req.body?.id;
            if (!companyId) {
                return res.status(400).json({ error: 'Company ID is required for deletion.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const response = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${companyId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json().catch(() => ({}));
                logSyncError({
                    type: 'company',
                    operation: 'delete',
                    entityInfo: { companyId },
                    statusCode: response.status,
                    errorMessage: data.message || 'Failed to delete company in HubSpot',
                    details: data
                });
                return res.status(response.status).json(data);
            }

            logSyncActivity({
                status: 'success',
                type: 'company',
                operation: 'delete',
                entityInfo: { companyId },
                user: auth.user,
                statusCode: 204,
                message: `Company deleted by ${auth.user?.name || 'User'} (ID: ${companyId})`,
                details: null
            });

            return res.status(200).json({ success: true, message: 'Company deleted successfully.' });
        } catch (err) {
            console.error('🔥 [API] Delete company error:', err);
            return res.status(500).json({ error: err.message || 'Failed to delete company.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

