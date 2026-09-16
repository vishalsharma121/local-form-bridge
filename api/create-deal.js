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

        const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
        if (!token) {
            return res.status(500).json({ error: 'HubSpot token is not configured.' });
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const properties = {
            dealname: dealname.trim(),
            pipeline: pipeline || 'default',
            dealstage: dealstage || 'appointmentscheduled',
            amount: amount ? String(amount) : '0',
        };

        // Create Deal in HubSpot
        const dealRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers,
            body: JSON.stringify({ properties }),
        });

        const dealData = await dealRes.json();
        if (!dealRes.ok) {
            return res.status(dealRes.status).json(dealData);
        }

        const dealId = dealData.id;
        console.log(`✅ [API] Deal created with ID: ${dealId}`);

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
        return res.status(500).json({ error: 'Failed to create deal.' });
    }
}
