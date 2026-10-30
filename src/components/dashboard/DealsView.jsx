import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSourceBadge, getCreatorBadge, getNormalizedSource } from './ContactsView';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  Building2, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  AlertTriangle,
  Check,
  Users,
  Mail,
  UserCheck,
  UserPlus,
  Loader2,
  Globe,
  Calendar,
  ExternalLink,
  Info,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const getDefaultCloseDate = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function DealsView({
  deals = [],
  pipelines = [],
  loading = false,
  error = null,
  contacts = [],
  companies = [],
  onRefreshDeals,
  onRefreshContacts,
  onRefreshCompanies,
  adminKey
}) {
  const { getAuthHeaders, can, isSuperAdmin } = useAuth();
  const canCreate = can('create', 'deals');
  const canEdit = can('edit', 'deals');
  const canDelete = can('delete', 'deals');
  const [searchQuery, setSearchQuery] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Metadata from HubSpot
  const [owners, setOwners] = useState([]);
  const [dealTypes, setDealTypes] = useState([
    { value: '', label: '-- Select Deal Type --' },
    { value: 'newbusiness', label: 'New Business' },
    { value: 'existingbusiness', label: 'Existing Business' }
  ]);
  const [dealPriorities, setDealPriorities] = useState([
    { value: '', label: '-- Select Priority --' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ]);

  useEffect(() => {
    let isMounted = true;
    async function fetchMetadata() {
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
          if (Array.isArray(propData.dealTypes) && propData.dealTypes.length > 0) {
            setDealTypes(propData.dealTypes);
          }
          if (Array.isArray(propData.dealPriorities) && propData.dealPriorities.length > 0) {
            setDealPriorities(propData.dealPriorities);
          }
        }
      } catch {
        // Fallbacks remain active
      }
    }
    fetchMetadata();
    return () => { isMounted = false; };
  }, []);

  // Active pipelines from HubSpot API (with fallback if empty)
  const activePipelines = useMemo(() => {
    if (pipelines && pipelines.length > 0) return pipelines;
    return [
      {
        id: 'default',
        label: 'Sales Pipeline',
        stages: [
          { id: 'appointmentscheduled', label: 'On the Radar' },
          { id: 'qualifiedtobuy', label: 'Demo stage' },
          { id: 'presentationscheduled', label: 'Plant Visit stage' },
          { id: 'decisionmakerboughtin', label: 'Qualification stage' },
          { id: 'contractsent', label: 'Opportunity stage' },
          { id: 'closedwon', label: 'Proposal Submitted stage' },
          { id: 'closedlost', label: 'Closed Lost' }
        ]
      }
    ];
  }, [pipelines]);

  // Helper to resolve human-readable pipeline label
  const getPipelineLabel = (pipeId) => {
    if (!pipeId) return 'Sales Pipeline';
    const found = activePipelines.find(p => p.id === pipeId || (p.id === 'default' && pipeId === 'default'));
    if (found) return found.label;
    if (pipeId === 'default') return 'Sales Pipeline';
    return pipeId
      .replace(/^hs-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper to format stage badge with dynamic label and color
  const getStageBadge = (stageId, pipeId) => {
    let label = stageId || 'Unknown';
    let foundStage = null;
    for (const p of activePipelines) {
      const s = (p.stages || []).find(st => st.id === stageId);
      if (s) {
        foundStage = s;
        break;
      }
    }

    if (foundStage) {
      label = foundStage.label;
    } else {
      label = (stageId || '')
        .replace(/^hs-eco-trx-/, '')
        .replace(/^hs-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }

    const lower = (stageId || '').toLowerCase();
    const labelLower = (label || '').toLowerCase();
    let color = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';

    if (lower.includes('won') || lower.includes('sold') || labelLower.includes('sold') || labelLower.includes('won') || lower.includes('success')) {
      color = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    } else if (lower.includes('lost') || lower.includes('failed') || lower.includes('closedlost')) {
      color = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    } else if (lower.includes('contract') || lower.includes('opportunity') || lower.includes('proposal')) {
      color = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
    } else if (lower.includes('presentation') || lower.includes('demo') || lower.includes('qualified') || lower.includes('visit')) {
      color = 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs border ${color}`}>
        {label}
      </span>
    );
  };

  // Edit & Delete state for deals
  const [editingDeal, setEditingDeal] = useState(null);
  const [editDealData, setEditDealData] = useState({
    dealname: '',
    pipeline: 'default',
    dealstage: 'appointmentscheduled',
    amount: '',
    closedate: '',
    hubspot_owner_id: '',
    dealtype: '',
    hs_priority: ''
  });
  const [deletingDeal, setDeletingDeal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const handleStartEditDeal = (d) => {
    const pipeId = d.pipeline || activePipelines[0]?.id || 'default';
    const stageId = d.dealstage || activePipelines[0]?.stages[0]?.id || 'appointmentscheduled';
    let formattedCloseDate = '';
    if (d.closedate) {
      try {
        const cd = new Date(d.closedate);
        if (!isNaN(cd.getTime())) {
          formattedCloseDate = cd.toISOString().split('T')[0];
        }
      } catch {
        formattedCloseDate = d.closedate;
      }
    }
    setEditingDeal(d);
    setEditDealData({
      dealname: d.dealname || '',
      pipeline: pipeId,
      dealstage: stageId,
      amount: d.amount || '',
      closedate: formattedCloseDate,
      hubspot_owner_id: d.hubspot_owner_id || '',
      dealtype: d.dealtype || '',
      hs_priority: d.hs_priority || ''
    });
    setActionError('');
    setActionSuccess('');
  };

  const handleEditPipelineChange = (newPipeId) => {
    const targetPipe = activePipelines.find(p => p.id === newPipeId) || activePipelines[0];
    const firstStage = targetPipe?.stages[0]?.id || 'appointmentscheduled';
    setEditDealData(prev => ({
      ...prev,
      pipeline: newPipeId,
      dealstage: firstStage
    }));
  };

  const handleSaveDealEdit = async (e) => {
    e.preventDefault();
    if (!editingDeal || !editDealData.dealname.trim()) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/deals', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingDeal.id,
          dealname: editDealData.dealname.trim(),
          pipeline: editDealData.pipeline,
          dealstage: editDealData.dealstage,
          amount: editDealData.amount,
          closedate: editDealData.closedate || '',
          hubspot_owner_id: editDealData.hubspot_owner_id || '',
          dealtype: editDealData.dealtype || '',
          hs_priority: editDealData.hs_priority || ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update deal in HubSpot.');
      }

      setActionSuccess('Deal updated successfully in HubSpot CRM!');
      setTimeout(() => {
        setEditingDeal(null);
        setActionSuccess('');
        if (onRefreshDeals) onRefreshDeals();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error updating deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteDeal = async () => {
    if (!deletingDeal) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/deals?id=${deletingDeal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to delete deal from HubSpot.');
      }

      setActionSuccess('Deal deleted successfully!');
      setTimeout(() => {
        setDeletingDeal(null);
        setActionSuccess('');
        if (onRefreshDeals) onRefreshDeals();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error deleting deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form state for creating a new deal matching HubSpot Screenshot 3
  const [newDealData, setNewDealData] = useState({
    dealname: '',
    pipeline: 'default',
    dealstage: 'appointmentscheduled',
    amount: '',
    closedate: getDefaultCloseDate(),
    hubspot_owner_id: '',
    dealtype: '',
    hs_priority: '',
    contactId: '',
    addContactTimeline: true,
    companyId: '',
    companyName: '',
    companyDomain: '',
    addCompanyTimeline: true,
    lineItem: '',
    quantity: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [contactSearchText, setContactSearchText] = useState('');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickContactData, setQuickContactData] = useState({ name: '', email: '', phone: '' });
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [quickContactError, setQuickContactError] = useState('');
  const [createdContacts, setCreatedContacts] = useState([]);
  const contactSelectRef = useRef(null);

  // Company selection & creation state
  const [companySearchText, setCompanySearchText] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isQuickCreateCompanyOpen, setIsQuickCreateCompanyOpen] = useState(false);
  const [quickCompanyData, setQuickCompanyData] = useState({ name: '', domain: '' });
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [quickCompanyError, setQuickCompanyError] = useState('');
  const [createdCompanies, setCreatedCompanies] = useState([]);
  const companySelectRef = useRef(null);

  // Merge prop companies with any newly created companies in this session
  const allAvailableCompanies = useMemo(() => {
    const existingIds = new Set(companies.map(c => String(c.id)));
    const extra = createdCompanies.filter(c => !existingIds.has(String(c.id)));
    return [...extra, ...companies];
  }, [companies, createdCompanies]);

  // Close company dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companySelectRef.current && !companySelectRef.current.contains(event.target)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter companies for modal typeahead search
  const filteredModalCompanies = useMemo(() => {
    const q = companySearchText.toLowerCase().trim();
    if (!q) return allAvailableCompanies.slice(0, 40);
    return allAvailableCompanies.filter(c => {
      const name = (c.name || '').toLowerCase();
      const domain = (c.domain || '').toLowerCase();
      const id = String(c.id || '');
      return name.includes(q) || domain.includes(q) || id.includes(q);
    }).slice(0, 40);
  }, [allAvailableCompanies, companySearchText]);

  // Find currently selected company object
  const selectedCompanyObj = useMemo(() => {
    if (newDealData.companyId) {
      return allAvailableCompanies.find(c => String(c.id) === String(newDealData.companyId)) || null;
    }
    if (newDealData.companyName) {
      return allAvailableCompanies.find(c => (c.name || '').toLowerCase().trim() === newDealData.companyName.toLowerCase().trim()) || null;
    }
    return null;
  }, [allAvailableCompanies, newDealData.companyId, newDealData.companyName]);

  // Real-time quick company duplicate detection
  const quickCompanyTypedName = (quickCompanyData.name || '').trim().toLowerCase();
  const quickCompanyTypedDomain = (quickCompanyData.domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  const quickCompanyExistingMatch = useMemo(() => {
    if (!quickCompanyTypedName && !quickCompanyTypedDomain) return null;
    return allAvailableCompanies.find(c => {
      const cName = (c.name || '').trim().toLowerCase();
      const cDomain = (c.domain || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');
      const isNameMatch = quickCompanyTypedName && (cName === quickCompanyTypedName || (quickCompanyTypedName.length >= 3 && cName.includes(quickCompanyTypedName)));
      const isDomainMatch = quickCompanyTypedDomain && (cDomain === quickCompanyTypedDomain || (quickCompanyTypedDomain.length >= 3 && cDomain.includes(quickCompanyTypedDomain)));
      return isNameMatch || isDomainMatch;
    }) || null;
  }, [allAvailableCompanies, quickCompanyTypedName, quickCompanyTypedDomain]);

  // Open Quick Create Company
  const openQuickCreateCompany = (prefillName = '') => {
    setQuickCompanyData({
      name: prefillName || companySearchText.trim() || '',
      domain: ''
    });
    setQuickCompanyError('');
    setIsQuickCreateCompanyOpen(true);
    setIsCompanyDropdownOpen(false);
  };

  // Quick Create Company Handler
  const handleQuickCreateCompany = async (e) => {
    if (e) e.preventDefault();
    if (!quickCompanyData.name.trim() && !quickCompanyData.domain.trim()) {
      setQuickCompanyError('Please provide a company name or domain.');
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
          domain: quickCompanyData.domain.trim(),
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to create company (HTTP ${res.status})`);
      }

      const newId = String(data.id || data.companyId || (data.company && data.company.id));
      const newlyCreated = {
        id: newId,
        name: quickCompanyData.name.trim() || quickCompanyData.domain.trim(),
        domain: quickCompanyData.domain.trim(),
        lead_source: 'Admin Dashboard',
        createdate: new Date().toISOString()
      };

      setCreatedCompanies(prev => [newlyCreated, ...prev]);
      setNewDealData(prev => ({
        ...prev,
        companyId: newId,
        companyName: newlyCreated.name,
        companyDomain: newlyCreated.domain
      }));
      setIsQuickCreateCompanyOpen(false);
      setIsCompanyDropdownOpen(false);
      setCompanySearchText('');
      setQuickCompanyData({ name: '', domain: '' });

      if (onRefreshCompanies) {
        onRefreshCompanies();
      }
    } catch (err) {
      setQuickCompanyError(err.message || 'Error creating company in HubSpot.');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // Merge prop contacts with any newly created contacts in this session
  const allAvailableContacts = useMemo(() => {
    const existingIds = new Set(contacts.map(c => String(c.id)));
    const extra = createdContacts.filter(c => !existingIds.has(String(c.id)));
    return [...extra, ...contacts];
  }, [contacts, createdContacts]);

  // Close contact dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contactSelectRef.current && !contactSelectRef.current.contains(event.target)) {
        setIsContactDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter contacts for modal typeahead search
  const filteredModalContacts = useMemo(() => {
    const q = contactSearchText.toLowerCase().trim();
    if (!q) return allAvailableContacts.slice(0, 40);
    return allAvailableContacts.filter(c => {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const id = String(c.id || '');
      return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
    }).slice(0, 40);
  }, [allAvailableContacts, contactSearchText]);

  // Find currently selected contact object
  const selectedContactObj = useMemo(() => {
    if (!newDealData.contactId) return null;
    return allAvailableContacts.find(c => String(c.id) === String(newDealData.contactId)) || null;
  }, [allAvailableContacts, newDealData.contactId]);

  // Real-time quick contact duplicate detection
  const quickContactTypedEmail = (quickContactData.email || '').trim().toLowerCase();
  const quickContactTypedName = (quickContactData.name || '').trim().toLowerCase();

  const quickContactExistingMatch = useMemo(() => {
    if (!quickContactTypedEmail && !quickContactTypedName) return null;
    return allAvailableContacts.find(c => {
      const cEmail = (c.email || '').trim().toLowerCase();
      const cName = (c.name || '').trim().toLowerCase();
      const emailMatch = quickContactTypedEmail && cEmail === quickContactTypedEmail;
      const nameMatch = quickContactTypedName && quickContactTypedName.length >= 3 && cName === quickContactTypedName;
      return emailMatch || nameMatch;
    }) || null;
  }, [allAvailableContacts, quickContactTypedEmail, quickContactTypedName]);

  // Open Quick Create modal/form
  const openQuickCreate = (prefillName = '') => {
    setQuickContactData({
      name: prefillName || contactSearchText.trim() || '',
      email: '',
      phone: ''
    });
    setQuickContactError('');
    setIsQuickCreateOpen(true);
    setIsContactDropdownOpen(false);
  };

  // Quick Create Contact Handler
  const handleQuickCreateContact = async (e) => {
    if (e) e.preventDefault();
    if (!quickContactData.name.trim()) {
      setQuickContactError('Please enter a contact name.');
      return;
    }
    if (!quickContactData.email.trim()) {
      setQuickContactError('Please enter an email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(quickContactData.email.trim())) {
      setQuickContactError('Please enter a valid email address format.');
      return;
    }
    if (quickContactData.phone.trim()) {
      const digits = (quickContactData.phone.match(/\d/g) || []).length;
      if (digits < 7 || digits > 15) {
        setQuickContactError('Phone number must contain between 7 and 15 digits.');
        return;
      }
    }

    setIsCreatingContact(true);
    setQuickContactError('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: quickContactData.name.trim(),
          email: quickContactData.email.trim(),
          phone: quickContactData.phone.trim(),
          leadSource: 'Admin Dashboard'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to create contact (HTTP ${res.status})`);
      }

      const newId = String(data.id || data.contactId);
      const newlyCreated = {
        id: newId,
        name: quickContactData.name.trim(),
        email: quickContactData.email.trim(),
        phone: quickContactData.phone.trim(),
        lead_source: 'Admin Dashboard',
        createdate: new Date().toISOString()
      };

      setCreatedContacts(prev => [newlyCreated, ...prev]);
      setNewDealData(prev => ({ ...prev, contactId: newId }));
      setIsQuickCreateOpen(false);
      setIsContactDropdownOpen(false);
      setContactSearchText('');
      setQuickContactData({ name: '', email: '', phone: '' });

      if (onRefreshContacts) {
        onRefreshContacts();
      }
    } catch (err) {
      setQuickContactError(err.message || 'Error creating contact in HubSpot.');
    } finally {
      setIsCreatingContact(false);
    }
  };

  const resetCreateDealModal = () => {
    setShowCreateModal(false);
    setNewDealData({
      dealname: '',
      pipeline: activePipelines[0]?.id || 'default',
      dealstage: activePipelines[0]?.stages[0]?.id || 'appointmentscheduled',
      amount: '',
      closedate: getDefaultCloseDate(),
      hubspot_owner_id: '',
      dealtype: '',
      hs_priority: '',
      contactId: '',
      addContactTimeline: true,
      companyId: '',
      companyName: '',
      companyDomain: '',
      addCompanyTimeline: true,
      lineItem: '',
      quantity: 0
    });
    setContactSearchText('');
    setIsContactDropdownOpen(false);
    setIsQuickCreateOpen(false);
    setQuickContactError('');
    setQuickContactData({ name: '', email: '', phone: '' });

    setCompanySearchText('');
    setIsCompanyDropdownOpen(false);
    setIsQuickCreateCompanyOpen(false);
    setQuickCompanyError('');
    setQuickCompanyData({ name: '', domain: '' });
  };

  const handleCreatePipelineChange = (newPipeId) => {
    const targetPipe = activePipelines.find(p => p.id === newPipeId) || activePipelines[0];
    const firstStage = targetPipe?.stages[0]?.id || 'appointmentscheduled';
    setNewDealData(prev => ({
      ...prev,
      pipeline: newPipeId,
      dealstage: firstStage
    }));
  };

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const pipeLabel = getPipelineLabel(d.pipeline).toLowerCase();
      const matchesQuery =
        !q ||
        (d.dealname && d.dealname.toLowerCase().includes(q)) ||
        (d.pipeline && d.pipeline.toLowerCase().includes(q)) ||
        pipeLabel.includes(q) ||
        (d.dealstage && d.dealstage.toLowerCase().includes(q));

      const matchesPipeline = pipelineFilter === 'ALL' || d.pipeline === pipelineFilter;
      const matchesStage = stageFilter === 'ALL' || d.dealstage === stageFilter;
      const matchesSource = selectedSourceFilter === 'ALL' || getNormalizedSource(d.lead_source, d.created_by) === selectedSourceFilter;

      return matchesQuery && matchesPipeline && matchesStage && matchesSource;
    });
  }, [deals, searchQuery, pipelineFilter, stageFilter, selectedSourceFilter, activePipelines]);

  const totalPages = Math.ceil(filteredDeals.length / pageSize) || 1;
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeals.slice(start, start + pageSize);
  }, [filteredDeals, currentPage, pageSize]);

  // Create Deal submit handler matching HubSpot native drawer
  const handleCreateDealSubmit = async (e, addAnother = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDealData.dealname.trim()) {
      setCreateErrorMsg('Deal name is required.');
      return;
    }

    setIsSubmitting(true);
    setCreateErrorMsg('');
    setCreateSuccessMsg('');

    try {
      // Resolve companyId: use already linked company or create on-the-fly
      let companyId = newDealData.companyId || null;
      if (!companyId && newDealData.companyName.trim()) {
        const compRes = await fetch('/api/companies', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: newDealData.companyName.trim(),
            domain: newDealData.companyDomain.trim(),
            contactId: newDealData.contactId || null
          })
        });
        if (compRes.ok) {
          const compData = await compRes.json();
          companyId = compData.id || compData.company?.id;
        }
      }

      // Create Deal with all HubSpot native properties
      const dealRes = await fetch('/api/deals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dealname: newDealData.dealname.trim(),
          pipeline: newDealData.pipeline || 'default',
          dealstage: newDealData.dealstage || 'appointmentscheduled',
          amount: newDealData.amount || '0',
          closedate: newDealData.closedate || null,
          hubspot_owner_id: newDealData.hubspot_owner_id || null,
          dealtype: newDealData.dealtype || null,
          hs_priority: newDealData.hs_priority || null,
          contactId: newDealData.contactId || null,
          companyId: companyId || null
        })
      });

      const dealData = await dealRes.json().catch(() => ({}));

      if (!dealRes.ok) {
        throw new Error(dealData.error || dealData.message || dealData.details?.message || `Failed to create deal (HTTP ${dealRes.status})`);
      }

      if (addAnother) {
        setCreateSuccessMsg('Deal created successfully! Form reset for next deal.');
        setNewDealData({
          dealname: '',
          pipeline: activePipelines[0]?.id || 'default',
          dealstage: activePipelines[0]?.stages[0]?.id || 'appointmentscheduled',
          amount: '',
          closedate: getDefaultCloseDate(),
          hubspot_owner_id: '',
          dealtype: '',
          hs_priority: '',
          contactId: '',
          addContactTimeline: true,
          companyId: '',
          companyName: '',
          companyDomain: '',
          addCompanyTimeline: true,
          lineItem: '',
          quantity: 0
        });
        setContactSearchText('');
        setCompanySearchText('');
        if (onRefreshDeals) onRefreshDeals();
        if (onRefreshCompanies && companyId) onRefreshCompanies();
        if (onRefreshContacts && newDealData.contactId) onRefreshContacts();
        setTimeout(() => setCreateSuccessMsg(''), 2500);
      } else {
        setCreateSuccessMsg('Deal created successfully in HubSpot CRM!');
        setTimeout(() => {
          setCreateSuccessMsg('');
          setCreateErrorMsg('');
          resetCreateDealModal();
          if (onRefreshDeals) onRefreshDeals();
          if (onRefreshCompanies && companyId) onRefreshCompanies();
          if (onRefreshContacts && newDealData.contactId) onRefreshContacts();
        }, 1400);
      }
    } catch (err) {
      setCreateErrorMsg(err.message || 'Something went wrong creating the deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in font-sans flex flex-col h-full min-h-0">
      {/* Top Controls Bar */}
      <div className="bg-white p-3.5 sm:px-5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by name, pipeline, or stage..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pipeline Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={pipelineFilter}
              onChange={(e) => {
                setPipelineFilter(e.target.value);
                setStageFilter('ALL');
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Pipelines ({activePipelines.length})</option>
              {activePipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Deal Stages</option>
              {(pipelineFilter === 'ALL'
                ? activePipelines.flatMap(p => p.stages || [])
                : activePipelines.find(p => p.id === pipelineFilter)?.stages || []
              ).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSourceFilter}
              onChange={(e) => {
                setSelectedSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="Bridge Portal">Bridge Portal</option>
              <option value="Website Form">Website Form</option>
              <option value="HubSpot Webhook">HubSpot Webhook</option>
              <option value="HubSpot Direct">HubSpot Direct</option>
            </select>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create HubSpot Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col flex-1 min-h-0">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-[#EE3124] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading deals from HubSpot CRM...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-2xl m-4 space-y-2">
            <p className="text-sm font-bold">Failed to load deals: {error}</p>
          </div>
        )}

        {!loading && !error && filteredDeals.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {!isSuperAdmin ? 'No self-created deals found' : 'No HubSpot deals found'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {!isSuperAdmin 
                ? 'Only deals created by your account are displayed in this view. Create your first deal to start tracking your sales pipeline.'
                : 'Create a new deal or associate deals with contacts/companies.'
              }
            </p>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white text-xs font-bold shadow-md shadow-orange-600/20 cursor-pointer"
              >
                + Create First Deal
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredDeals.length > 0 && (
          <>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Deal Name</th>
                    <th className="px-4 py-3 font-extrabold">Pipeline</th>
                    <th className="px-4 py-3 font-extrabold">Deal Stage</th>
                    <th className="px-4 py-3 font-extrabold">Amount</th>
                    <th className="px-4 py-3 font-extrabold">Source</th>
                    <th className="px-4 py-3 font-extrabold">Created By</th>
                    <th className="px-4 py-3 font-extrabold">Created Date</th>
                    <th className="px-4 py-3 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedDeals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="truncate max-w-[200px] font-extrabold block text-slate-900 text-xs sm:text-sm">{d.dealname || '—'}</span>
                            <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[180px]">
                              {d.id ? `ID #${d.id}` : 'HubSpot Sales Pipeline'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80 whitespace-nowrap inline-flex items-center">
                          {getPipelineLabel(d.pipeline)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStageBadge(d.dealstage, d.pipeline)}
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-emerald-600 font-mono text-xs sm:text-sm">
                        ${Number(d.amount || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getSourceBadge(d.lead_source, d.created_by)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getCreatorBadge(d.created_by)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-xs font-medium whitespace-nowrap">
                        {d.createdate ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-700">{new Date(d.createdate).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">{new Date(d.createdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          {canEdit || canDelete ? (
                            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100/80 border border-slate-200/80 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                              {canEdit && (
                                <button
                                  onClick={() => handleStartEditDeal(d)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-amber-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn cursor-pointer"
                                  title="Edit Deal"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-600 transition-colors" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {canEdit && canDelete && (
                                <div className="w-px h-3 bg-slate-200/80 my-auto" />
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => {
                                    setDeletingDeal(d);
                                    setActionError('');
                                    setActionSuccess('');
                                  }}
                                  className="inline-flex items-center p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn cursor-pointer"
                                  title="Delete Deal"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-rose-600 transition-colors" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs font-medium px-2 py-1">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="shrink-0 px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <div className="flex items-center gap-3">
                <div>
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredDeals.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredDeals.length}</span> entries
                </div>
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE HUBSPOT DEAL DRAWER (Strictly matching HubSpot Screenshot 3) */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={resetCreateDealModal}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in" 
          />

          {/* Right Slide-over Panel matching HubSpot */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-xl md:max-w-[560px] bg-white shadow-2xl flex flex-col z-[10000] border-l border-slate-200 animate-slide-left">
            
            {/* Drawer Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <h2 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">Create Deal</h2>
              <button
                type="button"
                onClick={resetCreateDealModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {createSuccessMsg ? (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-2.5 border border-emerald-200 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{createSuccessMsg}</span>
                </div>
              ) : (
                <form id="create-deal-form" onSubmit={(e) => handleCreateDealSubmit(e, false)} className="space-y-4 text-xs sm:text-sm">
                  {createErrorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200 flex items-start gap-2.5 animate-shake">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{createErrorMsg}</span>
                    </div>
                  )}

                  {/* 1. Deal name * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Deal name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder=""
                      value={newDealData.dealname}
                      onChange={(e) => {
                        setNewDealData({ ...newDealData, dealname: e.target.value });
                        if (createErrorMsg) setCreateErrorMsg('');
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm font-medium"
                    />
                  </div>

                  {/* 2. Pipeline * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Pipeline *
                    </label>
                    <div className="relative">
                      <select
                        value={newDealData.pipeline}
                        onChange={(e) => handleCreatePipelineChange(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm pr-9"
                      >
                        {activePipelines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. Deal stage * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Deal stage *
                    </label>
                    <div className="relative">
                      <select
                        value={newDealData.dealstage}
                        onChange={(e) => setNewDealData({ ...newDealData, dealstage: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm pr-9"
                      >
                        {(activePipelines.find(p => p.id === newDealData.pipeline)?.stages || activePipelines[0]?.stages || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 4. Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder=""
                      value={newDealData.amount}
                      onChange={(e) => setNewDealData({ ...newDealData, amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                    />
                  </div>

                  {/* 5. Close date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Close date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={newDealData.closedate}
                        onChange={(e) => setNewDealData({ ...newDealData, closedate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* 6. Deal owner */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Deal owner
                    </label>
                    <div className="relative">
                      <select
                        value={newDealData.hubspot_owner_id}
                        onChange={(e) => setNewDealData({ ...newDealData, hubspot_owner_id: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm pr-9"
                      >
                        <option value="">Hub Dev</option>
                        {owners.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email} {o.email ? `(${o.email})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 7. Deal type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Deal type
                    </label>
                    <div className="relative">
                      <select
                        value={newDealData.dealtype}
                        onChange={(e) => setNewDealData({ ...newDealData, dealtype: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm pr-9"
                      >
                        <option value=""></option>
                        {dealTypes.filter(dt => dt.value).map((dt) => (
                          <option key={dt.value} value={dt.value}>
                            {dt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 8. Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        value={newDealData.hs_priority}
                        onChange={(e) => setNewDealData({ ...newDealData, hs_priority: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm pr-9"
                      >
                        <option value=""></option>
                        {dealPriorities.filter(dp => dp.value).map((dp) => (
                          <option key={dp.value} value={dp.value}>
                            {dp.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* SECTION: Associate Deal with */}
                  <div className="pt-3 pb-1 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">
                      Associate Deal with
                    </h3>

                    {/* Contact Association */}
                    <div className="space-y-1.5 mb-3" ref={contactSelectRef}>
                      <label className="block text-xs font-bold text-slate-800">
                        Contact
                      </label>

                      {/* Quick Create Contact Inline */}
                      {isQuickCreateOpen ? (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in shadow-2xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-900">Create & Link New Contact</span>
                            <button
                              type="button"
                              onClick={() => setIsQuickCreateOpen(false)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {quickContactError && (
                            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                              {quickContactError}
                            </div>
                          )}

                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Full Name *"
                              value={quickContactData.name}
                              onChange={(e) => setQuickContactData({ ...quickContactData, name: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00A389] focus:border-[#00A389]"
                            />
                            <input
                              type="email"
                              placeholder="Email Address *"
                              value={quickContactData.email}
                              onChange={(e) => setQuickContactData({ ...quickContactData, email: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00A389] focus:border-[#00A389]"
                            />
                            <input
                              type="text"
                              placeholder="Phone Number (optional)"
                              value={quickContactData.phone}
                              onChange={(e) => setQuickContactData({ ...quickContactData, phone: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00A389] focus:border-[#00A389]"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsQuickCreateOpen(false)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isCreatingContact}
                              onClick={handleQuickCreateContact}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#00A389] hover:bg-[#008f77] shadow-xs cursor-pointer"
                            >
                              {isCreatingContact ? 'Creating...' : 'Create & Link'}
                            </button>
                          </div>
                        </div>
                      ) : selectedContactObj && !isContactDropdownOpen ? (
                        /* Selected Contact Display */
                        <div className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 truncate">
                              {selectedContactObj.name || selectedContactObj.email}
                            </span>
                            {selectedContactObj.email && (
                              <span className="text-slate-400 text-xs truncate">
                                ({selectedContactObj.email})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setIsContactDropdownOpen(true);
                                setContactSearchText('');
                              }}
                              className="text-xs font-bold text-[#00A389] hover:underline px-2 py-1 cursor-pointer"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewDealData(prev => ({ ...prev, contactId: '' }));
                                setContactSearchText('');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Search / Dropdown Input */
                        <div className="relative">
                          <div className="relative">
                            <input
                              type="text"
                              value={contactSearchText}
                              onChange={(e) => {
                                setContactSearchText(e.target.value);
                                if (!isContactDropdownOpen) setIsContactDropdownOpen(true);
                              }}
                              onFocus={() => setIsContactDropdownOpen(true)}
                              placeholder="Search"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm pr-9"
                            />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Dropdown Menu */}
                          {isContactDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto p-1 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewDealData(prev => ({ ...prev, contactId: '' }));
                                  setIsContactDropdownOpen(false);
                                  setContactSearchText('');
                                }}
                                className="w-full px-3 py-2 rounded-lg text-left text-slate-500 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                              >
                                <span>No Contact (Skip association)</span>
                              </button>

                              {filteredModalContacts.length === 0 ? (
                                <div className="py-3 px-3 text-center space-y-2">
                                  <div className="text-slate-500">No contact found</div>
                                  <button
                                    type="button"
                                    onClick={() => openQuickCreate(contactSearchText)}
                                    className="px-3 py-1.5 rounded-full bg-[#00A389] text-white text-xs font-bold hover:bg-[#008f77] mx-auto cursor-pointer"
                                  >
                                    + Create & Link Contact
                                  </button>
                                </div>
                              ) : (
                                filteredModalContacts.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setNewDealData(prev => ({ ...prev, contactId: c.id }));
                                      setIsContactDropdownOpen(false);
                                      setContactSearchText('');
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-left hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 truncate">{c.name || 'Unnamed'}</div>
                                      <div className="text-[11px] text-slate-500 truncate">{c.email || 'No email'}</div>
                                    </div>
                                    {String(newDealData.contactId) === String(c.id) && (
                                      <Check className="w-4 h-4 text-[#00A389] shrink-0" />
                                    )}
                                  </button>
                                ))
                              )}

                              <div className="pt-1 mt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => openQuickCreate(contactSearchText)}
                                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-[#00A389] hover:bg-[#00A389]/10 cursor-pointer"
                                >
                                  + Create New Contact
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Add timeline activity checkbox */}
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={newDealData.addContactTimeline}
                          onChange={(e) => setNewDealData({ ...newDealData, addContactTimeline: e.target.checked })}
                          className="rounded text-[#00A389] focus:ring-[#00A389] border-slate-300 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="flex items-center gap-1">
                          <span>Add timeline activity from this Contact</span>
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      </label>
                    </div>

                    {/* Company Association */}
                    <div className="space-y-1.5 mb-3" ref={companySelectRef}>
                      <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                        <span>Company</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </label>

                      {/* Quick Create Company Inline */}
                      {isQuickCreateCompanyOpen ? (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in shadow-2xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-900">Create & Link New Company</span>
                            <button
                              type="button"
                              onClick={() => setIsQuickCreateCompanyOpen(false)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {quickCompanyError && (
                            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                              {quickCompanyError}
                            </div>
                          )}

                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Company Name *"
                              value={quickCompanyData.name}
                              onChange={(e) => setQuickCompanyData({ ...quickCompanyData, name: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00A389] focus:border-[#00A389]"
                            />
                            <input
                              type="text"
                              placeholder="Domain (e.g. acme.com)"
                              value={quickCompanyData.domain}
                              onChange={(e) => setQuickCompanyData({ ...quickCompanyData, domain: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00A389] focus:border-[#00A389]"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsQuickCreateCompanyOpen(false)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isCreatingCompany}
                              onClick={handleQuickCreateCompany}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#00A389] hover:bg-[#008f77] shadow-xs cursor-pointer"
                            >
                              {isCreatingCompany ? 'Creating...' : 'Create & Link'}
                            </button>
                          </div>
                        </div>
                      ) : selectedCompanyObj && !isCompanyDropdownOpen ? (
                        /* Selected Company Display */
                        <div className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 truncate">
                              {selectedCompanyObj.name || selectedCompanyObj.domain}
                            </span>
                            {selectedCompanyObj.domain && selectedCompanyObj.domain !== '—' && (
                              <span className="text-slate-400 text-xs truncate">
                                ({selectedCompanyObj.domain})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCompanyDropdownOpen(true);
                                setCompanySearchText('');
                              }}
                              className="text-xs font-bold text-[#00A389] hover:underline px-2 py-1 cursor-pointer"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewDealData(prev => ({ ...prev, companyId: '', companyName: '', companyDomain: '' }));
                                setCompanySearchText('');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Search / Dropdown Input */
                        <div className="relative">
                          <div className="relative">
                            <input
                              type="text"
                              value={companySearchText}
                              onChange={(e) => {
                                setCompanySearchText(e.target.value);
                                if (!isCompanyDropdownOpen) setIsCompanyDropdownOpen(true);
                              }}
                              onFocus={() => setIsCompanyDropdownOpen(true)}
                              placeholder="Search"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm pr-9"
                            />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Dropdown Menu */}
                          {isCompanyDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto p-1 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewDealData(prev => ({ ...prev, companyId: '', companyName: '', companyDomain: '' }));
                                  setIsCompanyDropdownOpen(false);
                                  setCompanySearchText('');
                                }}
                                className="w-full px-3 py-2 rounded-lg text-left text-slate-500 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                              >
                                <span>No Company (Skip association)</span>
                              </button>

                              {filteredModalCompanies.length === 0 ? (
                                <div className="py-3 px-3 text-center space-y-2">
                                  <div className="text-slate-500">No company found</div>
                                  <button
                                    type="button"
                                    onClick={() => openQuickCreateCompany(companySearchText)}
                                    className="px-3 py-1.5 rounded-full bg-[#00A389] text-white text-xs font-bold hover:bg-[#008f77] mx-auto cursor-pointer"
                                  >
                                    + Create & Link Company
                                  </button>
                                </div>
                              ) : (
                                filteredModalCompanies.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setNewDealData(prev => ({
                                        ...prev,
                                        companyId: c.id,
                                        companyName: c.name || '',
                                        companyDomain: c.domain || ''
                                      }));
                                      setIsCompanyDropdownOpen(false);
                                      setCompanySearchText('');
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-left hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 truncate">{c.name || 'Unnamed'}</div>
                                      <div className="text-[11px] text-slate-500 truncate">{c.domain || 'No domain'}</div>
                                    </div>
                                    {String(newDealData.companyId) === String(c.id) && (
                                      <Check className="w-4 h-4 text-[#00A389] shrink-0" />
                                    )}
                                  </button>
                                ))
                              )}

                              <div className="pt-1 mt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => openQuickCreateCompany(companySearchText)}
                                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-[#00A389] hover:bg-[#00A389]/10 cursor-pointer"
                                >
                                  + Create New Company
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Add timeline activity checkbox */}
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={newDealData.addCompanyTimeline}
                          onChange={(e) => setNewDealData({ ...newDealData, addCompanyTimeline: e.target.checked })}
                          className="rounded text-[#00A389] focus:ring-[#00A389] border-slate-300 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="flex items-center gap-1">
                          <span>Add timeline activity from this Company</span>
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      </label>
                    </div>

                    {/* Add line item & Quantity Row matching Screenshot 3 */}
                    <div className="grid grid-cols-[1fr_90px] gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Add line item
                        </label>
                        <div className="relative">
                          <select
                            value={newDealData.lineItem}
                            onChange={(e) => setNewDealData({ ...newDealData, lineItem: e.target.value })}
                            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm pr-9"
                          >
                            <option value="">Add a line item</option>
                            <option value="standard_pkg">Standard Implementation Package</option>
                            <option value="enterprise_lic">Enterprise License (Annual)</option>
                            <option value="pro_services">Professional Services (Hourly)</option>
                            <option value="support_plan">Support & Maintenance Plan</option>
                            <option value="custom_integration">Custom Integration Service</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newDealData.quantity}
                          onChange={(e) => setNewDealData({ ...newDealData, quantity: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm text-center"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Fixed Drawer Footer matching Screenshot 3 */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-2.5 shrink-0">
              {(() => {
                const isBlocked = !newDealData.dealname.trim() || isSubmitting;
                return (
                  <>
                    <button
                      type="submit"
                      form="create-deal-form"
                      disabled={isBlocked}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        isBlocked
                          ? 'bg-[#f5f8fa] text-[#b0c1d4] border border-[#cbd6e2] cursor-not-allowed'
                          : 'bg-[#00A389] hover:bg-[#008f77] text-white shadow-xs cursor-pointer'
                      }`}
                    >
                      {isSubmitting ? 'Creating...' : 'Create'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCreateDealSubmit(e, true)}
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
                      onClick={resetCreateDealModal}
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

      {/* Edit Deal Modal */}
      {editingDeal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[88vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#00A389]/10 text-[#00A389] flex items-center justify-center border border-[#00A389]/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit HubSpot Deal</h3>
                  <p className="text-xs text-slate-500 font-medium">Update deal details in HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDeal(null)}
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
              <form onSubmit={handleSaveDealEdit} className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Deal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Deal Name"
                    value={editDealData.dealname}
                    onChange={(e) => setEditDealData({ ...editDealData, dealname: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Pipeline *
                    </label>
                    <select
                      value={editDealData.pipeline}
                      onChange={(e) => handleEditPipelineChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer"
                    >
                      {activePipelines.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Deal Stage *
                    </label>
                    <select
                      value={editDealData.dealstage}
                      onChange={(e) => setEditDealData({ ...editDealData, dealstage: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer"
                    >
                      {(activePipelines.find(p => p.id === editDealData.pipeline)?.stages || activePipelines[0]?.stages || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={editDealData.amount}
                      onChange={(e) => setEditDealData({ ...editDealData, amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Close Date
                    </label>
                    <input
                      type="date"
                      value={editDealData.closedate}
                      onChange={(e) => setEditDealData({ ...editDealData, closedate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Deal Owner
                    </label>
                    <select
                      value={editDealData.hubspot_owner_id}
                      onChange={(e) => setEditDealData({ ...editDealData, hubspot_owner_id: e.target.value })}
                      className="w-full px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs"
                    >
                      <option value="">Hub Dev</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name || o.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Deal Type
                    </label>
                    <select
                      value={editDealData.dealtype}
                      onChange={(e) => setEditDealData({ ...editDealData, dealtype: e.target.value })}
                      className="w-full px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs"
                    >
                      <option value=""></option>
                      {dealTypes.filter(dt => dt.value).map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Priority
                    </label>
                    <select
                      value={editDealData.hs_priority}
                      onChange={(e) => setEditDealData({ ...editDealData, hs_priority: e.target.value })}
                      className="w-full px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs"
                    >
                      <option value=""></option>
                      {dealPriorities.filter(dp => dp.value).map((dp) => (
                        <option key={dp.value} value={dp.value}>
                          {dp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDeal(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-2xl bg-[#00A389] hover:bg-[#008f77] text-white text-xs font-bold shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Delete Deal Modal */}
      {deletingDeal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Delete Deal</h3>
                  <p className="text-xs text-slate-500 font-medium">Remove deal from HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingDeal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
                  Are you sure you want to delete deal <strong className="text-slate-900">{deletingDeal.dealname}</strong> from HubSpot CRM? This action cannot be undone.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingDeal(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteDeal}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Deal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


