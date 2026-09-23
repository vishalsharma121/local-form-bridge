import { getErrorLogs, clearErrorLogs } from '../lib/errorLogger.js';

export default async function handler(req, res) {
    try {
        console.log(`🐞 [API] /api/sync-errors called (${req.method})`);

        const provided = req.headers['x-admin-key'];
        if (!provided || provided !== process.env.ADMIN_KEY) {
            console.log('❌ [API] Unauthorized admin request to sync-errors');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const { resolved, target, status } = req.query || {};
            const logs = await getErrorLogs({ resolved, target, status });
            return res.status(200).json({ logs });
        }

        if (req.method === 'DELETE') {
            await clearErrorLogs();
            return res.status(200).json({ success: true, message: 'Sync error logs cleared' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('🔥 [API] Sync errors handler error:', err);
        return res.status(500).json({ error: 'Failed to process sync errors request.' });
    }
}

