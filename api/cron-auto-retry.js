import { getPendingAutoRetryLogs, recordAutoRetryAttempt } from '../lib/errorLogger.js';
import { logSyncActivity } from '../lib/activityLogger.js';
import { executeRetryForLog } from '../lib/retryEngine.js';

// In-memory throttle to prevent overlapping executions when multiple dashboard tabs are open
let lastAutoRetryTimestamp = 0;
const MIN_INTERVAL_MS = 45000; // Minimum 45-second gap between auto-retry runs

export default async function handler(req, res) {
    // 1. Auth Guard (x-admin-key header validation)
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || 'secret';

    if (!adminKey || adminKey !== expectedKey) {
        console.warn('❌ [Auto-Retry] Unauthorized trigger attempt');
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid admin key' });
    }

    // 2. Throttle Check for Overlapping Tabs
    const now = Date.now();
    const elapsed = now - lastAutoRetryTimestamp;
    if (elapsed < MIN_INTERVAL_MS) {
        const remainingSec = Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000);
        console.log(`⏳ [Auto-Retry] Throttled duplicate tab trigger (${remainingSec}s remaining). Skipping.`);
        return res.status(200).json({
            success: true,
            skipped: true,
            reason: `Throttled: Last auto-retry ran ${Math.round(elapsed / 1000)}s ago`,
            processed: 0
        });
    }

    // Lock execution timestamp
    lastAutoRetryTimestamp = now;

    console.log('⏰ [Auto-Retry] Dashboard trigger executing retry pass...');

    try {
        const pendingLogs = await getPendingAutoRetryLogs();
        console.log(`⏰ [Auto-Retry] Found ${pendingLogs.length} pending error logs for auto-retry.`);

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
            console.log(`🔄 [Auto-Retry] Processing log ID ${logEntry.id} (attempt #${currentAttempts + 1})...`);

            const retryResult = await executeRetryForLog(logEntry);

            if (retryResult.success) {
                succeededCount++;
                console.log(`✅ [Auto-Retry] Succeeded for log ID ${logEntry.id}`);

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
                const finalFailed = nextAttempts >= 3;
                const failureMsg = `Auto-retry attempt #${nextAttempts} failed: ${retryResult.errorMessage}`;

                console.warn(`⚠️ [Auto-Retry] ${failureMsg} for log ID ${logEntry.id}. Final failure: ${finalFailed}`);

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

            // 500ms delay between record retries to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        return res.status(200).json({
            success: true,
            processed: pendingLogs.length,
            succeeded: succeededCount,
            failed: failedCount
        });
    } catch (err) {
        console.error('🔥 [Auto-Retry] Execution error:', err);
        return res.status(500).json({ error: 'Failed to process auto-retries' });
    }
}
