export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐞 [API] /api/contacts called');

        const provided = req.headers['x-admin-key'];
        if (!provided || provided !== process.env.ADMIN_KEY) {
            console.log('❌ [API] Unauthorized admin request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
        if (!token) {
            console.error('❌ [API] HubSpot token is not configured');
            return res.status(500).json({ error: 'HubSpot token is not configured.' });
        }

        const response = await fetch(
            'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,subject,message,createdate&sorts=-createdate',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('📡 [API] HubSpot list status:', response.status);

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        const contacts = (data.results || []).map((c) => ({
            id: c.id,
            name: [c.properties.firstname, c.properties.lastname]
                .filter((n) => n && n !== '-')
                .join(' '),
            email: c.properties.email,
            phone: c.properties.phone,
            subject: c.properties.subject,
            message: c.properties.message,
            createdate: c.properties.createdate,
        }));

        console.log(`✅ [API] Returning ${contacts.length} contacts`);
        return res.status(200).json({ contacts });
    } catch (err) {
        console.error('🔥 [API] Unexpected error:', err);
        return res.status(500).json({ error: 'Failed to load contacts.' });
    }
}