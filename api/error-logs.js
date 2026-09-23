import syncErrorsHandler from './sync-errors.js';

/**
 * @deprecated Legacy endpoint. Use /api/sync-errors instead.
 */
export default async function handler(req, res) {
    console.warn('⚠️ [API] /api/error-logs is deprecated. Forwarding request to /api/sync-errors...');
    return syncErrorsHandler(req, res);
}
