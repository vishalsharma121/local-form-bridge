import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { getLeadSourcesMap } from '../lib/leadSourceTracker.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐞 [API] /api/companies called');

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
