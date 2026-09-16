export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐞 [API] /api/deals called');

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
            'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,pipeline,dealstage,amount,createdate&sorts=-createdate',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('📡 [API] HubSpot deals list status:', response.status);

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        const deals = (data.results || []).map((d) => ({
            id: d.id,
            dealname: d.properties.dealname || 'Unnamed Deal',
            pipeline: d.properties.pipeline || 'default',
            dealstage: d.properties.dealstage || 'appointmentscheduled',
            amount: d.properties.amount || '0',
            createdate: d.properties.createdate,
        }));

        console.log(`✅ [API] Returning ${deals.length} deals`);
        return res.status(200).json({ deals });
    } catch (err) {
        console.error('🔥 [API] Unexpected error:', err);
        return res.status(500).json({ error: 'Failed to load deals.' });
    }
}
