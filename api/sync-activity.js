import { getSyncActivities, clearSyncActivities } from '../lib/activityLogger.js';
import { authenticateRequest } from '../lib/userAuth.js';
import { can } from '../lib/permissions.js';

export default async function handler(req, res) {
    try {
        console.log(`📡 [API] /api/sync-activity called (${req.method})`);

        const auth = authenticateRequest(req);
        if (!auth.authenticated || !can(auth.user?.role, 'view')) {
            console.log('❌ [API] Unauthorized request to sync-activity');
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }

        if (req.method === 'GET') {
            const activities = await getSyncActivities();
            return res.status(200).json({ activities });
        }

        if (req.method === 'DELETE') {
            if (!can(auth.user?.role, 'delete')) {
                return res.status(403).json({ error: 'Permission denied.' });
            }
            await clearSyncActivities();
            return res.status(200).json({ success: true, message: 'Sync activity history cleared' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('🔥 [API] Sync activity handler error:', err);
        return res.status(500).json({ error: 'Failed to process sync activity request.' });
    }
}
