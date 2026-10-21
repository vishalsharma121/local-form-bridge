import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap, recordLeadSource } from '../lib/leadSourceTracker.js';
import { logSyncError } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { authenticateRequest } from '../lib/userAuth.js';
import { can, formatRole } from '../lib/permissions.js';
import { getHubSpotOwnerIdByEmail, createHubSpotNote } from '../lib/hubspotOwners.js';

function sanitizeAndValidatePhone(rawPhone) {
    if (rawPhone === undefined || rawPhone === null) return { valid: true, phone: undefined };
    if (!String(rawPhone).trim()) return { valid: true, phone: '' };

    const trimmed = String(rawPhone).trim();
    if (/[a-wy-z]/i.test(trimmed)) {
        return { valid: false, error: 'Invalid phone number. Text and letters are not allowed in phone numbers.' };
    }
    const digitsCount = (trimmed.match(/\d/g) || []).length;
    if (digitsCount < 7 || digitsCount > 15) {
        return { valid: false, error: 'Please enter a valid phone number containing 7 to 15 digits (e.g. +1 555 000 0000).' };
    }

    const cleaned = trimmed.replace(/[^0-9+\-\s()xX]/g, '');
    return { valid: true, phone: cleaned };
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            console.log('🐞 [API] /api/contacts (GET) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                console.log('❌ [API] Unauthorized admin request');
                return res.status(401).json({ error: 'Unauthorized. Please log in.' });
            }
            if (!can(auth.user, 'view', 'contacts')) {
                console.log('⚠️ [API] Access restricted to contacts');
                return res.status(403).json({ error: 'Access restricted to contacts.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                console.error('❌ [API]', MISSING_TOKEN_ERROR);
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const response = await fetch(
                'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,jobtitle,hubspot_owner_id,lifecyclestage,hs_lead_status,subject,message,lead_source,createdate&associations=companies,deals&sorts=-createdate',
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

            const contacts = (data.results || []).map((c) => {
                const fn = c.properties.firstname || '';
                const ln = (c.properties.lastname === '-' ? '' : c.properties.lastname) || '';
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
                    firstname: fn,
                    lastname: ln,
                    name: `${fn} ${ln}`.trim() || 'Lead',
                    email: c.properties.email || '',
                    phone: c.properties.phone || '',
                    jobtitle: c.properties.jobtitle || '',
                    hubspot_owner_id: c.properties.hubspot_owner_id || '',
                    lifecyclestage: c.properties.lifecyclestage || 'lead',
                    hs_lead_status: c.properties.hs_lead_status || '',
                    associatedCompanyIds: (c.associations?.companies?.results || []).map(r => String(r.id)),
                    associatedDealIds: (c.associations?.deals?.results || []).map(r => String(r.id)),
                    subject: c.properties.subject || '',
                    message: c.properties.message || '',
                    lead_source: leadSource,
                    created_by: creator,
                    createdate: c.properties.createdate,
                };
            });

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
                firstname: reqFirstname,
                lastname: reqLastname,
                email, 
                phone, 
                jobtitle,
                hubspot_owner_id,
                ownerId: reqOwnerId,
                lifecyclestage,
                hs_lead_status,
                subject, 
                message,
                companyId: reqCompanyId,
                companyName,
                companyDomain,
                dealId: reqDealId,
                dealName,
                pipeline,
                dealStage,
                dealAmount
            } = req.body || {};

            let firstname = (reqFirstname || '').trim();
            let lastname = (reqLastname || '').trim();
            if (!firstname && name?.trim()) {
                const [fn, ...rest] = name.trim().split(/\s+/);
                firstname = fn;
                lastname = rest.join(' ');
            }

            if ((!firstname && !name?.trim()) || !email?.trim()) {
                console.log('❌ [API] Validation failed: firstname/name or email missing');
                return res.status(400).json({
                    error: 'First name and email are required.',
                });
            }

            const cleanEmail = email.trim();

            const token = getHubSpotToken();
            if (!token) {
                console.error('❌ [API]', MISSING_TOKEN_ERROR);
                await logSyncError({
                    type: 'contact',
                    operation: 'auth',
                    entityInfo: { email: cleanEmail, name: `${firstname} ${lastname}`.trim() },
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

            const auth = await authenticateRequest(req);
            if (auth.authenticated && !can(auth.user, 'create', 'contacts')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow creating contacts.' });
            }
            const userName = auth.user?.name || (req.headers['x-admin-key'] ? 'Admin User' : 'Public Lead Form');

            const effectiveLeadSource = req.body?.leadSource || (auth.authenticated ? 'Admin Dashboard' : (req.headers['x-admin-key'] ? 'Admin Dashboard' : 'Website Form'));

            const defaultOwnerId = await getHubSpotOwnerIdByEmail(auth.user?.email);

            const phoneVal = sanitizeAndValidatePhone(phone);
            if (!phoneVal.valid) {
                return res.status(400).json({ error: phoneVal.error });
            }

            const properties = {
                firstname,
                lastname: lastname || '',
                email: cleanEmail,
                phone: phoneVal.phone || '',
                lead_source: effectiveLeadSource,
            };

            if (subject && String(subject).trim()) {
                properties.subject = String(subject).trim();
            }

            if (message && String(message).trim()) {
                properties.message = String(message).trim();
            }

            if (jobtitle && String(jobtitle).trim()) {
                properties.jobtitle = String(jobtitle).trim();
            }

            if (lifecyclestage && String(lifecyclestage).trim()) {
                properties.lifecyclestage = String(lifecyclestage).trim();
            }

            if (hs_lead_status && String(hs_lead_status).trim()) {
                properties.hs_lead_status = String(hs_lead_status).trim();
            }

            const chosenOwnerId = hubspot_owner_id || reqOwnerId;
            if (chosenOwnerId) {
                properties.hubspot_owner_id = String(chosenOwnerId);
            } else if (defaultOwnerId) {
                properties.hubspot_owner_id = defaultOwnerId;
            }

            const safeFetch = async (url, opts) => {
                let res = await fetch(url, opts);
                let attempts = 0;
                while (!res.ok && res.status === 400 && attempts < 3) {
                    attempts++;
                    try {
                        const cloned = res.clone();
                        const errData = await cloned.json();
                        const missingProps = new Set();

                        if (errData.errors && Array.isArray(errData.errors)) {
                            for (const e of errData.errors) {
                                if (e.code === 'PROPERTY_DOESNT_EXIST') {
                                    if (e.name) missingProps.add(e.name);
                                    const match = e.message?.match(/Property "([^"]+)" does not exist/);
                                    if (match && match[1]) missingProps.add(match[1]);
                                }
                            }
                        }

                        const mainMatch = errData.message?.match(/Property "([^"]+)" does not exist/);
                        if (mainMatch && mainMatch[1]) missingProps.add(mainMatch[1]);

                        if (missingProps.size > 0 && opts.body) {
                            const parsed = JSON.parse(opts.body);
                            if (parsed.properties) {
                                let modified = false;
                                for (const prop of missingProps) {
                                    if (parsed.properties[prop] !== undefined) {
                                        console.warn(`⚠️ [HubSpot Safety Net] Property "${prop}" does not exist in HubSpot portal. Retrying without "${prop}"...`);
                                        delete parsed.properties[prop];
                                        modified = true;
                                    }
                                }
                                if (modified) {
                                    opts.body = JSON.stringify(parsed);
                                    res = await fetch(url, opts);
                                    continue;
                                }
                            }
                        }
                    } catch {
                        // Ignore parse errors
                    }
                    break;
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
                const existing = await lookup.json();
                console.log('🔄 [API] Existing contact found. ID:', existing.id);

                const isManualDashboardCreate = effectiveLeadSource === 'Admin Dashboard' || (auth.authenticated && req.headers['authorization']);
                const allowUpdate = Boolean(req.body?.allowUpdateIfExists);

                if (isManualDashboardCreate && !allowUpdate) {
                    const existingName = `${existing.properties?.firstname || ''} ${existing.properties?.lastname || ''}`.trim() || 'Existing Contact';
                    console.warn(`⚠️ [API] Duplicate contact creation rejected for email: ${cleanEmail} (ID: ${existing.id})`);
                    return res.status(409).json({
                        error: `A contact with email "${cleanEmail}" already exists in HubSpot CRM (${existingName}, ID #${existing.id}). Duplicate creation is blocked.`,
                        code: 'CONTACT_ALREADY_EXISTS',
                        conflict: true,
                        existingContact: {
                            id: existing.id,
                            name: existingName,
                            email: cleanEmail
                        }
                    });
                }

                action = 'update';
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
                        const isManualDashboardCreate = effectiveLeadSource === 'Admin Dashboard' || (auth.authenticated && req.headers['authorization']);
                        const allowUpdate = Boolean(req.body?.allowUpdateIfExists);

                        if (isManualDashboardCreate && !allowUpdate) {
                            const existingName = `${existingRetry.properties?.firstname || ''} ${existingRetry.properties?.lastname || ''}`.trim() || 'Existing Contact';
                            return res.status(409).json({
                                error: `A contact with email "${cleanEmail}" already exists in HubSpot CRM (${existingName}, ID #${existingRetry.id}). Duplicate creation is blocked.`,
                                code: 'CONTACT_ALREADY_EXISTS',
                                conflict: true,
                                existingContact: {
                                    id: existingRetry.id,
                                    name: existingName,
                                    email: cleanEmail
                                }
                            });
                        }

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
            await recordLeadSource(contactId, 'contact', effectiveLeadSource, userName, auth.user?.userId, auth.user?.email);

            const noteContent = `📌 Contact ${action === 'create' ? 'Created' : 'Updated'} via Local Form Bridge
• Application: Local Form Bridge
• Created By: ${userName} (${auth.user?.email || 'N/A'})
• Role: ${formatRole(auth.user?.role)}
• Lead Source: ${effectiveLeadSource}
• Timestamp: ${new Date().toLocaleString()}`;

            await createHubSpotNote({ objectType: 'contacts', objectId: contactId, noteText: noteContent });

            logSyncActivity({
                status: 'success',
                type: 'contact',
                operation: action || 'create',
                entityInfo: { email: cleanEmail, name, id: contactId },
                user: auth.user,
                statusCode: response.status,
                message: `Contact ${action} successful (${cleanEmail})`,
                details: data
            });

            let companyId = reqCompanyId ? String(reqCompanyId).trim() : null;
            let companyError = null;
            let finalCompanyName = companyName?.trim();
            let finalCompanyDomain = companyDomain?.trim();

            if (companyId) {
                try {
                    await fetch(
                        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
                        { method: 'PUT', headers }
                    );
                    console.log(`🔗 [API] Associated Contact ${contactId} with selected Company ${companyId}`);
                } catch (cErr) {
                    console.warn(`⚠️ [API] Failed associating selected Company:`, cErr.message);
                }
            } else if (Boolean(finalCompanyName || finalCompanyDomain)) {
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
                                    lead_source: 'Admin Dashboard',
                                },
                            }),
                        });

                        if (compRes.ok) {
                            const compData = await compRes.json();
                            companyId = compData.id;
                            console.log(`✅ [API] Company created: ID ${companyId}`);
                            await recordLeadSource(companyId, 'company', effectiveLeadSource || 'Website Form', userName, auth.user?.userId, auth.user?.email);

                            await createHubSpotNote({
                                objectType: 'companies',
                                objectId: companyId,
                                noteText: `📌 Company Created via Local Form Bridge\n• Created By: ${userName} (${auth.user?.email || 'N/A'})\n• Role: ${formatRole(auth.user?.role)}\n• Lead Source: ${effectiveLeadSource || 'Website Form'}\n• Timestamp: ${new Date().toLocaleString()}`
                            });
                            logSyncActivity({
                                status: 'success',
                                type: 'company',
                                operation: 'create',
                                entityInfo: { name: finalCompanyName, domain: finalCompanyDomain, id: companyId },
                                user: auth.user,
                                statusCode: compRes.status,
                                message: `Company created by ${userName}: ${finalCompanyName}`,
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

            let dealId = reqDealId ? String(reqDealId).trim() : null;
            let dealError = null;
            let finalDealName = dealName?.trim();
            let finalDealStage = 'appointmentscheduled';

            if (dealId) {
                try {
                    await fetch(
                        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
                        { method: 'PUT', headers }
                    );
                    console.log(`🔗 [API] Associated Contact ${contactId} with selected Deal ${dealId}`);
                    if (companyId) {
                        await fetch(
                            `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/deal_to_company`,
                            { method: 'PUT', headers }
                        );
                        console.log(`🔗 [API] Associated selected Deal ${dealId} with Company ${companyId}`);
                    }
                } catch (dErr) {
                    console.warn(`⚠️ [API] Failed associating selected Deal:`, dErr.message);
                }
            } else if (Boolean(finalDealName)) {
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
                                lead_source: 'Admin Dashboard',
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
                            await recordLeadSource(dealId, 'deal', effectiveLeadSource || 'Website Form', userName, auth.user?.userId, auth.user?.email);

                            await createHubSpotNote({
                                objectType: 'deals',
                                objectId: dealId,
                                noteText: `📌 Deal Created via Local Form Bridge\n• Created By: ${userName} (${auth.user?.email || 'N/A'})\n• Role: ${formatRole(auth.user?.role)}\n• Lead Source: ${effectiveLeadSource || 'Admin Dashboard'}\n• Timestamp: ${new Date().toLocaleString()}`
                            });
                            logSyncActivity({
                                status: 'success',
                                type: 'deal',
                                operation: 'create',
                                entityInfo: { dealName: finalDealName, amount: finalAmount, contactId, companyId, id: dealId },
                                user: auth.user,
                                statusCode: dealRes.status,
                                message: `Deal created by ${userName}: ${finalDealName} ($${finalAmount})`,
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

    if (req.method === 'PATCH' || req.method === 'PUT') {
        try {
            console.log(`🐞 [API] /api/contacts (${req.method}) called`);

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'edit', 'contacts')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow editing contacts.' });
            }

            const { 
                id, 
                name, 
                firstname: patchFirstname,
                lastname: patchLastname,
                email, 
                phone, 
                jobtitle,
                hubspot_owner_id,
                ownerId: patchOwnerId,
                lifecyclestage,
                hs_lead_status,
                subject, 
                message 
            } = req.body || {};
            const contactId = id || req.query?.id;

            if (!contactId) {
                return res.status(400).json({ error: 'Contact ID is required for updating.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            let firstname = patchFirstname !== undefined ? patchFirstname.trim() : '';
            let lastname = patchLastname !== undefined ? patchLastname.trim() : '';
            if (name && patchFirstname === undefined) {
                const parts = name.trim().split(/\s+/);
                firstname = parts[0];
                lastname = parts.slice(1).join(' ');
            }

            const properties = {};
            if (firstname || patchFirstname !== undefined) properties.firstname = firstname;
            if (lastname || patchLastname !== undefined || (name !== undefined && patchFirstname === undefined)) {
                properties.lastname = lastname || '';
            }
            if (email) properties.email = email.trim();
            if (phone !== undefined) {
                const phoneVal = sanitizeAndValidatePhone(phone);
                if (!phoneVal.valid) {
                    return res.status(400).json({ error: phoneVal.error });
                }
                properties.phone = phoneVal.phone || '';
            }
            if (jobtitle !== undefined) properties.jobtitle = jobtitle.trim();
            if (lifecyclestage !== undefined) properties.lifecyclestage = lifecyclestage.trim();
            if (hs_lead_status !== undefined) properties.hs_lead_status = hs_lead_status.trim();
            
            const chosenOwner = hubspot_owner_id || patchOwnerId;
            if (chosenOwner) {
                properties.hubspot_owner_id = String(chosenOwner);
            }

            if (subject !== undefined) properties.subject = subject;
            if (message !== undefined) properties.message = message;

            let oldRecord = {};
            try {
                const getOldRes = await fetch(
                    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone,jobtitle,hubspot_owner_id,lifecyclestage,hs_lead_status,subject,message`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (getOldRes.ok) {
                    const getOldData = await getOldRes.json();
                    oldRecord = getOldData.properties || {};
                }
            } catch (fetchErr) {
                console.warn('⚠️ [API] Could not fetch old contact record:', fetchErr.message);
            }

            const diffParts = [];
            const changes = {};

            const oldFn = oldRecord.firstname || '';
            const oldLn = (oldRecord.lastname === '-' ? '' : oldRecord.lastname) || '';
            const oldFullName = `${oldFn} ${oldLn}`.trim();
            const newFullName = (firstname || lastname) ? `${firstname} ${lastname}`.trim() : (name ? name.trim() : oldFullName);
            if (newFullName && newFullName !== oldFullName) {
                changes.name = { old: oldFullName || '—', new: newFullName };
                diffParts.push(`Name ("${oldFullName || '—'}" → "${newFullName}")`);
            }

            const oldEmail = oldRecord.email || '';
            const newEmail = email ? email.trim() : oldEmail;
            if (newEmail && newEmail !== oldEmail) {
                changes.email = { old: oldEmail || '—', new: newEmail };
                diffParts.push(`Email ("${oldEmail || '—'}" → "${newEmail}")`);
            }

            const oldPhone = oldRecord.phone || '';
            const newPhone = phone !== undefined ? phone.trim() : oldPhone;
            if (newPhone !== oldPhone) {
                changes.phone = { old: oldPhone || '—', new: newPhone || '—' };
                diffParts.push(`Phone ("${oldPhone || '—'}" → "${newPhone || '—'}")`);
            }

            const oldJobTitle = oldRecord.jobtitle || '';
            const newJobTitle = jobtitle !== undefined ? jobtitle.trim() : oldJobTitle;
            if (newJobTitle !== oldJobTitle) {
                changes.jobtitle = { old: oldJobTitle || '—', new: newJobTitle || '—' };
                diffParts.push(`Job Title ("${oldJobTitle || '—'}" → "${newJobTitle || '—'}")`);
            }

            const oldLifecycle = oldRecord.lifecyclestage || '';
            const newLifecycle = lifecyclestage !== undefined ? lifecyclestage.trim() : oldLifecycle;
            if (newLifecycle !== oldLifecycle) {
                changes.lifecyclestage = { old: oldLifecycle || '—', new: newLifecycle || '—' };
                diffParts.push(`Lifecycle Stage ("${oldLifecycle || '—'}" → "${newLifecycle || '—'}")`);
            }

            const oldStatus = oldRecord.hs_lead_status || '';
            const newStatus = hs_lead_status !== undefined ? hs_lead_status.trim() : oldStatus;
            if (newStatus !== oldStatus) {
                changes.hs_lead_status = { old: oldStatus || '—', new: newStatus || '—' };
                diffParts.push(`Lead Status ("${oldStatus || '—'}" → "${newStatus || '—'}")`);
            }

            const oldSubject = oldRecord.subject || '';
            const newSubject = subject !== undefined ? subject.trim() : oldSubject;
            if (newSubject !== oldSubject) {
                changes.subject = { old: oldSubject || '—', new: newSubject || '—' };
                diffParts.push(`Subject ("${oldSubject || '—'}" → "${newSubject || '—'}")`);
            }

            const oldMsgPayload = oldRecord.message || '';
            const newMsgPayload = message !== undefined ? message.trim() : oldMsgPayload;
            if (newMsgPayload !== oldMsgPayload) {
                changes.message = { old: oldMsgPayload || '—', new: newMsgPayload || '—' };
                diffParts.push(`Message ("${oldMsgPayload || '—'}" → "${newMsgPayload || '—'}")`);
            }

            if (!chosenOwner) {
                const autoOwnerId = await getHubSpotOwnerIdByEmail(auth.user?.email);
                if (autoOwnerId) {
                    properties.hubspot_owner_id = autoOwnerId;
                }
            }

            const diffSummary = diffParts.length > 0
                ? `Contact updated: ${diffParts.join(', ')}`
                : `Contact updated (ID: ${contactId}): No fields changed`;

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
                `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
                token,
                properties
            );

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                await logSyncError({
                    type: 'contact',
                    operation: 'update',
                    entityInfo: { contactId, email: newEmail, name: newFullName, changes },
                    statusCode: response.status,
                    errorMessage: data.message || 'Failed to update contact in HubSpot',
                    details: data
                });
                await logSyncActivity({
                    status: 'failure',
                    type: 'contact',
                    operation: 'update',
                    entityInfo: { contactId, email: newEmail, name: newFullName, changes },
                    statusCode: response.status,
                    message: data.message || 'Failed to update contact in HubSpot',
                    details: data
                });
                return res.status(response.status).json(data);
            }

            const userName = auth.user?.name || 'Admin User';
            const userEmail = auth.user?.email || 'admin@system';
            const userRole = auth.user?.role || 'Admin';

            const noteContent = `📝 Contact Updated via Local Form Bridge\n• Editor: ${userName} (${userEmail})\n• Role: ${formatRole(userRole)}\n• Changes: ${diffParts.length > 0 ? diffParts.join(', ') : 'Updated contact details'}\n• Timestamp: ${new Date().toLocaleString()}`;
            await createHubSpotNote({ objectType: 'contacts', objectId: contactId, noteText: noteContent });

            await logSyncActivity({
                status: 'success',
                type: 'contact',
                operation: 'update',
                entityInfo: { contactId, email: newEmail, name: newFullName, changes },
                user: auth.user,
                statusCode: response.status,
                message: `[${auth.user?.name || 'User'}] ${diffSummary}`,
                details: { contactId, changes, data }
            });

            return res.status(200).json({ success: true, contact: data, changes });
        } catch (err) {
            console.error('🔥 [API] Edit contact error:', err);
            const fallbackId = req.body?.id || req.query?.id;
            await logSyncError({
                type: 'contact',
                operation: 'update',
                entityInfo: { contactId: fallbackId, email: req.body?.email, name: req.body?.name },
                statusCode: 500,
                errorMessage: err.message || 'Failed to update contact.',
                details: null
            });
            await logSyncActivity({
                status: 'failure',
                type: 'contact',
                operation: 'update',
                entityInfo: { contactId: fallbackId, email: req.body?.email, name: req.body?.name },
                statusCode: 500,
                message: err.message || 'Failed to update contact.',
                details: null
            });
            return res.status(500).json({ error: err.message || 'Failed to update contact.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            console.log('🐞 [API] /api/contacts (DELETE) called');

            const auth = await authenticateRequest(req);
            if (!auth.authenticated) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!can(auth.user, 'delete', 'contacts')) {
                return res.status(403).json({ error: 'Permission denied. Your user permissions do not allow deleting contacts.' });
            }

            const contactId = req.query?.id || req.body?.id;
            if (!contactId) {
                return res.status(400).json({ error: 'Contact ID is required for deletion.' });
            }

            const token = getHubSpotToken();
            if (!token) {
                return res.status(500).json({ error: MISSING_TOKEN_ERROR });
            }

            const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json().catch(() => ({}));
                await logSyncError({
                    type: 'contact',
                    operation: 'delete',
                    entityInfo: { contactId },
                    statusCode: response.status,
                    errorMessage: data.message || 'Failed to delete contact in HubSpot',
                    details: data
                });
                await logSyncActivity({
                    status: 'failure',
                    type: 'contact',
                    operation: 'delete',
                    entityInfo: { contactId },
                    statusCode: response.status,
                    message: data.message || 'Failed to delete contact in HubSpot',
                    details: data
                });
                return res.status(response.status).json(data);
            }

            await logSyncActivity({
                status: 'success',
                type: 'contact',
                operation: 'delete',
                entityInfo: { contactId },
                user: auth.user,
                statusCode: 204,
                message: `Contact deleted by ${auth.user?.name || 'User'} (ID: ${contactId})`,
                details: null
            });

            return res.status(200).json({ success: true, message: 'Contact deleted successfully.' });
        } catch (err) {
            console.error('🔥 [API] Delete contact error:', err);
            const fallbackId = req.query?.id || req.body?.id;
            await logSyncError({
                type: 'contact',
                operation: 'delete',
                entityInfo: { contactId: fallbackId },
                statusCode: 500,
                errorMessage: err.message || 'Failed to delete contact.',
                details: null
            });
            await logSyncActivity({
                status: 'failure',
                type: 'contact',
                operation: 'delete',
                entityInfo: { contactId: fallbackId },
                statusCode: 500,
                message: err.message || 'Failed to delete contact.',
                details: null
            });
            return res.status(500).json({ error: err.message || 'Failed to delete contact.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}