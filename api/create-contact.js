export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
        });
    }

    try {
        console.log('🐞 [API] /api/create-contact called');

        const { name, email, phone, subject, message } = req.body || {};

        // Validate required fields
        if (!name?.trim() || !email?.trim()) {
            console.log('❌ [API] Validation failed: name or email missing');

            return res.status(400).json({
                error: 'Name and email are required.',
            });
        }

        const [firstname, ...rest] = name.trim().split(/\s+/);
        const lastname = rest.join(' ') || '-';

        // Get HubSpot token from environment variable
        const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

        if (!token) {
            console.error('❌ [API] HubSpot token is not configured');

            return res.status(500).json({
                error: 'HubSpot token is not configured.',
            });
        }

        const properties = {
            firstname,
            lastname,
            email: email.trim(),
            phone: phone || '',
            subject: subject || '',
            message: message || '',
        };

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        console.log('🔍 [API] Checking whether contact already exists');
        console.log('📧 [API] Email:', email.trim());

        // Check whether contact already exists
        const lookup = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
                email.trim()
            )}?idProperty=email`,
            {
                headers,
            }
        );

        console.log('📡 [API] HubSpot lookup status:', lookup.status);

        let response;
        let action = '';

        // Existing contact
        if (lookup.status === 200) {
            action = 'update';

            const existing = await lookup.json();

            console.log('🔄 [API] Existing contact found');
            console.log('🆔 [API] Contact ID:', existing.id);

            // Update existing contact
            response = await fetch(
                `https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`,
                {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        properties,
                    }),
                }
            );

            console.log('📡 [API] HubSpot UPDATE status:', response.status);
        }

        // Contact does not exist
        else if (lookup.status === 404) {
            action = 'create';

            console.log('🆕 [API] Contact does not exist');
            console.log('➕ [API] Creating new HubSpot contact');

            // Create new contact
            response = await fetch(
                'https://api.hubapi.com/crm/v3/objects/contacts',
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        properties,
                    }),
                }
            );

            console.log('📡 [API] HubSpot CREATE status:', response.status);
        }

        // Unexpected lookup error
        else {
            const errorText = await lookup.text();

            console.error(
                '❌ [API] HubSpot lookup failed:',
                lookup.status
            );

            return res.status(lookup.status).json({
                error: 'HubSpot lookup failed',
                details: errorText,
            });
        }

        // Read HubSpot response
        const data = await response.json();

        // HubSpot returned an error
        if (!response.ok) {
            console.error(
                '❌ [API] HubSpot request failed:',
                response.status
            );

            return res.status(response.status).json({
                ...data,
                action,
            });
        }

        const contactId = data.id;
        console.log(`✅ [API] Contact ${action} successful. ID: ${contactId}`);

        // ------------------------------------------------
        // OPTIONAL: CREATE COMPANY & ASSOCIATE
        // ------------------------------------------------
        let companyId = null;
        const { companyName, companyDomain, dealName, pipeline, dealStage, dealAmount } = req.body || {};

        if (companyName?.trim() || companyDomain?.trim()) {
            try {
                console.log('🏢 [API] Creating Company in HubSpot');
                const compRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        properties: {
                            name: (companyName || companyDomain).trim(),
                            domain: (companyDomain || '').trim(),
                        },
                    }),
                });

                if (compRes.ok) {
                    const compData = await compRes.json();
                    companyId = compData.id;
                    console.log(`✅ [API] Company created: ${companyId}`);

                    // Associate Contact -> Company
                    await fetch(
                        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
                        { method: 'PUT', headers }
                    );
                    console.log('🔗 [API] Associated Contact with Company');
                }
            } catch (compErr) {
                console.warn('⚠️ [API] Company creation/association warning:', compErr.message);
            }
        }

        // ------------------------------------------------
        // OPTIONAL: CREATE DEAL & ASSOCIATE
        // ------------------------------------------------
        let dealId = null;
        const targetDealName = dealName?.trim() || (companyName?.trim() ? `${companyName.trim()} Deal` : null);

        if (targetDealName) {
            try {
                console.log('💼 [API] Creating Deal in HubSpot');
                const dealRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        properties: {
                            dealname: targetDealName,
                            pipeline: pipeline || 'default',
                            dealstage: dealstage || 'appointmentscheduled',
                            amount: dealAmount ? String(dealAmount) : '0',
                        },
                    }),
                });

                if (dealRes.ok) {
                    const dealData = await dealRes.json();
                    dealId = dealData.id;
                    console.log(`✅ [API] Deal created: ${dealId}`);

                    // Associate Deal -> Contact
                    await fetch(
                        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
                        { method: 'PUT', headers }
                    );
                    console.log('🔗 [API] Associated Deal with Contact');

                    // Associate Deal -> Company (if company exists)
                    if (companyId) {
                        await fetch(
                            `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/deal_to_company`,
                            { method: 'PUT', headers }
                        );
                        console.log('🔗 [API] Associated Deal with Company');
                    }
                }
            } catch (dealErr) {
                console.warn('⚠️ [API] Deal creation/association warning:', dealErr.message);
            }
        }

        // Check whether frontend requested debug information
        const debugMode =
            req.headers['x-debug-mode'] === 'true';

        // Successful response
        return res.status(200).json({
            ...data,

            // Tell frontend whether CREATE or UPDATE happened
            action,

            // Extra information only when debug mode is enabled
            ...(debugMode && {
                debug: {
                    endpoint: '/api/create-contact',
                    hubspot: 'connected',
                    action,
                    lookupStatus: lookup.status,
                    responseStatus: response.status,
                },
            }),
        });

    } catch (err) {
        console.error('🔥 [API] Unexpected error:', err);

        return res.status(500).json({
            error: 'Failed to create or update contact.',
        });
    }
}