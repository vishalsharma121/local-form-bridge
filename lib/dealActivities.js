import { getHubSpotToken } from './hubspot.js';

/**
 * Fetches all engagements and historical activities for a specific HubSpot Deal:
 * - Tasks (with status: COMPLETED, NOT_STARTED, body, timestamp)
 * - Notes (with body text, timestamp)
 * - Stage Changes (from property history)
 * - Creation Event
 * - Calls, Meetings, Emails (if any)
 */
export async function getDealActivities(dealId) {
  const token = getHubSpotToken();
  if (!token) throw new Error('HubSpot token not configured');

  const headers = { 
    Authorization: `Bearer ${token}`, 
    'Content-Type': 'application/json' 
  };

  const idStr = String(dealId).trim();

  try {
    // 1. Fetch deal properties with property history for dealstage and amount
    const dealRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${idStr}?properties=dealname,dealstage,amount,createdate,hubspot_owner_id,deal_handled_by,pipeline&propertiesWithHistory=dealstage,amount`,
      { headers }
    );
    const deal = dealRes.ok ? await dealRes.json() : null;

    // 2. Concurrently fetch all activity associations
    const [notesAssoc, tasksAssoc, emailsAssoc, callsAssoc, meetingsAssoc] = await Promise.all([
      fetch(`https://api.hubapi.com/crm/v4/objects/deals/${idStr}/associations/notes`, { headers })
        .then(r => r.ok ? r.json() : { results: [] })
        .catch(() => ({ results: [] })),
      fetch(`https://api.hubapi.com/crm/v4/objects/deals/${idStr}/associations/tasks`, { headers })
        .then(r => r.ok ? r.json() : { results: [] })
        .catch(() => ({ results: [] })),
      fetch(`https://api.hubapi.com/crm/v4/objects/deals/${idStr}/associations/emails`, { headers })
        .then(r => r.ok ? r.json() : { results: [] })
        .catch(() => ({ results: [] })),
      fetch(`https://api.hubapi.com/crm/v4/objects/deals/${idStr}/associations/calls`, { headers })
        .then(r => r.ok ? r.json() : { results: [] })
        .catch(() => ({ results: [] })),
      fetch(`https://api.hubapi.com/crm/v4/objects/deals/${idStr}/associations/meetings`, { headers })
        .then(r => r.ok ? r.json() : { results: [] })
        .catch(() => ({ results: [] }))
    ]);

    const noteIds = (notesAssoc.results || []).map(r => String(r.toObjectId));
    const taskIds = (tasksAssoc.results || []).map(r => String(r.toObjectId));
    const emailIds = (emailsAssoc.results || []).map(r => String(r.toObjectId));
    const callIds = (callsAssoc.results || []).map(r => String(r.toObjectId));
    const meetingIds = (meetingsAssoc.results || []).map(r => String(r.toObjectId));

    // 3. Batch read details for each engagement type
    const [notesData, tasksData, emailsData, callsData, meetingsData] = await Promise.all([
      noteIds.length > 0
        ? fetch('https://api.hubapi.com/crm/v3/objects/notes/batch/read', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              inputs: noteIds.map(id => ({ id })),
              properties: ['hs_note_body', 'hs_timestamp', 'hubspot_owner_id', 'hs_createdate']
            })
          }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        : Promise.resolve({ results: [] }),

      taskIds.length > 0
        ? fetch('https://api.hubapi.com/crm/v3/objects/tasks/batch/read', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              inputs: taskIds.map(id => ({ id })),
              properties: ['hs_task_subject', 'hs_task_body', 'hs_task_status', 'hs_timestamp', 'hubspot_owner_id', 'hs_createdate']
            })
          }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        : Promise.resolve({ results: [] }),

      emailIds.length > 0
        ? fetch('https://api.hubapi.com/crm/v3/objects/emails/batch/read', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              inputs: emailIds.map(id => ({ id })),
              properties: ['hs_email_subject', 'hs_email_text', 'hs_timestamp', 'hubspot_owner_id', 'hs_createdate']
            })
          }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        : Promise.resolve({ results: [] }),

      callIds.length > 0
        ? fetch('https://api.hubapi.com/crm/v3/objects/calls/batch/read', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              inputs: callIds.map(id => ({ id })),
              properties: ['hs_call_title', 'hs_call_body', 'hs_call_status', 'hs_timestamp', 'hubspot_owner_id', 'hs_createdate']
            })
          }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        : Promise.resolve({ results: [] }),

      meetingIds.length > 0
        ? fetch('https://api.hubapi.com/crm/v3/objects/meetings/batch/read', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              inputs: meetingIds.map(id => ({ id })),
              properties: ['hs_meeting_title', 'hs_meeting_body', 'hs_timestamp', 'hubspot_owner_id', 'hs_createdate']
            })
          }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        : Promise.resolve({ results: [] })
    ]);

    const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const activities = [];

    // (A) Tasks
    for (const t of tasksData.results || []) {
      const p = t.properties || {};
      activities.push({
        id: `task_${t.id}`,
        type: 'task',
        title: p.hs_task_subject || 'Task',
        body: stripHtml(p.hs_task_body),
        rawBody: p.hs_task_body || '',
        status: (p.hs_task_status || 'NOT_STARTED').toUpperCase(),
        timestamp: p.hs_timestamp || t.createdAt || p.hs_createdate,
        ownerId: p.hubspot_owner_id || null,
        source: 'HubSpot Task'
      });
    }

    // (B) Notes
    for (const n of notesData.results || []) {
      const p = n.properties || {};
      activities.push({
        id: `note_${n.id}`,
        type: 'note',
        title: 'Note',
        body: stripHtml(p.hs_note_body),
        rawBody: p.hs_note_body || '',
        timestamp: p.hs_timestamp || n.createdAt || p.hs_createdate,
        ownerId: p.hubspot_owner_id || null,
        source: 'HubSpot Note'
      });
    }

    // (C) Emails
    for (const e of emailsData.results || []) {
      const p = e.properties || {};
      activities.push({
        id: `email_${e.id}`,
        type: 'email',
        title: p.hs_email_subject || 'Email',
        body: stripHtml(p.hs_email_text),
        timestamp: p.hs_timestamp || e.createdAt,
        ownerId: p.hubspot_owner_id || null,
        source: 'HubSpot Email'
      });
    }

    // (D) Calls
    for (const c of callsData.results || []) {
      const p = c.properties || {};
      activities.push({
        id: `call_${c.id}`,
        type: 'call',
        title: p.hs_call_title || 'Call',
        body: stripHtml(p.hs_call_body),
        status: p.hs_call_status || null,
        timestamp: p.hs_timestamp || c.createdAt,
        ownerId: p.hubspot_owner_id || null,
        source: 'HubSpot Call'
      });
    }

    // (E) Meetings
    for (const m of meetingsData.results || []) {
      const p = m.properties || {};
      activities.push({
        id: `meeting_${m.id}`,
        type: 'meeting',
        title: p.hs_meeting_title || 'Meeting',
        body: stripHtml(p.hs_meeting_body),
        timestamp: p.hs_timestamp || m.createdAt,
        ownerId: p.hubspot_owner_id || null,
        source: 'HubSpot Meeting'
      });
    }

    // (F) Stage History Changes
    if (deal?.propertiesWithHistory?.dealstage) {
      for (const h of deal.propertiesWithHistory.dealstage) {
        activities.push({
          id: `stage_${h.timestamp}_${h.value}`,
          type: 'stage_change',
          title: 'Deal Activity',
          stageId: h.value,
          timestamp: h.timestamp,
          updatedBy: h.updatedByUserId ? String(h.updatedByUserId) : null,
          source: 'Deal Pipeline'
        });
      }
    }

    // (G) Deal Creation Event
    if (deal?.properties?.createdate) {
      activities.push({
        id: `created_${deal.id}`,
        type: 'created',
        title: 'Created',
        body: `This deal was created`,
        dealName: deal.properties.dealname,
        timestamp: deal.properties.createdate,
        ownerId: deal.properties.hubspot_owner_id,
        source: 'HubSpot CRM'
      });
    }

    // 4. Sort descending (newest activity first)
    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return {
      dealId: idStr,
      dealName: deal?.properties?.dealname || '',
      pipeline: deal?.properties?.pipeline || '',
      dealstage: deal?.properties?.dealstage || '',
      activities,
      totalCount: activities.length
    };
  } catch (err) {
    console.error(`🔥 [DealActivities] Failed to load activities for deal ${dealId}:`, err);
    throw err;
  }
}
