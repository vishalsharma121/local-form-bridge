import { getHubSpotToken, MISSING_TOKEN_ERROR } from '../lib/hubspot.js';
import { authenticateRequest } from '../lib/userAuth.js';

const DEFAULT_LIFECYCLE_STAGES = [
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'lead', label: 'Lead' },
  { value: 'marketingqualifiedlead', label: 'Marketing Qualified Lead' },
  { value: 'salesqualifiedlead', label: 'Sales Qualified Lead' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'customer', label: 'Customer' },
  { value: 'evangelist', label: 'Evangelist' },
  { value: 'other', label: 'Other' }
];

const DEFAULT_LEAD_STATUS_OPTIONS = [
  { value: '', label: '-- Select Lead Status --' },
  { value: 'NEW', label: 'New' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'OPEN_DEAL', label: 'Open Deal' },
  { value: 'UNQUALIFIED', label: 'Unqualified' },
  { value: 'ATTEMPTED_TO_CONTACT', label: 'Attempted to Contact' },
  { value: 'CONNECTED', label: 'Connected' },
  { value: 'BAD_TIMING', label: 'Bad Timing' }
];

const DEFAULT_COMPANY_TYPES = [
  { value: '', label: '-- Select Type --' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'RESELLER', label: 'Reseller' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'OTHER', label: 'Other' }
];

const DEFAULT_COMPANY_INDUSTRIES = [
  { value: '', label: '-- Select Industry --' },
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'AIRLINES_AVIATION', label: 'Airlines / Aviation' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'BANKING', label: 'Banking' },
  { value: 'BIOTECHNOLOGY', label: 'Biotechnology' },
  { value: 'COMPUTER_SOFTWARE', label: 'Computer Software' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'CONSUMER_GOODS', label: 'Consumer Goods' },
  { value: 'EDUCATION_MANAGEMENT', label: 'Education Management' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'HOSPITAL_HEALTH_CARE', label: 'Hospital & Health Care' },
  { value: 'INFORMATION_TECHNOLOGY_AND_SERVICES', label: 'Information Technology & Services' },
  { value: 'LEGAL_SERVICES', label: 'Legal Services' },
  { value: 'MANAGEMENT_CONSULTING', label: 'Management Consulting' },
  { value: 'MARKETING_AND_ADVERTISING', label: 'Marketing & Advertising' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'TELECOMMUNICATIONS', label: 'Telecommunications' },
  { value: 'OTHER', label: 'Other' }
];

const DEFAULT_DEAL_TYPES = [
  { value: '', label: '-- Select Type --' },
  { value: 'newbusiness', label: 'New Business' },
  { value: 'existingbusiness', label: 'Existing Business' }
];

const DEFAULT_DEAL_PRIORITIES = [
  { value: '', label: '-- Select Priority --' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = getHubSpotToken();
    if (!token) {
      return res.status(200).json({
        lifecycleStages: DEFAULT_LIFECYCLE_STAGES,
        leadStatuses: DEFAULT_LEAD_STATUS_OPTIONS,
        companyTypes: DEFAULT_COMPANY_TYPES,
        companyIndustries: DEFAULT_COMPANY_INDUSTRIES,
        dealTypes: DEFAULT_DEAL_TYPES,
        dealPriorities: DEFAULT_DEAL_PRIORITIES,
        isDynamic: false
      });
    }

    const headers = { Authorization: `Bearer ${token}` };

    const [lifecycleRes, leadStatusRes, compIndustryRes, compTypeRes, dealTypeRes, dealPriorityRes] = await Promise.allSettled([
      fetch('https://api.hubapi.com/crm/v3/properties/contacts/lifecyclestage', { headers }),
      fetch('https://api.hubapi.com/crm/v3/properties/contacts/hs_lead_status', { headers }),
      fetch('https://api.hubapi.com/crm/v3/properties/companies/industry', { headers }),
      fetch('https://api.hubapi.com/crm/v3/properties/companies/type', { headers }),
      fetch('https://api.hubapi.com/crm/v3/properties/deals/dealtype', { headers }),
      fetch('https://api.hubapi.com/crm/v3/properties/deals/hs_priority', { headers })
    ]);

    let lifecycleStages = DEFAULT_LIFECYCLE_STAGES;
    let leadStatuses = DEFAULT_LEAD_STATUS_OPTIONS;
    let companyTypes = DEFAULT_COMPANY_TYPES;
    let companyIndustries = DEFAULT_COMPANY_INDUSTRIES;
    let dealTypes = DEFAULT_DEAL_TYPES;
    let dealPriorities = DEFAULT_DEAL_PRIORITIES;
    let isDynamic = false;

    if (lifecycleRes.status === 'fulfilled' && lifecycleRes.value.ok) {
      const data = await lifecycleRes.value.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        lifecycleStages = data.options
          .filter(o => !o.hidden)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map(o => ({
            value: o.value,
            label: o.label || o.value,
            description: o.description || ''
          }));
        isDynamic = true;
      }
    }

    if (leadStatusRes.status === 'fulfilled' && leadStatusRes.value.ok) {
      const data = await leadStatusRes.value.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        const dynamicStatuses = data.options
          .filter(o => !o.hidden)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map(o => ({
            value: o.value,
            label: o.label || o.value,
            description: o.description || ''
          }));
        leadStatuses = [
          { value: '', label: '-- Select Lead Status --' },
          ...dynamicStatuses
        ];
        isDynamic = true;
      }
    }

    if (compIndustryRes.status === 'fulfilled' && compIndustryRes.value.ok) {
      const data = await compIndustryRes.value.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        const dynamicIndustries = data.options
          .filter(o => !o.hidden)
          .sort((a, b) => (a.label || a.value).localeCompare(b.label || b.value))
          .map(o => ({
            value: o.value,
            label: o.label || o.value
          }));
        companyIndustries = [
          { value: '', label: '-- Select Industry --' },
          ...dynamicIndustries
        ];
        isDynamic = true;
      }
    }

    if (compTypeRes.status === 'fulfilled' && compTypeRes.value.ok) {
      const data = await compTypeRes.value.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        const dynamicTypes = data.options
          .filter(o => !o.hidden)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map(o => ({
            value: o.value,
            label: o.label || o.value
          }));
        companyTypes = [
          { value: '', label: '-- Select Type --' },
          ...dynamicTypes
        ];
        isDynamic = true;
      }
    }

    if (dealTypeRes.status === 'fulfilled' && dealTypeRes.value.ok) {
      const data = await dealTypeRes.value.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        const dynamicDealTypes = data.options
          .filter(o => !o.hidden)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map(o => ({
            value: o.value,
            label: o.label || o.value
          }));
        dealTypes = [
          { value: '', label: '-- Select Type --' },
          ...dynamicDealTypes
        ];
        isDynamic = true;
      }
    }

    if (dealPriorityRes.status === 'fulfilled' && dealPriorityRes.value.ok) {
      const data = await dealPriorityRes.value.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        const dynamicPriorities = data.options
          .filter(o => !o.hidden)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map(o => ({
            value: o.value,
            label: o.label || o.value
          }));
        dealPriorities = [
          { value: '', label: '-- Select Priority --' },
          ...dynamicPriorities
        ];
        isDynamic = true;
      }
    }

    return res.status(200).json({
      lifecycleStages,
      leadStatuses,
      companyIndustries,
      companyTypes,
      dealTypes,
      dealPriorities,
      isDynamic
    });
  } catch (err) {
    console.error('🔥 [API] /api/hubspot-properties error:', err);
    return res.status(200).json({
      lifecycleStages: DEFAULT_LIFECYCLE_STAGES,
      leadStatuses: DEFAULT_LEAD_STATUS_OPTIONS,
      companyTypes: DEFAULT_COMPANY_TYPES,
      companyIndustries: DEFAULT_COMPANY_INDUSTRIES,
      dealTypes: DEFAULT_DEAL_TYPES,
      dealPriorities: DEFAULT_DEAL_PRIORITIES,
      isDynamic: false,
      error: err.message
    });
  }
}
