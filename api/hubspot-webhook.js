import { logSyncActivity } from '../lib/activityLogger.js';
import { logSyncError } from '../lib/errorLogger.js';
import { recordLeadSource } from '../lib/leadSourceTracker.js';

/**
 * Handles incoming webhooks from HubSpot CRM v3.
 * Supports events:
 * - contact.creation, contact.deletion, contact.propertyChange
 * - company.creation, company.deletion, company.propertyChange
 * - deal.creation, deal.deletion, deal.propertyChange
 */
export default async function handler(req, res) {
  // 1. Health check & verification for setup
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Local Form Bridge - Two-Way HubSpot Webhook Engine',
      endpoint: '/api/hubspot-webhook',
      supportedEvents: [
        'contact.creation',
        'contact.deletion',
        'contact.propertyChange',
        'company.creation',
        'company.deletion',
        'company.propertyChange',
        'deal.creation',
        'deal.deletion',
        'deal.propertyChange'
      ],
      instructions: 'Configure this webhook URL in your HubSpot App developer settings under Webhooks.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawEvents = req.body;
    const events = Array.isArray(rawEvents) ? rawEvents : (rawEvents ? [rawEvents] : []);

    if (events.length === 0) {
      console.log('📡 [HubSpot Webhook] Received ping with empty payload');
      return res.status(200).json({ success: true, message: 'Ping acknowledged (empty batch)', processed: 0 });
    }

    console.log(`📡 [HubSpot Webhook] Received batch of ${events.length} event(s) from HubSpot CRM`);

    let processedCount = 0;

    for (const evt of events) {
      const {
        subscriptionType = '',
        objectId = '',
        propertyName = '',
        propertyValue = '',
        changeSource = 'CRM',
        occurredAt
      } = evt;

      // Extract target object type (contact, company, deal)
      let target = 'contact';
      if (subscriptionType.startsWith('company.')) target = 'company';
      else if (subscriptionType.startsWith('deal.')) target = 'deal';
      else if (subscriptionType.startsWith('contact.')) target = 'contact';

      // Extract action type
      let action = 'update';
      let message = `[HubSpot Webhook] ${target.charAt(0).toUpperCase() + target.slice(1)} #${objectId} event (${subscriptionType})`;

      if (subscriptionType.endsWith('.creation')) {
        action = 'create';
        message = `[HubSpot Webhook] ${target.charAt(0).toUpperCase() + target.slice(1)} #${objectId} created directly in HubSpot CRM (Source: ${changeSource})`;

        // Track lead source as HubSpot CRM
        if (objectId) {
          await recordLeadSource(
            String(objectId),
            target,
            'HubSpot CRM',
            'HubSpot CRM (Webhook)',
            null,
            'hubspot-webhook@system'
          ).catch((trackErr) => {
            console.warn(`⚠️ [HubSpot Webhook] Could not record lead source for #${objectId}:`, trackErr.message);
          });
        }
      } else if (subscriptionType.endsWith('.deletion')) {
        action = 'delete';
        message = `[HubSpot Webhook] ${target.charAt(0).toUpperCase() + target.slice(1)} #${objectId} deleted in HubSpot CRM`;
      } else if (subscriptionType.endsWith('.propertyChange')) {
        action = 'update';
        const valPreview = propertyValue !== undefined && propertyValue !== null ? `"${propertyValue}"` : '(updated)';
        message = `[HubSpot Webhook] ${target.charAt(0).toUpperCase() + target.slice(1)} #${objectId} property "${propertyName}" changed to ${valPreview}`;
      } else if (subscriptionType.endsWith('.merge')) {
        action = 'update';
        message = `[HubSpot Webhook] ${target.charAt(0).toUpperCase() + target.slice(1)} #${objectId} merged in HubSpot CRM`;
      }

      // Log real-time activity stream
      await logSyncActivity({
        status: 'success',
        type: target,
        operation: `webhook-${action}`,
        entityInfo: {
          id: objectId,
          targetId: objectId,
          subscriptionType,
          propertyName,
          propertyValue,
          changeSource,
          occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
          lead_source: 'HubSpot CRM',
          createdBy: {
            name: 'HubSpot CRM (Webhook)',
            email: 'webhook@hubspot.com',
            role: 'HubSpot Direct'
          }
        },
        message
      });

      processedCount++;
    }

    console.log(`✅ [HubSpot Webhook] Successfully processed and logged ${processedCount} event(s)`);

    // HubSpot requires a fast HTTP 200 response
    return res.status(200).json({
      success: true,
      processed: processedCount
    });
  } catch (err) {
    console.error('🔥 [HubSpot Webhook] Error processing webhook batch:', err);

    await logSyncError({
      type: 'webhook',
      operation: 'receive',
      errorMessage: `Failed to process incoming HubSpot webhook: ${err.message}`,
      entityInfo: { error: err.message }
    }).catch(() => {});

    // Still return 200 so HubSpot does not repeatedly backoff and disable the webhook subscription
    return res.status(200).json({
      success: false,
      error: err.message,
      processed: 0
    });
  }
}
