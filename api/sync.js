import { getSyncActivities, clearSyncActivities, logSyncActivity } from '../lib/activityLogger.js';
import { 
    getErrorLogs, 
    clearErrorLogs, 
    getErrorLogById, 
    removeErrorLog, 
    updateErrorLog,
    getPendingAutoRetryLogs,
    recordAutoRetryAttempt
} from '../lib/errorLogger.js';
import { executeRetryForLog } from '../lib/retryEngine.js';
import { authenticateRequest } from '../lib/userAuth.js';
import { can } from '../lib/permissions.js';
import { reconcileExternalHubSpotActivities } from '../lib/hubspotReconciler.js';

let lastAutoRetryTimestamp = 0;
const MIN_INTERVAL_MS = 45000; // Minimum 45-second gap between auto-retry runs

async function handleSyncActivity(req, res) {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
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
}

async function handleSyncErrors(req, res) {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    if (!can(auth.user, 'view', 'logs')) {
        return res.status(403).json({ error: 'Access restricted to error logs.' });
    }

    if (req.method === 'GET') {
        const { resolved, target, status } = req.query || {};
        const logs = await getErrorLogs({ resolved, target, status });
        return res.status(200).json({ logs });
    }

    if (req.method === 'DELETE') {
        if (!can(auth.user?.role, 'delete')) {
            return res.status(403).json({ error: 'Permission denied.' });
        }
        await clearErrorLogs();
        return res.status(200).json({ success: true, message: 'Sync error logs cleared' });
    }

    if (req.method === 'POST') {
        if (!can(auth.user?.role, 'create') && !can(auth.user?.role, 'edit')) {
            return res.status(403).json({ error: 'Permission denied.' });
        }
        const id = req.query?.id || req.body?.id || req.params?.id;
        if (!id) {
            return res.status(400).json({ error: 'Log ID is required for retry.' });
        }

        const logEntry = await getErrorLogById(id);
        if (!logEntry) {
            return res.status(404).json({ error: `Sync error log with ID '${id}' not found.` });
        }

        const { type, entityInfo = {} } = logEntry;
        const retryResult = await executeRetryForLog(logEntry);

        if (retryResult.success) {
            const removed = await removeErrorLog(id);
            if (!removed) {
                return res.status(500).json({
                    success: false,
                    error: `Sync retry succeeded on HubSpot, but failed to mark error as resolved in database.`
                });
            }

            const originalErr = logEntry.errorMessage || logEntry.error_message || 'Sync error';
            const createdId = retryResult.resultData?.id || retryResult.resultData?.contactId || retryResult.resultData?.companyId || retryResult.resultData?.dealId || '';
            const idMsg = createdId ? ` (ID: ${createdId})` : '';

            await logSyncActivity({
                status: 'success',
                type,
                operation: 'retry',
                entityInfo: {
                    ...(entityInfo || {}),
                    originalError: originalErr,
                    syncedRecordId: createdId || null,
                    resolution: `Manual retry re-synced ${type} successfully to HubSpot`
                },
                statusCode: 200,
                message: `Manual retry resolved ${type} error${idMsg} [Prior Issue: "${originalErr}"]`,
                details: {
                    originalError: originalErr,
                    resultData: retryResult.resultData
                }
            });

            return res.status(200).json({
                success: true,
                message: `Successfully retried and resolved ${type} sync error!`,
                data: retryResult.resultData
            });
        } else {
            const currentRetryCount = (logEntry.retryCount || 0) + 1;
            await updateErrorLog(id, {
                retryCount: currentRetryCount,
                lastRetryAt: new Date().toISOString(),
                errorMessage: `Retry #${currentRetryCount} failed: ${retryResult.errorMessage}`
            });

            await logSyncActivity({
                status: 'failure',
                type,
                operation: 'retry',
                entityInfo,
                statusCode: 400,
                message: `Retry #${currentRetryCount} failed: ${retryResult.errorMessage}`,
                details: null
            });

            return res.status(400).json({
                success: false,
                message: retryResult.errorMessage,
                retryCount: currentRetryCount
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCronAutoRetry(req, res) {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Please log in.' });
    }
    if (!can(auth.user, 'view', 'retry')) {
        return res.status(403).json({ success: false, error: 'Forbidden: Access to retry operations restricted.' });
    }

    const now = Date.now();
    const elapsed = now - lastAutoRetryTimestamp;
    if (elapsed < MIN_INTERVAL_MS) {
        const remainingSec = Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000);
        return res.status(200).json({
            success: true,
            skipped: true,
            reason: `Throttled: Last auto-retry ran ${Math.round(elapsed / 1000)}s ago`,
            processed: 0
        });
    }

    lastAutoRetryTimestamp = now;

    try {
        const pendingLogs = await getPendingAutoRetryLogs();

        if (pendingLogs.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No pending error logs to auto-retry.',
                processed: 0
            });
        }

        let succeededCount = 0;
        let failedCount = 0;

        for (const logEntry of pendingLogs) {
            const currentAttempts = logEntry.autoRetryAttempts || logEntry.auto_retry_attempts || 0;
            const retryResult = await executeRetryForLog(logEntry);

            if (retryResult.success) {
                succeededCount++;
                await recordAutoRetryAttempt(logEntry.id, {
                    success: true,
                    errorMessage: logEntry.errorMessage,
                    currentAttempts
                });

                const originalErr = logEntry.errorMessage || logEntry.error_message || 'Sync error';
                const createdId = retryResult.resultData?.id || retryResult.resultData?.contactId || retryResult.resultData?.companyId || retryResult.resultData?.dealId || '';
                const idMsg = createdId ? ` (ID: ${createdId})` : '';

                await logSyncActivity({
                    status: 'success',
                    type: logEntry.type,
                    operation: 'auto-retry',
                    entityInfo: {
                        ...(logEntry.entityInfo || {}),
                        originalError: originalErr,
                        syncedRecordId: createdId || null,
                        resolution: `Auto-retry re-synced ${logEntry.type} successfully to HubSpot`
                    },
                    statusCode: 200,
                    message: `Auto-retry resolved ${logEntry.type} error${idMsg} [Prior Issue: "${originalErr}"]`,
                    details: {
                        originalError: originalErr,
                        resultData: retryResult.resultData
                    }
                });
            } else {
                failedCount++;
                const nextAttempts = currentAttempts + 1;
                const failureMsg = `Auto-retry attempt #${nextAttempts} failed: ${retryResult.errorMessage}`;

                await recordAutoRetryAttempt(logEntry.id, {
                    success: false,
                    errorMessage: failureMsg,
                    currentAttempts
                });

                await logSyncActivity({
                    status: 'failure',
                    type: logEntry.type,
                    operation: 'auto-retry',
                    entityInfo: logEntry.entityInfo,
                    statusCode: 400,
                    message: failureMsg,
                    details: null
                });
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        return res.status(200).json({
            success: true,
            processed: pendingLogs.length,
            succeeded: succeededCount,
            failed: failedCount
        });
    } catch (err) {
        console.error('❌ [Sync] Auto-retry execution error:', err);
        return res.status(500).json({ error: 'Failed to process auto-retries' });
    }
}

export default async function handler(req, res) {
    try {
        const view = req.query?.view || req.query?.type || (
            req.url.includes('activity') ? 'activity' :
            req.url.includes('cron') ? 'cron' :
            'errors'
        );

        if (view === 'activity') {
            return await handleSyncActivity(req, res);
        }
        if (view === 'cron') {
            return await handleCronAutoRetry(req, res);
        }
        return await handleSyncErrors(req, res);
    } catch (err) {
        console.error('❌ [API] Sync router error:', err);
        return res.status(500).json({ error: 'Failed to process sync request: ' + err.message });
    }
}
