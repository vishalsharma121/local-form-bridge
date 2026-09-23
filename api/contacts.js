import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap } from '../lib/leadSourceTracker.js';

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