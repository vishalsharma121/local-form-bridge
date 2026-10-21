import { getHubSpotOwners } from '../lib/hubspotOwners.js';
import { authenticateRequest } from '../lib/userAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(455).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawOwners = await getHubSpotOwners();
    let owners = (rawOwners || []).map(o => ({
      id: String(o.id),
      name: `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email || `Owner #${o.id}`,
      email: o.email || o.primaryEmail || '',
      archived: Boolean(o.archived)
    })).filter(o => !o.archived);

    if (owners.length === 0) {
      owners = [
        { id: '16420175', name: 'Hub Dev', email: 'info@starkedge.com' },
        { id: '40802263', name: 'Dev Stark', email: 'dev@starkedge.com' }
      ];
    }

    return res.status(200).json({ owners });
  } catch (err) {
    console.error('🔥 [API] /api/hubspot-owners error:', err);
    return res.status(500).json({ 
      owners: [
        { id: '16420175', name: 'Hub Dev', email: 'info@starkedge.com' },
        { id: '40802263', name: 'Dev Stark', email: 'dev@starkedge.com' }
      ]
    });
  }
}
