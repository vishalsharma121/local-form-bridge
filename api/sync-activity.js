import { getSyncActivities, clearSyncActivities } from '../lib/activityLogger.js';

export default async function handler(req, res) {
    try {
        console.log(`📡 [API] /api/sync-activity called (${req.method})`);

        const provided = req.headers['x-admin-key'];
        if (!provided || provided !== process.env.ADMIN_KEY) {
            console.log('❌ [API] Unauthorized admin request to sync-activity');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const activities = await getSyncActivities();
            return res.status(200).json({ activities });
        }

        if (req.method === 'DELETE') {
            await clearSyncActivities();
            return res.status(200).json({ success: true, message: 'Sync activity history cleared' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('🔥 [API] Sync activity handler error:', err);
        return res.status(500).json({ error: 'Failed to process sync activity request.' });
    }
}
