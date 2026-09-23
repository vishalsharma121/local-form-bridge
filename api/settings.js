import { getAllSettings, setAppSetting } from '../lib/appSettings.js';

export default async function handler(req, res) {
    try {
        console.log(`⚙️ [API] /api/settings called (${req.method})`);

        const provided = req.headers['x-admin-key'];
        if (!provided || provided !== process.env.ADMIN_KEY) {
            console.log('❌ [API] Unauthorized admin request to settings');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const settings = await getAllSettings();
            return res.status(200).json({ settings });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
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
