import { getHubSpotToken } from './hubspot.js';

/**
 * Shared core retry execution logic for both manual and auto-retries.
 * Ensures deduplicated lookup-then-PATCH/POST logic is reused identically across endpoints.
 */
export async function executeRetryForLog(logEntry) {
  const token = getHubSpotToken();
  if (!token) {
    return {
      success: false,
      resultData: null,
      errorMessage: 'HubSpot token is not configured in environment variables.'
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const { type, entityInfo = {} } = logEntry || {};
  let success = false;
  let resultData = null;
  let retryErrorMsg = '';

  // --------------------------------------------------
  // RETRY CONTACT SYNC
  // --------------------------------------------------
  if (type === 'contact') {
    const email = entityInfo.email || entityInfo.cleanEmail;
    if (!email) {
      retryErrorMsg = 'Contact email missing from log details';
    } else {
      const name = entityInfo.name || `${entityInfo.firstname || 'Lead'} ${entityInfo.lastname || ''}`;
      const [firstname, ...rest] = name.trim().split(/\s+/);
      const lastname = rest.join(' ');

      const properties = {
        firstname,
        lastname: lastname || '',
        email,
      };

      if (entityInfo.phone) properties.phone = entityInfo.phone;
      if (entityInfo.subject) properties.subject = entityInfo.subject;
      if (entityInfo.message) properties.message = entityInfo.message;

      const lookup = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
        { headers }
      );

      let syncRes;
      if (lookup.status === 200) {
        const existing = await lookup.json();
        syncRes = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ properties }),
          }
        );
      } else {
        syncRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
          method: 'POST',
          headers,
          body: JSON.stringify({ properties }),
        });
      }

      if (syncRes.ok) {
        success = true;
        resultData = await syncRes.json();
      } else {
        const errData = await syncRes.json().catch(() => ({}));
        retryErrorMsg = errData.message || 'HubSpot contact sync retry failed';
      }
    }
  }
  // --------------------------------------------------
  // RETRY COMPANY SYNC
  // --------------------------------------------------
  else if (type === 'company') {
    const name = entityInfo.name || entityInfo.companyName;
    const domain = entityInfo.domain || entityInfo.companyDomain;

    if (!name && !domain) {
      retryErrorMsg = 'Company name or domain missing from log details';
    } else {
      const targetName = (name || domain).trim();
      const targetDomain = (domain || '').trim();

      let existingId = null;
      if (targetDomain) {
        const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: targetDomain }] }]
          }),
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results?.length > 0) existingId = searchData.results[0].id;
        }
      }

      let syncRes;
      if (existingId) {
        syncRes = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${existingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ properties: { name: targetName, domain: targetDomain } }),
        });
      } else {
        syncRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
          method: 'POST',
          headers,
          body: JSON.stringify({ properties: { name: targetName, domain: targetDomain } }),
        });
      }

      if (syncRes.ok) {
        success = true;
        resultData = await syncRes.json();
      } else {
        const errData = await syncRes.json().catch(() => ({}));
        retryErrorMsg = errData.message || 'HubSpot company sync retry failed';
      }
    }
  }
  // --------------------------------------------------
  // RETRY DEAL SYNC
  // --------------------------------------------------
  else if (type === 'deal') {
    const dealname = (entityInfo.dealName || entityInfo.dealname || entityInfo.name || 'Retried Deal').trim();
    const pipeline = entityInfo.pipeline || 'default';
    const dealstage = entityInfo.dealStage || entityInfo.dealstage || 'appointmentscheduled';
    const amount = entityInfo.amount || '0';

    const properties = { dealname, pipeline, dealstage, amount };

    let existingId = null;
    const contactId = entityInfo.contactId || entityInfo.contact_id || null;

    if (dealname) {
      const filters = [{ propertyName: 'dealname', operator: 'EQ', value: dealname }];
      const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filterGroups: [{ filters }] }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results?.length > 0) {
          if (contactId) {
            for (const deal of searchData.results) {
              const assocRes = await fetch(
                `https://api.hubapi.com/crm/v3/objects/deals/${deal.id}/associations/contacts`,
                { headers }
              );
              if (assocRes.ok) {
                const assocData = await assocRes.json();
                if (assocData.results?.some(r => String(r.id) === String(contactId))) {
                  existingId = deal.id;
                  break;
                }
              }
            }
          } else {
            existingId = searchData.results[0].id;
          }
        }
      }
    }

    let syncRes;
    if (existingId) {
      syncRes = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${existingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties }),
      });
    } else {
      syncRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
        method: 'POST',
        headers,
        body: JSON.stringify({ properties }),
      });
    }

    if (syncRes.ok) {
      success = true;
      resultData = await syncRes.json();
    } else {
      const errData = await syncRes.json().catch(() => ({}));
      retryErrorMsg = errData.message || 'HubSpot deal sync retry failed';
    }
  } else {
    retryErrorMsg = `Unknown sync type '${type}'`;
  }

  return {
    success,
    resultData,
    errorMessage: retryErrorMsg
  };
}
