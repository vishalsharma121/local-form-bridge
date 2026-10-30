import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Download, 
  Mail, 
  Phone, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  X, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Eye, 
  Plus, 
  Building2, 
  UserCheck, 
  Laptop, 
  Cloud,
  Briefcase,
  Globe,
  Tag,
  ChevronDown,
  Loader2,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LIFECYCLE_STAGES = [
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'lead', label: 'Lead' },
  { value: 'marketingqualifiedlead', label: 'Marketing Qualified Lead' },
  { value: 'salesqualifiedlead', label: 'Sales Qualified Lead' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'customer', label: 'Customer' },
  { value: 'evangelist', label: 'Evangelist' },
  { value: 'other', label: 'Other' }
];

export const LEAD_STATUS_OPTIONS = [
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

export const DEAL_STAGES = [
  { value: 'appointmentscheduled', label: 'Appointment Scheduled' },
  { value: 'qualifiedtobuy', label: 'Qualified to Buy' },
  { value: 'presentationscheduled', label: 'Presentation Scheduled' },
  { value: 'decisionmakerboughtin', label: 'Decision Maker Bought-In' },
  { value: 'contractsent', label: 'Contract Sent' },
  { value: 'closedwon', label: 'Closed Won' },
  { value: 'closedlost', label: 'Closed Lost' }
];

export function getLifecycleBadge(stage) {
  const s = (stage || 'lead').toLowerCase().trim();
  const config = {
    subscriber: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Subscriber' },
    lead: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Lead' },
    marketingqualifiedlead: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'MQL' },
    salesqualifiedlead: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'SQL' },
    opportunity: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Opportunity' },
    customer: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Customer' },
    evangelist: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Evangelist' },
    other: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Other' },
  }[s] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: stage || 'Lead' };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${config.bg} ${config.text} ${config.border} inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {config.label}
    </span>
  );
}

export function getLeadStatusBadge(status) {
  if (!status) return null;
  const s = status.toUpperCase().trim();
  const labels = {
    NEW: 'New',
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    OPEN_DEAL: 'Open Deal',
    UNQUALIFIED: 'Unqualified',
    ATTEMPTED_TO_CONTACT: 'Attempted to Contact',
    CONNECTED: 'Connected',
    BAD_TIMING: 'Bad Timing'
  };
  const label = labels[s] || status;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 shadow-2xs">
      <Tag className="w-2.5 h-2.5 text-slate-400" />
      {label}
    </span>
  );
}

export function getNormalizedSource(source, created_by = '') {
  const src = (source || '').toLowerCase().trim();
  const author = (created_by || '').toLowerCase().trim();

  // 1. If created by an authenticated team user (not HubSpot CRM and not Public Form), or source indicates portal
  const isTeamUser = Boolean(author && !author.includes('hubspot') && !author.includes('public') && !author.includes('website'));
  const isPortalSource = src === 'admin dashboard' || src === 'admin' || src.includes('bridge');

  if (isTeamUser || isPortalSource) {
    return 'Bridge Portal';
  }

  // 2. If public website form
  if (src === 'website form' || src === 'website' || author.includes('public') || author.includes('website')) {
    return 'Website Form';
  }

  // 3. If explicit HubSpot Webhook event
  if (src.includes('webhook')) {
    return 'HubSpot Webhook';
  }

  // 4. Default HubSpot CRM / HubSpot Direct
  return 'HubSpot Direct';
}

export function getSourceBadge(source, created_by = '') {
  const norm = getNormalizedSource(source, created_by);

  if (norm === 'Bridge Portal') {
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border border-amber-200/80 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <Laptop className="w-3 h-3 text-[#F7941D]" />
        Bridge Portal
      </span>
    );
  }

  if (norm === 'Website Form') {
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-sky-50 to-blue-50 text-sky-900 border border-sky-200/80 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <Globe className="w-3 h-3 text-sky-600" />
        Website Form
      </span>
    );
  }

  if (norm === 'HubSpot Webhook') {
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200/90 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <Cloud className="w-3 h-3 text-emerald-600" />
        HubSpot Webhook
      </span>
    );
  }

  return (
    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
      <Cloud className="w-3 h-3 text-slate-400" />
      HubSpot Direct
    </span>
  );
}

export function getCreatorBadge(created_by) {
  const author = (created_by || '').trim();
  const lower = author.toLowerCase();

  if (!author || lower.includes('hubspot')) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-200/60 transition-all">
        <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-[9px] shadow-2xs shrink-0">
          H
        </div>
        <span className="font-extrabold text-slate-800">HubSpot CRM</span>
      </span>
    );
  }

  if (lower.includes('public') || lower.includes('website')) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200/90 shadow-2xs">
        <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-[9px] shadow-2xs shrink-0">
          W
        </div>
        <span className="font-extrabold text-sky-900">Public Lead Form</span>
      </span>
    );
  }

  const nameParts = author.split(' ').filter(Boolean);
  const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 text-purple-900 border border-purple-200/90 shadow-2xs">
      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center font-black text-[9px] shadow-2xs shrink-0">
        {initials}
      </div>
      <span className="truncate max-w-[130px] font-extrabold">{author}</span>
    </span>
  );
}

export default function ContactsView({
  contacts = [],
  allContacts = [],
  companies = [],
  deals = [],
  pipelines = [],
  loading = false,
  error = null,
  searchQuery = '',
  setSearchQuery,
  onExportCSV,
  selectedContact,
  setSelectedContact,
  onRefreshContacts,
  onRefreshCompanies,
  onRefreshDeals,
  adminKey
}) {
  const { getAuthHeaders, can } = useAuth();
  const canCreate = can('create', 'contacts');
  const canEdit = can('edit', 'contacts');
  const canDelete = can('delete', 'contacts');

  const sanitizePhoneInput = (val) => {
    if (!val) return '';
    return val.replace(/[^0-9+\-\s()xX]/g, '');
  };

  // Real HubSpot Owners fetched from HubSpot CRM
  const [owners, setOwners] = useState([
    { id: '16420175', name: 'Hub Dev', email: 'info@starkedge.com' },
    { id: '40802263', name: 'Dev Stark', email: 'dev@starkedge.com' }
  ]);

  // Dynamic Lifecycle Stages and Lead Statuses fetched directly from HubSpot Contact Property definitions
  const [lifecycleStages, setLifecycleStages] = useState(LIFECYCLE_STAGES);
  const [leadStatusOptions, setLeadStatusOptions] = useState(LEAD_STATUS_OPTIONS);

  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicMetadata() {
      try {
        const [ownersRes, propsRes] = await Promise.allSettled([
          fetch('/api/hubspot-owners', { headers: getAuthHeaders() }),
          fetch('/api/hubspot-properties', { headers: getAuthHeaders() })
        ]);

        if (isMounted && ownersRes.status === 'fulfilled' && ownersRes.value.ok) {
          const data = await ownersRes.value.json();
          if (data.owners && data.owners.length > 0) {
            setOwners(data.owners);
          }
        }

        if (isMounted && propsRes.status === 'fulfilled' && propsRes.value.ok) {
          const propData = await propsRes.value.json();
          if (Array.isArray(propData.lifecycleStages) && propData.lifecycleStages.length > 0) {
            setLifecycleStages(propData.lifecycleStages);
          }
          if (Array.isArray(propData.leadStatuses) && propData.leadStatuses.length > 0) {
            setLeadStatusOptions(propData.leadStatuses);
          }
        }
      } catch {
        // Fallbacks remain active
      }
    }
    fetchDynamicMetadata();
    return () => { isMounted = false; };
  }, []);

  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
  const [selectedLifecycleFilter, setSelectedLifecycleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'
  const [selectedIds, setSelectedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit & Delete State
  const [editingContact, setEditingContact] = useState(null);
  const [editForm, setEditForm] = useState({ 
    firstname: '', 
    lastname: '', 
    email: '', 
    phone: '', 
    jobtitle: '', 
    hubspot_owner_id: '', 
    lifecyclestage: 'lead', 
    hs_lead_status: '' 
  });
  const [deletingContact, setDeletingContact] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Initial Create Form - Pure HubSpot Fields + Associations
  const initialContactState = {
    email: '',
    firstname: '',
    lastname: '',
    hubspot_owner_id: '16420175', // default Hub Dev
    jobtitle: '',
    phone: '',
    lifecyclestage: 'lead',
    hs_lead_status: '',
    companyId: '',
    companyName: '',
    companyDomain: '',
    dealId: '',
    dealName: '',
    dealStage: 'appointmentscheduled',
    dealAmount: '',
    pipeline: 'default'
  };

  // Create Contact State
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [newContactData, setNewContactData] = useState(initialContactState);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  // Advanced Company Search & Quick Create
  const companySelectRef = useRef(null);
  const [companySearchText, setCompanySearchText] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isQuickCreateCompanyOpen, setIsQuickCreateCompanyOpen] = useState(false);
  const [quickCompanyData, setQuickCompanyData] = useState({ name: '', domain: '' });
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [quickCompanyError, setQuickCompanyError] = useState('');

  // Advanced Deal Search & Quick Create
  const dealSelectRef = useRef(null);
  const [dealSearchText, setDealSearchText] = useState('');
  const [isDealDropdownOpen, setIsDealDropdownOpen] = useState(false);
  const [isQuickCreateDealOpen, setIsQuickCreateDealOpen] = useState(false);
  const [quickDealData, setQuickDealData] = useState({ name: '', amount: '', stage: 'appointmentscheduled', pipeline: 'default' });
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);
  const [quickDealError, setQuickDealError] = useState('');

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (companySelectRef.current && !companySelectRef.current.contains(event.target)) {
        setIsCompanyDropdownOpen(false);
      }
      if (dealSelectRef.current && !dealSelectRef.current.contains(event.target)) {
        setIsDealDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered Companies for typeahead
  const filteredModalCompanies = useMemo(() => {
    if (!companySearchText.trim()) return companies || [];
    const q = companySearchText.toLowerCase().trim();
    return (companies || []).filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.domain || '').toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }, [companies, companySearchText]);

  // Real-time duplicate company check
  const quickCompanyExistingMatch = useMemo(() => {
    if (!quickCompanyData.name.trim() && !quickCompanyData.domain.trim()) return null;
    const nameNorm = quickCompanyData.name.trim().toLowerCase();
    const domainNorm = quickCompanyData.domain.trim().toLowerCase();
    return (companies || []).find(c => {
      const cName = (c.name || '').toLowerCase();
      const cDomain = (c.domain || '').toLowerCase();
      if (nameNorm && cName === nameNorm) return true;
      if (domainNorm && cDomain === domainNorm && cDomain !== '—') return true;
      return false;
    });
  }, [quickCompanyData.name, quickCompanyData.domain, companies]);

  // Selected Company Object
  const selectedCompanyObj = useMemo(() => {
    if (!newContactData.companyId) return null;
    return (companies || []).find(c => String(c.id) === String(newContactData.companyId)) || {
      id: newContactData.companyId,
      name: newContactData.companyName || 'Associated Company',
      domain: newContactData.companyDomain || ''
    };
  }, [newContactData.companyId, newContactData.companyName, newContactData.companyDomain, companies]);

  // Filtered Deals for typeahead
  const filteredModalDeals = useMemo(() => {
    if (!dealSearchText.trim()) return deals || [];
    const q = dealSearchText.toLowerCase().trim();
    return (deals || []).filter(d => 
      (d.dealname || d.name || '').toLowerCase().includes(q) ||
      (d.dealstage || '').toLowerCase().includes(q) ||
      String(d.id).includes(q) ||
      String(d.amount || '').includes(q)
    );
  }, [deals, dealSearchText]);

  // Real-time duplicate deal check
  const quickDealExistingMatch = useMemo(() => {
    if (!quickDealData.name.trim()) return null;
    const nameNorm = quickDealData.name.trim().toLowerCase();
    return (deals || []).find(d => {
      const dName = (d.dealname || d.name || '').toLowerCase();
      return nameNorm && dName === nameNorm;
    });
  }, [quickDealData.name, deals]);

  // Selected Deal Object
  const selectedDealObj = useMemo(() => {
    if (!newContactData.dealId) return null;
    return (deals || []).find(d => String(d.id) === String(newContactData.dealId)) || {
      id: newContactData.dealId,
      dealname: newContactData.dealName || 'Associated Deal',
      dealstage: newContactData.dealStage || 'appointmentscheduled',
      amount: newContactData.dealAmount || '0'
    };
  }, [newContactData.dealId, newContactData.dealName, newContactData.dealStage, newContactData.dealAmount, deals]);

  // Real-time duplicate contact check by email in Create Modal
  const newContactEmailExistingMatch = useMemo(() => {
    const trimmed = (newContactData.email || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || trimmed.length < 5) return null;
    return (contacts || []).find(c => c.email && c.email.trim().toLowerCase() === trimmed) || null;
  }, [newContactData.email, contacts]);

  // Real-time duplicate contact check by email in Edit Modal
  const editContactEmailConflictMatch = useMemo(() => {
    if (!editingContact) return null;
    const trimmed = (editForm.email || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || trimmed.length < 5) return null;
    return (contacts || []).find(c => String(c.id) !== String(editingContact.id) && c.email && c.email.trim().toLowerCase() === trimmed) || null;
  }, [editingContact, editForm.email, contacts]);

  const openQuickCreateCompany = (prefillName = '') => {
    setQuickCompanyData({
      name: prefillName || companySearchText || '',
      domain: ''
    });
    setQuickCompanyError('');
    setIsQuickCreateCompanyOpen(true);
    setIsCompanyDropdownOpen(false);
  };

  const openQuickCreateDeal = (prefillName = '') => {
    const defaultDealName = prefillName || (newContactData.firstname ? `${newContactData.firstname}'s Deal` : 'New Sales Deal');
    setQuickDealData({
      name: defaultDealName,
      amount: '5000',
      stage: 'appointmentscheduled',
      pipeline: 'default'
    });
    setQuickDealError('');
    setIsQuickCreateDealOpen(true);
    setIsDealDropdownOpen(false);
  };

  // Quick Create Company Handler
  const handleQuickCreateCompany = async () => {
    if (!quickCompanyData.name.trim()) {
      setQuickCompanyError('Company name is required.');
      return;
    }
    setIsCreatingCompany(true);
    setQuickCompanyError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: quickCompanyData.name.trim(),
          domain: quickCompanyData.domain.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to create company');
      }
      const createdId = data.id || data.company?.id;
      setNewContactData(prev => ({
        ...prev,
        companyId: String(createdId),
        companyName: quickCompanyData.name.trim(),
        companyDomain: quickCompanyData.domain.trim()
      }));
      setIsQuickCreateCompanyOpen(false);
      setCompanySearchText('');
      if (onRefreshCompanies) onRefreshCompanies();
    } catch (err) {
      setQuickCompanyError(err.message || 'Failed to create company');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // Quick Create Deal Handler
  const handleQuickCreateDeal = async () => {
    if (!quickDealData.name.trim()) {
      setQuickDealError('Deal name is required.');
      return;
    }
    setIsCreatingDeal(true);
    setQuickDealError('');
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dealname: quickDealData.name.trim(),
          amount: quickDealData.amount.trim() || '0',
          dealstage: quickDealData.stage,
          pipeline: quickDealData.pipeline || 'default'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to create deal');
      }
      const createdId = data.id || data.deal?.id;
      setNewContactData(prev => ({
        ...prev,
        dealId: String(createdId),
        dealName: quickDealData.name.trim(),
        dealStage: quickDealData.stage,
        dealAmount: quickDealData.amount.trim() || '0'
      }));
      setIsQuickCreateDealOpen(false);
      setDealSearchText('');
      if (onRefreshDeals) onRefreshDeals();
    } catch (err) {
      setQuickDealError(err.message || 'Failed to create deal');
    } finally {
      setIsCreatingDeal(false);
    }
  };

  // Main Submit Create Contact
  const handleCreateContactSubmit = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!newContactData.email.trim()) {
      setCreateErrorMsg('Email Address is required.');
      return;
    }
    if (newContactEmailExistingMatch) {
      setCreateErrorMsg(`A contact with email "${newContactData.email.trim()}" already exists in HubSpot CRM (${newContactEmailExistingMatch.name || 'Contact'}, ID #${newContactEmailExistingMatch.id}). Duplicate creation is blocked. Please edit the existing contact or enter a different email.`);
      return;
    }
    if (!newContactData.firstname.trim()) {
      setCreateErrorMsg('First name is required.');
      return;
    }

    if (newContactData.phone.trim()) {
      const digitsCount = (newContactData.phone.match(/\d/g) || []).length;
      if (digitsCount < 7 || digitsCount > 15) {
        setCreateErrorMsg('Please enter a valid phone number containing 7 to 15 digits (e.g. +1 555 000 0000).');
        return;
      }
    }

    setIsSubmittingCreate(true);
    setCreateErrorMsg('');
    setCreateSuccessMsg('');

    try {
      const fullName = `${newContactData.firstname.trim()} ${newContactData.lastname.trim()}`.trim();
      const payload = {
        email: newContactData.email.trim(),
        firstname: newContactData.firstname.trim(),
        lastname: newContactData.lastname.trim(),
        name: fullName,
        phone: newContactData.phone.trim(),
        jobtitle: newContactData.jobtitle.trim(),
        hubspot_owner_id: newContactData.hubspot_owner_id,
        lifecyclestage: newContactData.lifecyclestage,
        hs_lead_status: newContactData.hs_lead_status,
        leadSource: 'Admin Dashboard',
        ...(newContactData.companyId ? { companyId: newContactData.companyId } : {}),
        ...(newContactData.companyName ? { companyName: newContactData.companyName.trim() } : {}),
        ...(newContactData.companyDomain ? { companyDomain: newContactData.companyDomain.trim() } : {}),
        ...(newContactData.dealId ? { dealId: newContactData.dealId } : {}),
        ...(newContactData.dealName ? {
          dealName: newContactData.dealName.trim(),
          dealStage: newContactData.dealStage,
          dealAmount: newContactData.dealAmount,
          pipeline: newContactData.pipeline
        } : {})
      };

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to create contact (HTTP ${res.status})`);
      }

      if (addAnother) {
        setCreateSuccessMsg('Contact created successfully! Form reset for next contact.');
        setNewContactData(initialContactState);
        setIsQuickCreateCompanyOpen(false);
        setIsQuickCreateDealOpen(false);
        if (onRefreshContacts) onRefreshContacts();
        if (onRefreshCompanies && (newContactData.companyId || newContactData.companyName)) onRefreshCompanies();
        if (onRefreshDeals && (newContactData.dealId || newContactData.dealName)) onRefreshDeals();
        setTimeout(() => setCreateSuccessMsg(''), 2500);
      } else {
        setCreateSuccessMsg('Contact created successfully in HubSpot CRM!');
        setTimeout(() => {
          setCreateSuccessMsg('');
          setCreateErrorMsg('');
          setShowCreateContactModal(false);
          setNewContactData(initialContactState);
          setIsQuickCreateCompanyOpen(false);
          setIsQuickCreateDealOpen(false);
          if (onRefreshContacts) onRefreshContacts();
          if (onRefreshCompanies && (newContactData.companyId || newContactData.companyName)) onRefreshCompanies();
          if (onRefreshDeals && (newContactData.dealId || newContactData.dealName)) onRefreshDeals();
        }, 1400);
      }
    } catch (err) {
      setCreateErrorMsg(err.message || 'Something went wrong creating the contact.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit Handlers
  const handleStartEdit = (c) => {
    setEditingContact(c);
    setEditForm({
      firstname: c.firstname || (c.name ? c.name.split(' ')[0] : ''),
      lastname: c.lastname || (c.name ? c.name.split(' ').slice(1).join(' ') : ''),
      email: c.email || '',
      phone: c.phone || '',
      jobtitle: c.jobtitle || '',
      hubspot_owner_id: c.hubspot_owner_id || '',
      lifecyclestage: c.lifecyclestage || 'lead',
      hs_lead_status: c.hs_lead_status || ''
    });
    setActionError('');
    setActionSuccess('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingContact || !editForm.email.trim() || !editForm.firstname.trim()) return;

    if (editContactEmailConflictMatch) {
      setActionError(`Email "${editForm.email.trim()}" is already assigned to another contact (${editContactEmailConflictMatch.name || 'Contact'}, ID #${editContactEmailConflictMatch.id}). Duplicate emails are not permitted.`);
      return;
    }

    if (editForm.phone.trim()) {
      const digitsCount = (editForm.phone.match(/\d/g) || []).length;
      if (digitsCount < 7 || digitsCount > 15) {
        setActionError('Please enter a valid phone number containing 7 to 15 digits (e.g. +1 555 000 0000).');
        return;
      }
    }

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingContact.id,
          firstname: editForm.firstname.trim(),
          lastname: editForm.lastname.trim(),
          name: `${editForm.firstname.trim()} ${editForm.lastname.trim()}`.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          jobtitle: editForm.jobtitle.trim(),
          hubspot_owner_id: editForm.hubspot_owner_id,
          lifecyclestage: editForm.lifecyclestage,
          hs_lead_status: editForm.hs_lead_status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update contact in HubSpot');
      }

      setActionSuccess('Contact updated successfully in HubSpot!');
      setTimeout(() => {
        setEditingContact(null);
        setActionSuccess('');
        if (onRefreshContacts) onRefreshContacts();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error updating contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingContact) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/contacts?id=${deletingContact.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to delete contact from HubSpot');
      }

      setActionSuccess('Contact deleted successfully!');
      setTimeout(() => {
        setDeletingContact(null);
        setActionSuccess('');
        if (onRefreshContacts) onRefreshContacts();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error deleting contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmail = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and Sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        (c.name || '').toLowerCase().includes(q) ||
        (c.firstname || '').toLowerCase().includes(q) ||
        (c.lastname || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.jobtitle || '').toLowerCase().includes(q) ||
        String(c.id).includes(q)
      );
    }

    if (selectedSourceFilter !== 'ALL') {
      result = result.filter(c => getNormalizedSource(c.lead_source, c.created_by) === selectedSourceFilter);
    }

    if (selectedLifecycleFilter !== 'ALL') {
      result = result.filter(c => (c.lifecyclestage || 'lead') === selectedLifecycleFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdate || 0) - new Date(a.createdate || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdate || 0) - new Date(b.createdate || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return result;
  }, [contacts, searchQuery, selectedSourceFilter, selectedLifecycleFilter, sortBy]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedContacts.map(c => c.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getOwnerName = (ownerId) => {
    if (!ownerId) return 'Hub Dev';
    const found = owners.find(o => String(o.id) === String(ownerId));
    return found ? found.name : `Owner #${ownerId}`;
  };

  const detailAssociatedCompany = useMemo(() => {
    if (!selectedContact) return null;
    if (selectedContact.associatedCompanyIds && selectedContact.associatedCompanyIds.length > 0) {
      const match = companies.find(c => selectedContact.associatedCompanyIds.includes(String(c.id)));
      if (match) return match;
    }
    return null;
  }, [selectedContact, companies]);

  const detailAssociatedDeals = useMemo(() => {
    if (!selectedContact) return [];
    if (selectedContact.associatedDealIds && selectedContact.associatedDealIds.length > 0) {
      return deals.filter(d => selectedContact.associatedDealIds.includes(String(d.id)));
    }
    return [];
  }, [selectedContact, deals]);

  return (
    <div className="space-y-3.5 animate-fade-in font-sans flex flex-col h-full min-h-0">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] shrink-0">
        {/* Left: Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts, email, title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lifecycle Filter */}
          <div className="relative">
            <select
              value={selectedLifecycleFilter}
              onChange={(e) => {
                setSelectedLifecycleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] cursor-pointer shadow-inner"
            >
              <option value="ALL">All Stages</option>
              {lifecycleStages.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Source Filter */}
          <div className="relative">
            <select
              value={selectedSourceFilter}
              onChange={(e) => {
                setSelectedSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] cursor-pointer shadow-inner"
            >
              <option value="ALL">All Sources</option>
              <option value="Bridge Portal">Bridge Portal</option>
              <option value="Website Form">Website Form</option>
              <option value="HubSpot Webhook">HubSpot Webhook</option>
              <option value="HubSpot Direct">HubSpot Direct</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] cursor-pointer shadow-inner"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Actions: Export & Create Contact Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onExportCSV && (
            <button
              onClick={() => onExportCSV(filteredContacts)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
              title="Export Contacts as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {/* Create HubSpot Contact Button */}
          {canCreate && (
            <button
              onClick={() => {
                setCreateErrorMsg('');
                setCreateSuccessMsg('');
                setShowCreateContactModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create HubSpot Contact</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col flex-1 min-h-0">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-[#EE3124] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading contacts from HubSpot API...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-2xl m-4 space-y-2">
            <p className="text-sm font-bold">Failed to load contacts: {error}</p>
            <p className="text-xs text-slate-500">Please check your HubSpot connection or network status.</p>
          </div>
        )}

        {!loading && !error && filteredContacts.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No contacts found</p>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedLifecycleFilter !== 'ALL'
                ? 'Try adjusting your search query or filters.'
                : 'No contacts found.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredContacts.length > 0 && (
          <>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="sticky top-0 bg-slate-50 z-10 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        {selectedIds.length === paginatedContacts.length && paginatedContacts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#EE3124]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-extrabold">Contact Name</th>
                    <th className="px-4 py-3 font-extrabold">Email Address</th>
                    <th className="px-4 py-3 font-extrabold">Owner & Stage</th>
                    <th className="px-4 py-3 font-extrabold">Phone Number</th>
                    <th className="px-4 py-3 font-extrabold">Source</th>
                    <th className="px-4 py-3 font-extrabold">Created By</th>
                    <th className="px-4 py-3 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedContacts.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-orange-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button onClick={() => handleToggleSelect(c.id)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#EE3124]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td
                          onClick={() => setSelectedContact(c)}
                          className="px-4 py-3 font-bold text-slate-900 cursor-pointer hover:text-[#EE3124] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-800 font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-slate-300/80 shadow-2xs">
                              {(c.name || 'C')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="truncate max-w-[160px] font-extrabold block text-slate-900 text-xs sm:text-sm">{c.name || '—'}</span>
                              {c.jobtitle && (
                                <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[150px]">
                                  {c.jobtitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {c.email ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[180px] font-medium text-slate-600">
                                {c.email}
                              </span>
                              <button
                                onClick={() => handleCopyEmail(c.email, c.id)}
                                className="text-slate-400 hover:text-[#EE3124] p-1 cursor-pointer"
                                title="Copy Email"
                              >
                                {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {getLifecycleBadge(c.lifecyclestage)}
                              {c.hs_lead_status && getLeadStatusBadge(c.hs_lead_status)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-400" />
                              <span>{getOwnerName(c.hubspot_owner_id)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-600">
                          {c.phone && !/[a-wy-z]/i.test(c.phone) ? c.phone : '—'}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {getSourceBadge(c.lead_source, c.created_by)}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {getCreatorBadge(c.created_by)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <div className="inline-flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                              <button
                                onClick={() => setSelectedContact(c)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-[#EE3124] hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-[#EE3124] transition-colors" />
                                <span>Details</span>
                              </button>

                              {canEdit && (
                                <>
                                  <div className="w-px h-3.5 bg-slate-200/80 my-auto" />
                                  <button
                                    onClick={() => handleStartEdit(c)}
                                    className="p-1 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 cursor-pointer"
                                    title="Edit Contact"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {canDelete && (
                                <>
                                  <div className="w-px h-3.5 bg-slate-200/80 my-auto" />
                                  <button
                                    onClick={() => {
                                      setDeletingContact(c);
                                      setActionError('');
                                      setActionSuccess('');
                                    }}
                                    className="p-1 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 cursor-pointer"
                                    title="Delete Contact"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="shrink-0 px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <div className="flex items-center gap-3">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredContacts.length)} of {filteredContacts.length} contacts
                </span>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#EE3124]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedContact && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[88vh] overflow-y-auto animate-modal-pop">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white font-black text-base flex items-center justify-center shadow-md shadow-orange-500/20">
                  {(selectedContact.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                    {selectedContact.name || 'Unnamed Contact'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-semibold">ID: #{selectedContact.id}</span>
                    {getLifecycleBadge(selectedContact.lifecyclestage)}
                    {selectedContact.hs_lead_status && getLeadStatusBadge(selectedContact.hs_lead_status)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-3 text-xs sm:text-sm">
              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#EE3124]" />
                    <span>Email Address</span>
                  </div>
                  <div className="font-extrabold text-slate-900 truncate">{selectedContact.email || '—'}</div>
                  {selectedContact.email && (
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="text-[11px] font-bold text-[#EE3124] hover:underline inline-block mt-0.5"
                    >
                      Send Email →
                    </a>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>Phone Number</span>
                  </div>
                  <div className="font-extrabold text-slate-900 truncate">
                    {selectedContact.phone && !/[a-wy-z]/i.test(selectedContact.phone) ? selectedContact.phone : '—'}
                  </div>
                  {selectedContact.phone && !/[a-wy-z]/i.test(selectedContact.phone) && (
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="text-[11px] font-bold text-amber-600 hover:underline inline-block mt-0.5"
                    >
                      Call Phone →
                    </a>
                  )}
                </div>
              </div>

              {/* Owner & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Contact Owner</span>
                  </div>
                  <div className="font-extrabold text-slate-900">
                    {getOwnerName(selectedContact.hubspot_owner_id)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                    <span>Job Title</span>
                  </div>
                  <div className="font-extrabold text-slate-900">
                    {selectedContact.jobtitle || '—'}
                  </div>
                </div>
              </div>

              {/* Associated Company Card */}
              {detailAssociatedCompany && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-slate-50 border border-blue-200 space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Associated Company</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">{detailAssociatedCompany.name}</div>
                      <div className="text-[11px] text-slate-500">{detailAssociatedCompany.domain || 'No domain'}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      ID: #{detailAssociatedCompany.id}
                    </span>
                  </div>
                </div>
              )}

              {/* Associated Deals List */}
              {detailAssociatedDeals.length > 0 && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-slate-50 border border-emerald-200 space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Associated Deals ({detailAssociatedDeals.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {detailAssociatedDeals.map(d => (
                      <div key={d.id} className="p-2 rounded-xl bg-white border border-emerald-100 flex items-center justify-between shadow-2xs">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{d.dealname || d.name}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{d.dealstage || 'Appointment Scheduled'}</div>
                        </div>
                        <div className="font-black text-xs text-emerald-700">
                          ${Number(d.amount || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inbound Website Message (Only displayed if inbound message exists) */}
              {(selectedContact.message || selectedContact.subject) && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <span>Inbound Website Submission Info</span>
                  </div>
                  {selectedContact.subject && (
                    <div className="text-xs text-slate-700 font-bold">
                      Subject: <span className="font-medium text-slate-600">{selectedContact.subject}</span>
                    </div>
                  )}
                  {selectedContact.message && (
                    <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-sans p-2.5 bg-white rounded-xl border border-slate-200/80 font-medium">
                      {selectedContact.message}
                    </div>
                  )}
                </div>
              )}

              {/* Creator & Lead Source Attribution Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/80 via-slate-50 to-orange-50/40 border border-purple-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 mb-1">Created By</div>
                  {getCreatorBadge(selectedContact.created_by)}
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 text-right">Lead Source</div>
                  {getSourceBadge(selectedContact.lead_source, selectedContact.created_by)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    handleStartEdit(selectedContact);
                    setSelectedContact(null);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Contact</span>
                </button>
              )}
              <button
                onClick={() => setSelectedContact(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Contact Modal - Pure HubSpot Native Fields */}
      {editingContact && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[88vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit Contact</h3>
                  <p className="text-xs text-slate-500 font-medium">Update contact properties in HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setEditingContact(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600" />
                {actionSuccess}
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                    <span>Email *</span>
                    {editContactEmailConflictMatch && (
                      <span className="text-[10px] text-rose-600 font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-100 border border-rose-200">
                        Email Conflict
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@example.com"
                      value={editForm.email}
                      onChange={(e) => {
                        setEditForm({ ...editForm, email: e.target.value });
                        if (actionError) setActionError('');
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                        editContactEmailConflictMatch
                          ? 'bg-rose-50/60 border-2 border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'bg-slate-50 border border-slate-200 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white'
                      }`}
                    />
                    {editContactEmailConflictMatch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      </div>
                    )}
                  </div>
                  {editContactEmailConflictMatch && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        This email is already in use by <strong>{editContactEmailConflictMatch.name || 'another contact'}</strong> (ID #{editContactEmailConflictMatch.id}).
                      </span>
                    </div>
                  )}
                </div>

                {/* First & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John"
                      value={editForm.firstname}
                      onChange={(e) => setEditForm({ ...editForm, firstname: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={editForm.lastname}
                      onChange={(e) => setEditForm({ ...editForm, lastname: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Owner & Job Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Contact Owner
                    </label>
                    <div className="relative">
                      <select
                        value={editForm.hubspot_owner_id}
                        onChange={(e) => setEditForm({ ...editForm, hubspot_owner_id: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all font-semibold cursor-pointer"
                      >
                        {owners.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Director of Operations"
                      value={editForm.jobtitle}
                      onChange={(e) => setEditForm({ ...editForm, jobtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Phone Number & Lifecycle Stage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 000-0000"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: sanitizePhoneInput(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Lifecycle Stage
                    </label>
                    <div className="relative">
                      <select
                        value={editForm.lifecyclestage}
                        onChange={(e) => setEditForm({ ...editForm, lifecyclestage: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all font-semibold cursor-pointer"
                      >
                        {lifecycleStages.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Lead Status */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Lead Status
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.hs_lead_status}
                      onChange={(e) => setEditForm({ ...editForm, hs_lead_status: e.target.value })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all font-semibold cursor-pointer"
                    >
                      {leadStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || Boolean(editContactEmailConflictMatch)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all ${
                      editContactEmailConflictMatch
                        ? 'bg-rose-100 text-rose-600 border border-rose-200 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white shadow-orange-600/20 cursor-pointer disabled:opacity-50'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : editContactEmailConflictMatch ? 'Email Taken (Blocked)' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Delete Contact Modal */}
      {deletingContact && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Delete Contact</h3>
                  <p className="text-xs text-slate-500 font-medium">Remove contact from HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingContact(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600" />
                {actionSuccess}
              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">{deletingContact.name || deletingContact.email}</strong> from HubSpot CRM? This action cannot be undone.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingContact(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Contact'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* CREATE HUBSPOT CONTACT DRAWER (Strictly HubSpot CRM Fields + Company & Deal Advanced Search) */}
      {showCreateContactModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={() => {
              setShowCreateContactModal(false);
              setCreateErrorMsg('');
              setCreateSuccessMsg('');
            }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in" 
          />

          {/* Right Slide-over Panel matching HubSpot */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-xl md:max-w-[560px] bg-white shadow-2xl flex flex-col z-[10000] border-l border-slate-200 animate-slide-left">
            
            {/* Drawer Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <h2 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">Create Contact</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateContactModal(false);
                  setCreateErrorMsg('');
                  setCreateSuccessMsg('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {createSuccessMsg ? (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs sm:text-sm flex items-center gap-2.5 border border-emerald-200 animate-fade-in">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{createSuccessMsg}</span>
                </div>
              ) : (
                <form id="create-contact-form" onSubmit={(e) => handleCreateContactSubmit(e, false)} className="space-y-4 text-xs sm:text-sm">
                  {createErrorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-200 flex items-start gap-2.5 animate-fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-snug">{createErrorMsg}</div>
                    </div>
                  )}

                  {/* Email Address (First Field like HubSpot Drawer) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Email</span>
                        {newContactEmailExistingMatch && (
                          <span className="text-[10px] text-rose-600 font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-100 border border-rose-200">
                            Duplicate Found
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder=""
                        value={newContactData.email}
                        onChange={(e) => {
                          setNewContactData({ ...newContactData, email: e.target.value });
                          if (createErrorMsg) setCreateErrorMsg('');
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-slate-900 focus:outline-none focus:ring-2 transition-all font-medium text-xs sm:text-sm ${
                          newContactEmailExistingMatch
                            ? 'bg-rose-50/60 border-2 border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'bg-white border border-slate-300 focus:ring-[#00A389]/20 focus:border-[#00A389]'
                        }`}
                      />
                      {newContactEmailExistingMatch && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </div>
                      )}
                    </div>

                    {/* Real-time duplicate contact warning banner */}
                    {newContactEmailExistingMatch && (
                      <div className="p-3 bg-gradient-to-r from-rose-50 via-amber-50/70 to-rose-50 border-2 border-rose-300 rounded-xl space-y-2 animate-fade-in shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-black text-rose-950 min-w-0">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="truncate">Contact Already Exists in HubSpot CRM</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-200/90 text-rose-950 border border-rose-300 shrink-0">
                            ID: #{newContactEmailExistingMatch.id}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="text-xs text-slate-700 min-w-0">
                            <span className="font-extrabold text-slate-900 truncate block">
                              {newContactEmailExistingMatch.name || 'Unnamed Contact'}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {newContactEmailExistingMatch.email} • Stage: {newContactEmailExistingMatch.lifecyclestage || 'Lead'} {newContactEmailExistingMatch.jobtitle ? `• ${newContactEmailExistingMatch.jobtitle}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCreateContactModal(false);
                                setCreateErrorMsg('');
                                handleStartEdit(newContactEmailExistingMatch);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Existing</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* First Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      First name
                    </label>
                    <input
                      type="text"
                      placeholder=""
                      value={newContactData.firstname}
                      onChange={(e) => setNewContactData({ ...newContactData, firstname: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Last name
                    </label>
                    <input
                      type="text"
                      placeholder=""
                      value={newContactData.lastname}
                      onChange={(e) => setNewContactData({ ...newContactData, lastname: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                    />
                  </div>

                  {/* Progressive Disclosure Section (Locked/Overlay until Email, First name, or Last name is typed) */}
                  <div className="relative pt-1">
                    {/* Centered Overlay Prompt matching HubSpot Screenshot 2 */}
                    {!newContactData.email.trim() && !newContactData.firstname.trim() && !newContactData.lastname.trim() && (
                      <div className="absolute inset-0 z-20 flex items-start justify-center pt-24 pointer-events-none select-none px-4">
                        <div className="text-center max-w-[280px]">
                          <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            Start by entering the Contact's name, email, or both.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className={`space-y-4 transition-all duration-200 ${
                      !newContactData.email.trim() && !newContactData.firstname.trim() && !newContactData.lastname.trim()
                        ? 'opacity-25 pointer-events-none select-none'
                        : 'opacity-100'
                    }`}>

                {/* Contact Owner & Job Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600 flex items-center justify-between">
                      <span>Contact owner</span>
                      <span className="text-[10px] text-slate-400 font-normal">HubSpot CRM</span>
                    </label>
                    <div className="relative">
                      <select
                        value={newContactData.hubspot_owner_id}
                        onChange={(e) => setNewContactData({ ...newContactData, hubspot_owner_id: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner font-semibold cursor-pointer"
                      >
                        {owners.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">
                      Job title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Project Lead"
                      value={newContactData.jobtitle}
                      onChange={(e) => setNewContactData({ ...newContactData, jobtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Phone Number & Lifecycle Stage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 000-0000"
                      value={newContactData.phone}
                      onChange={(e) => setNewContactData({ ...newContactData, phone: sanitizePhoneInput(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">
                      Lifecycle stage
                    </label>
                    <div className="relative">
                      <select
                        value={newContactData.lifecyclestage}
                        onChange={(e) => setNewContactData({ ...newContactData, lifecyclestage: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner font-semibold cursor-pointer"
                      >
                        {lifecycleStages.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Lead status (Full width row, matching HubSpot drawer) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Lead status
                  </label>
                  <div className="relative">
                    <select
                      value={newContactData.hs_lead_status}
                      onChange={(e) => setNewContactData({ ...newContactData, hs_lead_status: e.target.value })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner font-semibold cursor-pointer"
                    >
                      {leadStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* ======================================================== */}
                {/* ADVANCED SEARCH & SELECT COMPANY (HubSpot Association) */}
                {/* ======================================================== */}
                <div className="space-y-1.5 pt-1" ref={companySelectRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Associate HubSpot Company (Optional)</span>
                    </label>
                    {!isQuickCreateCompanyOpen && !selectedCompanyObj && (
                      <button
                        type="button"
                        onClick={() => openQuickCreateCompany()}
                        className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Create New Company</span>
                      </button>
                    )}
                    {selectedCompanyObj && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        1 Company Linked
                      </span>
                    )}
                  </div>

                  {/* Quick Create Company Form */}
                  {isQuickCreateCompanyOpen ? (
                    <div className="p-4 bg-gradient-to-b from-blue-50/50 via-slate-50/30 to-white border border-blue-200 rounded-2xl space-y-3.5 shadow-2xs animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">Create & Link New Company</div>
                            <div className="text-[10px] text-slate-500 font-medium">Will be saved to HubSpot CRM and linked to this contact</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsQuickCreateCompanyOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {quickCompanyError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{quickCompanyError}</span>
                        </div>
                      )}

                      {/* Real-time duplicate company alert */}
                      {quickCompanyExistingMatch && (
                        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-1.5 animate-fade-in shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 min-w-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">Company Already Exists in HubSpot</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 shrink-0">
                              ID: #{quickCompanyExistingMatch.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="text-[11px] text-slate-700 min-w-0">
                              <span className="font-extrabold text-slate-900 truncate block">{quickCompanyExistingMatch.name}</span>
                              <span className="text-[10px] text-slate-500 truncate block">
                                {quickCompanyExistingMatch.domain && quickCompanyExistingMatch.domain !== '—' ? quickCompanyExistingMatch.domain : 'No domain registered'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewContactData(prev => ({
                                  ...prev,
                                  companyId: String(quickCompanyExistingMatch.id),
                                  companyName: quickCompanyExistingMatch.name,
                                  companyDomain: quickCompanyExistingMatch.domain || ''
                                }));
                                setIsQuickCreateCompanyOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-xs transition-colors"
                            >
                              Link Existing Company
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. StarkEdge"
                            value={quickCompanyData.name}
                            onChange={(e) => setQuickCompanyData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                              quickCompanyExistingMatch
                                ? 'border-amber-300 focus:ring-amber-400/20 focus:border-amber-500'
                                : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Domain (starkedge.com)
                          </label>
                          <input
                            type="text"
                            placeholder="starkedge.com"
                            value={quickCompanyData.domain}
                            onChange={(e) => setQuickCompanyData(prev => ({ ...prev, domain: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickCreateCompanyOpen(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Back to Search
                        </button>
                        <button
                          type="button"
                          disabled={isCreatingCompany}
                          onClick={handleQuickCreateCompany}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isCreatingCompany ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating & Linking...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{quickCompanyExistingMatch ? 'Create Duplicate Anyway' : 'Create & Link Company'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : selectedCompanyObj && !isCompanyDropdownOpen ? (
                    /* Selected Company Card */
                    <div className="p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {selectedCompanyObj.name || 'Unnamed Company'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100/90 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Associated
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                            <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{selectedCompanyObj.domain && selectedCompanyObj.domain !== '—' ? selectedCompanyObj.domain : 'No domain registered'}</span>
                            <span className="text-slate-400">• ID: #{selectedCompanyObj.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCompanyDropdownOpen(true);
                            setCompanySearchText('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewContactData(prev => ({ ...prev, companyId: '', companyName: '', companyDomain: '' }));
                            setCompanySearchText('');
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove association"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Typeahead Search Input & Dropdown */
                    <div className="relative">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={companySearchText}
                          onChange={(e) => {
                            setCompanySearchText(e.target.value);
                            if (!isCompanyDropdownOpen) setIsCompanyDropdownOpen(true);
                          }}
                          onFocus={() => setIsCompanyDropdownOpen(true)}
                          placeholder="Search existing companies by name or domain..."
                          className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                        />
                        {companySearchText && (
                          <button
                            type="button"
                            onClick={() => setCompanySearchText('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      {isCompanyDropdownOpen && (
                        <div className="mt-2 bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col max-h-56 shadow-md transition-all">
                          <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>
                              {companySearchText 
                                ? `Found ${filteredModalCompanies.length} matching ${filteredModalCompanies.length === 1 ? 'company' : 'companies'}` 
                                : `Select from ${companies.length} HubSpot Companies`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Click to link</span>
                          </div>

                          <div className="overflow-y-auto p-1.5 space-y-1">
                            {/* Option: No company selected */}
                            <button
                              type="button"
                              onClick={() => {
                                setNewContactData(prev => ({ ...prev, companyId: '', companyName: '', companyDomain: '' }));
                                setIsCompanyDropdownOpen(false);
                                setCompanySearchText('');
                              }}
                              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-500 hover:bg-slate-200/70 transition-colors flex items-center gap-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                                <X className="w-3.5 h-3.5" />
                              </div>
                              <span>No Company Selected (Skip association)</span>
                            </button>

                            {filteredModalCompanies.length === 0 ? (
                              <div className="py-5 px-3 text-center space-y-3">
                                <div className="text-xs text-slate-500 font-medium">
                                  No company found matching &ldquo;<span className="font-bold text-slate-800">{companySearchText}</span>&rdquo;
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openQuickCreateCompany(companySearchText)}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Create & Link &ldquo;{companySearchText}&rdquo;</span>
                                </button>
                              </div>
                            ) : (
                              <>
                                {filteredModalCompanies.map((c) => {
                                  const isSelected = String(newContactData.companyId) === String(c.id);
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setNewContactData(prev => ({
                                          ...prev,
                                          companyId: c.id,
                                          companyName: c.name || '',
                                          companyDomain: c.domain && c.domain !== '—' ? c.domain : ''
                                        }));
                                        setIsCompanyDropdownOpen(false);
                                        setCompanySearchText('');
                                      }}
                                      className={`w-full px-3 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer group ${
                                        isSelected 
                                          ? 'bg-blue-50/90 border border-blue-200 text-blue-700' 
                                          : 'hover:bg-white bg-slate-50/50 border border-transparent hover:border-slate-200 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                          isSelected 
                                            ? 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-2xs' 
                                            : 'bg-white border border-slate-200 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                                        }`}>
                                          <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs truncate group-hover:text-blue-600 transition-colors">
                                            {c.name || 'Unnamed Company'}
                                          </div>
                                          <div className="text-[11px] text-slate-400 font-medium truncate">
                                            {c.domain && c.domain !== '—' ? c.domain : 'No domain registered'}
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}

                                <div className="pt-1.5 mt-1 border-t border-slate-200/70">
                                  <button
                                    type="button"
                                    onClick={() => openQuickCreateCompany(companySearchText)}
                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-blue-600 hover:bg-blue-50/80 transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                      <Plus className="w-3.5 h-3.5" />
                                    </div>
                                    <span>+ Create & Link New Company</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ======================================================== */}
                {/* ADVANCED SEARCH & SELECT DEAL (HubSpot Association) */}
                {/* ======================================================== */}
                <div className="space-y-1.5 pt-1" ref={dealSelectRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Associate HubSpot Deal (Optional)</span>
                    </label>
                    {!isQuickCreateDealOpen && !selectedDealObj && (
                      <button
                        type="button"
                        onClick={() => openQuickCreateDeal()}
                        className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Create New Deal</span>
                      </button>
                    )}
                    {selectedDealObj && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        1 Deal Linked
                      </span>
                    )}
                  </div>

                  {/* Quick Create Deal Form */}
                  {isQuickCreateDealOpen ? (
                    <div className="p-4 bg-gradient-to-b from-emerald-50/50 via-slate-50/30 to-white border border-emerald-200 rounded-2xl space-y-3.5 shadow-2xs animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xs">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">Create & Link New Deal</div>
                            <div className="text-[10px] text-slate-500 font-medium">Will be saved to HubSpot CRM and linked to this contact</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsQuickCreateDealOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {quickDealError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{quickDealError}</span>
                        </div>
                      )}

                      {/* Real-time duplicate deal alert */}
                      {quickDealExistingMatch && (
                        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-1.5 animate-fade-in shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 min-w-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">Deal with Similar Name Exists</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 shrink-0">
                              ID: #{quickDealExistingMatch.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="text-[11px] text-slate-700 min-w-0">
                              <span className="font-extrabold text-slate-900 truncate block">{quickDealExistingMatch.dealname || quickDealExistingMatch.name}</span>
                              <span className="text-[10px] text-slate-500 truncate block">
                                Stage: {quickDealExistingMatch.dealstage || 'Appointment Scheduled'} • ${Number(quickDealExistingMatch.amount || 0).toLocaleString()}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewContactData(prev => ({
                                  ...prev,
                                  dealId: String(quickDealExistingMatch.id),
                                  dealName: quickDealExistingMatch.dealname || quickDealExistingMatch.name,
                                  dealStage: quickDealExistingMatch.dealstage,
                                  dealAmount: String(quickDealExistingMatch.amount || '0')
                                }));
                                setIsQuickCreateDealOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-xs transition-colors"
                            >
                              Link Existing Deal
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Deal Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Q4 Website Redesign Deal"
                            value={quickDealData.name}
                            onChange={(e) => setQuickDealData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Amount ($)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 5000"
                            value={quickDealData.amount}
                            onChange={(e) => setQuickDealData(prev => ({ ...prev, amount: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Deal Stage
                          </label>
                          <select
                            value={quickDealData.stage}
                            onChange={(e) => setQuickDealData(prev => ({ ...prev, stage: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                          >
                            {DEAL_STAGES.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Pipeline
                          </label>
                          <select
                            value={quickDealData.pipeline}
                            onChange={(e) => setQuickDealData(prev => ({ ...prev, pipeline: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                          >
                            <option value="default">Sales Pipeline (Default)</option>
                            {pipelines.map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickCreateDealOpen(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Back to Search
                        </button>
                        <button
                          type="button"
                          disabled={isCreatingDeal}
                          onClick={handleQuickCreateDeal}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isCreatingDeal ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating & Linking...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{quickDealExistingMatch ? 'Create Duplicate Anyway' : 'Create & Link Deal'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : selectedDealObj && !isDealDropdownOpen ? (
                    /* Selected Deal Card */
                    <div className="p-3 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {selectedDealObj.dealname || selectedDealObj.name || 'Unnamed Deal'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100/90 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Associated
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-emerald-700">${Number(selectedDealObj.amount || 0).toLocaleString()}</span>
                            <span className="text-slate-400">• Stage: {selectedDealObj.dealstage || 'Appointment Scheduled'}</span>
                            <span className="text-slate-400">• ID: #{selectedDealObj.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDealDropdownOpen(true);
                            setDealSearchText('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewContactData(prev => ({ ...prev, dealId: '', dealName: '', dealAmount: '', dealStage: 'appointmentscheduled' }));
                            setDealSearchText('');
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove association"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Typeahead Search Input & Dropdown */
                    <div className="relative">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={dealSearchText}
                          onChange={(e) => {
                            setDealSearchText(e.target.value);
                            if (!isDealDropdownOpen) setIsDealDropdownOpen(true);
                          }}
                          onFocus={() => setIsDealDropdownOpen(true)}
                          placeholder="Search existing deals by name, stage, or amount..."
                          className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        />
                        {dealSearchText && (
                          <button
                            type="button"
                            onClick={() => setDealSearchText('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      {isDealDropdownOpen && (
                        <div className="mt-2 bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col max-h-56 shadow-md transition-all">
                          <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>
                              {dealSearchText 
                                ? `Found ${filteredModalDeals.length} matching ${filteredModalDeals.length === 1 ? 'deal' : 'deals'}` 
                                : `Select from ${deals.length} HubSpot Deals`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Click to link</span>
                          </div>

                          <div className="overflow-y-auto p-1.5 space-y-1">
                            {/* Option: No deal selected */}
                            <button
                              type="button"
                              onClick={() => {
                                setNewContactData(prev => ({ ...prev, dealId: '', dealName: '', dealAmount: '', dealStage: 'appointmentscheduled' }));
                                setIsDealDropdownOpen(false);
                                setDealSearchText('');
                              }}
                              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-500 hover:bg-slate-200/70 transition-colors flex items-center gap-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                                <X className="w-3.5 h-3.5" />
                              </div>
                              <span>No Deal Selected (Skip association)</span>
                            </button>

                            {filteredModalDeals.length === 0 ? (
                              <div className="py-5 px-3 text-center space-y-3">
                                <div className="text-xs text-slate-500 font-medium">
                                  No deal found matching &ldquo;<span className="font-bold text-slate-800">{dealSearchText}</span>&rdquo;
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openQuickCreateDeal(dealSearchText)}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Create & Link &ldquo;{dealSearchText}&rdquo;</span>
                                </button>
                              </div>
                            ) : (
                              <>
                                {filteredModalDeals.map((d) => {
                                  const isSelected = String(newContactData.dealId) === String(d.id);
                                  return (
                                    <button
                                      key={d.id}
                                      type="button"
                                      onClick={() => {
                                        setNewContactData(prev => ({
                                          ...prev,
                                          dealId: d.id,
                                          dealName: d.dealname || d.name || '',
                                          dealStage: d.dealstage || 'appointmentscheduled',
                                          dealAmount: String(d.amount || '0')
                                        }));
                                        setIsDealDropdownOpen(false);
                                        setDealSearchText('');
                                      }}
                                      className={`w-full px-3 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer group ${
                                        isSelected 
                                          ? 'bg-emerald-50/90 border border-emerald-200 text-emerald-800' 
                                          : 'hover:bg-white bg-slate-50/50 border border-transparent hover:border-slate-200 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                          isSelected 
                                            ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-2xs' 
                                            : 'bg-white border border-slate-200 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700'
                                        }`}>
                                          <Briefcase className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs truncate group-hover:text-emerald-700 transition-colors">
                                            {d.dealname || d.name || 'Unnamed Deal'}
                                          </div>
                                          <div className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                                            <span className="font-bold text-slate-700">${Number(d.amount || 0).toLocaleString()}</span>
                                            <span>• {d.dealstage || 'Appointment Scheduled'}</span>
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}

                                <div className="pt-1.5 mt-1 border-t border-slate-200/70">
                                  <button
                                    type="button"
                                    onClick={() => openQuickCreateDeal(dealSearchText)}
                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50/80 transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                      <Plus className="w-3.5 h-3.5" />
                                    </div>
                                    <span>+ Create & Link New Deal</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </form>
          )}
        </div>

        {/* Fixed Drawer Footer matching HubSpot Screenshot 2 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-2.5 shrink-0">
          {(() => {
            const isPrimaryFilled = Boolean(newContactData.email.trim() || newContactData.firstname.trim() || newContactData.lastname.trim());
            const isBlocked = isSubmittingCreate || Boolean(newContactEmailExistingMatch) || !isPrimaryFilled;

            return (
              <>
                <button
                  type="submit"
                  form="create-contact-form"
                  disabled={isBlocked}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isBlocked
                      ? 'bg-[#f5f8fa] text-[#b0c1d4] border border-[#cbd6e2] cursor-not-allowed'
                      : 'bg-[#00A389] hover:bg-[#008f77] text-white shadow-xs cursor-pointer'
                  }`}
                >
                  {isSubmittingCreate ? 'Creating...' : newContactEmailExistingMatch ? 'Duplicate Blocked' : 'Create'}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleCreateContactSubmit(e, true)}
                  disabled={isBlocked}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isBlocked
                      ? 'bg-[#f5f8fa] text-[#b0c1d4] border border-[#cbd6e2] cursor-not-allowed'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer'
                  }`}
                >
                  Create and add another
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateContactModal(false);
                    setCreateErrorMsg('');
                    setCreateSuccessMsg('');
                  }}
                  className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </div>,
    document.body
  )}
    </div>
  );
}
