import { getAllSettings, setAppSetting } from '../lib/appSettings.js';
import { authenticateRequest } from '../lib/userAuth.js';
import { can } from '../lib/permissions.js';

export default async function handler(req, res) {
    try {
        console.log(`⚙️ [API] /api/settings called (${req.method})`);

        const auth = await authenticateRequest(req);
        if (!auth.authenticated) {
            console.log('❌ [API] Unauthorized admin request to settings');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            if (!can(auth.user?.role, 'view')) {
                return res.status(403).json({ error: 'Permission denied.' });
            }
            const settings = await getAllSettings();
            return res.status(200).json({ settings });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            if (!can(auth.user?.role, 'settings')) {
                return res.status(403).json({ error: 'Permission denied. Only Super Admin can change settings.' });
            }
            const { key, value, settings } = req.body || {};

            if (settings && typeof settings === 'object') {
                for (const [k, v] of Object.entries(settings)) {
                    await setAppSetting(k, String(v));
                }
            } else if (key) {
                await setAppSetting(key, String(value));
            } else {
                return res.status(400).json({ error: 'Setting key or settings object is required.' });
            }

            const updatedSettings = await getAllSettings();
            return res.status(200).json({ success: true, settings: updatedSettings });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('🔥 [API] Settings handler error:', err);
        return res.status(500).json({ error: 'Failed to process settings request.' });
    }
}
