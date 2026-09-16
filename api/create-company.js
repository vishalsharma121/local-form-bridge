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

        const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
        if (!token) {
            return res.status(500).json({ error: 'HubSpot token is not configured.' });
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const properties = {
            name: (name || domain).trim(),
            domain: (domain || '').trim(),
        };

        // Create Company in HubSpot
        const companyRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
            method: 'POST',
            headers,
            body: JSON.stringify({ properties }),
        });

        const companyData = await companyRes.json();
        if (!companyRes.ok) {
            return res.status(companyRes.status).json(companyData);
        }

        const companyId = companyData.id;
        console.log(`✅ [API] Company created with ID: ${companyId}`);

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
        return res.status(500).json({ error: 'Failed to create company.' });
    }
}
