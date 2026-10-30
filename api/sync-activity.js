import { getSyncActivities, clearSyncActivities } from '../lib/activityLogger.js';
import { authenticateRequest } from '../lib/userAuth.js';
import { can } from '../lib/permissions.js';
import { reconcileExternalHubSpotActivities } from '../lib/hubspotReconciler.js';

export default async function handler(req, res) {
    try {
        console.log(`📡 [API] /api/sync-activity called (${req.method})`);

        const auth = await authenticateRequest(req);
        if (!auth.authenticated) {
            console.log('❌ [API] Unauthorized request to sync-activity');
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }
        if (!can(auth.user, 'view', 'activity')) {
            return res.status(403).json({ error: 'Access restricted to activity feed.' });
        }

        if (req.method === 'GET') {
            // Automatically reconcile any contacts, companies, or deals created directly in HubSpot CRM
            await reconcileExternalHubSpotActivities().catch(err => {
                console.warn('⚠️ [API] HubSpot reconciliation warning:', err.message);
            });

            let activities = await getSyncActivities();

            // If user is a standard team member (not super_admin), restrict activities strictly to their own work
            const isSuper = auth.user?.role === 'super_admin';
            if (!isSuper) {
                const uEmail = (auth.user.email || '').toLowerCase().trim();
                const uName = (auth.user.name || '').toLowerCase().trim();
                const uId = auth.user.userId || auth.user.id;

                activities = activities.filter((act) => {
                    if (act.userId && uId && Number(act.userId) === Number(uId)) return true;
                    if (act.userEmail && act.userEmail.toLowerCase().trim() === uEmail) return true;
                    if (act.userName && act.userName.toLowerCase().trim() === uName) return true;

                    const creatorEmail = (act.entityInfo?.createdBy?.email || '').toLowerCase().trim();
                    const creatorName = (act.entityInfo?.createdBy?.name || '').toLowerCase().trim();
                    if (creatorEmail && creatorEmail === uEmail) return true;
                    if (creatorName && creatorName === uName) return true;

                    const recEmail = (act.record_email || '').toLowerCase().trim();
                    if (recEmail && recEmail === uEmail) return true;

                    const msg = (act.message || '').toLowerCase();
                    if (uName && (msg.includes('[' + uName + ']') || msg.includes('by ' + uName) || msg.includes(uName + ':'))) return true;
                    if (uEmail && msg.includes(uEmail)) return true;

                    return false;
                });
            }

            return res.status(200).json({ 
                activities,
                scope: isSuper ? 'all' : 'self',
                user: {
                    id: auth.user.id || auth.user.userId,
                    name: auth.user.name,
                    email: auth.user.email,
                    role: auth.user.role
                }
            });
        }

        if (req.method === 'DELETE') {
            if (auth.user?.role !== 'super_admin') {
                return res.status(403).json({ error: 'Permission denied. Only Admins can clear sync activity history.' });
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
