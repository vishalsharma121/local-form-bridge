import { getErrorLogById, removeErrorLog, updateErrorLog } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { executeRetryForLog } from '../lib/retryEngine.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const provided = req.headers['x-admin-key'];
        if (!provided || provided !== process.env.ADMIN_KEY) {
            console.log('❌ [API] Unauthorized admin request to retry-sync-error');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get ID from query string, request body, or params
        const id = req.query?.id || req.body?.id || req.params?.id;
        if (!id) {
            return res.status(400).json({ error: 'Log ID is required for retry.' });
        }

        console.log(`🔄 [API] /api/sync-errors/${id}/retry initiated`);

        const logEntry = await getErrorLogById(id);
        if (!logEntry) {
            return res.status(404).json({ error: `Sync error log with ID '${id}' not found.` });
        }

        const { type, entityInfo = {} } = logEntry;
        const retryResult = await executeRetryForLog(logEntry);

        if (retryResult.success) {
            console.log(`✅ [API] Retry succeeded for error log ID: ${id}`);
            const removed = await removeErrorLog(id);
            if (!removed) {
                console.error(`❌ [API] removeErrorLog failed to update resolved status in DB for log ID: ${id}`);
                return res.status(500).json({
                    success: false,
                    error: `Sync retry succeeded on HubSpot, but failed to mark error as resolved in database.`
                });
            }

            await logSyncActivity({
                status: 'success',
                type,
                operation: 'retry',
                entityInfo,
                statusCode: 200,
                message: `Retry succeeded: Resolved ${type} sync error`,
                details: retryResult.resultData
            });

            return res.status(200).json({
                success: true,
                message: `Successfully retried and resolved ${type} sync error!`,
                data: retryResult.resultData
            });
        } else {
            console.warn(`⚠️ [API] Retry failed for error log ID ${id}: ${retryResult.errorMessage}`);
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
    } catch (err) {
        console.error('🔥 [API] Retry sync error handler error:', err);
        return res.status(500).json({ error: 'Unexpected error during sync retry operation.' });
    }
}

