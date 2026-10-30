import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSourceBadge, getCreatorBadge, getNormalizedSource } from './ContactsView';
import { 
  Building2, 
  Search, 
  Plus, 
  Globe, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  Copy, 
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Edit3,
  Trash2,
  AlertTriangle,
  User,
  Briefcase,
  Layers,
  MapPin,
  Clock,
  DollarSign,
  Users,
  FileText,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function LinkedInIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6H9.2v-7.6H6.46M7.83 6.64a1.66 1.66 0 1 0 1.66 1.66 1.66 1.66 0 0 0-1.66-1.66Z" />
    </svg>
  );
}

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

const initialCompanyForm = {
  domain: '',
  name: '',
  hubspot_owner_id: '',
  industry: '',
  type: '',
  city: '',
  state: '',
  zip: '',
  numberofemployees: '',
  annualrevenue: '',
  timezone: '',
  description: '',
  linkedin_company_page: '',
};

export default function CompaniesView({
  companies = [],
  loading = false,
  error = null,
  onRefreshCompanies,
  adminKey
}) {
  const { getAuthHeaders, can } = useAuth();
  const canCreate = can('create', 'companies');
  const canEdit = can('edit', 'companies');
  const canDelete = can('delete', 'companies');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState(initialCompanyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Metadata from HubSpot
  const [owners, setOwners] = useState([]);
  const [companyTypes, setCompanyTypes] = useState(DEFAULT_COMPANY_TYPES);
  const [companyIndustries, setCompanyIndustries] = useState(DEFAULT_COMPANY_INDUSTRIES);

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
          if (Array.isArray(propData.companyTypes) && propData.companyTypes.length > 0) {
            setCompanyTypes(propData.companyTypes);
          }
          if (Array.isArray(propData.companyIndustries) && propData.companyIndustries.length > 0) {
            setCompanyIndustries(propData.companyIndustries);
          }
        }
      } catch {
        // Fallbacks remain active
      }
    }
    fetchMetadata();
    return () => { isMounted = false; };
  }, []);

  // Edit & Delete state
  const [editingCompany, setEditingCompany] = useState(null);
  const [editCompanyData, setEditCompanyData] = useState(initialCompanyForm);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState('');

  // Real-time duplicate detection
  const typedName = (newCompanyData.name || '').trim().toLowerCase();
  const typedDomain = (newCompanyData.domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '');

  const exactMatchingDomainCompany = useMemo(() => {
    if (!typedDomain || typedDomain.length < 3) return null;
    return companies.find(c => {
      const cDomain = (c.domain || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/, '');
      return cDomain === typedDomain;
    }) || null;
  }, [companies, typedDomain]);

  const exactMatchingNameCompany = useMemo(() => {
    if (!typedName || typedName.length < 2) return null;
    return companies.find(c => {
      const cName = (c.name || '').trim().toLowerCase();
      return cName === typedName;
    }) || null;
  }, [companies, typedName]);

  const exactMatchingCompany = exactMatchingDomainCompany || exactMatchingNameCompany;

  const handleStartEdit = (c) => {
    setEditingCompany(c);
    setEditCompanyData({
      name: c.name || '',
      domain: c.domain && c.domain !== '—' ? c.domain : '',
      hubspot_owner_id: c.hubspot_owner_id || '',
      industry: c.industry || '',
      type: c.type || '',
      city: c.city || '',
      state: c.state || '',
      zip: c.zip || '',
      numberofemployees: c.numberofemployees || '',
      annualrevenue: c.annualrevenue || '',
      timezone: c.timezone || '',
      description: c.description || '',
      linkedin_company_page: c.linkedin_company_page || '',
    });
    setActionError('');
    setActionSuccess('');
  };

  const handleSaveCompanyEdit = async (e) => {
    e.preventDefault();
    if (!editingCompany || (!editCompanyData.name.trim() && !editCompanyData.domain.trim())) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/companies', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingCompany.id,
          name: editCompanyData.name.trim(),
          domain: editCompanyData.domain.trim(),
          hubspot_owner_id: editCompanyData.hubspot_owner_id || '',
          industry: editCompanyData.industry || '',
          type: editCompanyData.type || '',
          city: editCompanyData.city.trim(),
          state: editCompanyData.state.trim(),
          zip: editCompanyData.zip.trim(),
          numberofemployees: editCompanyData.numberofemployees,
          annualrevenue: editCompanyData.annualrevenue,
          timezone: editCompanyData.timezone.trim(),
          description: editCompanyData.description.trim(),
          linkedin_company_page: editCompanyData.linkedin_company_page.trim(),
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update company in HubSpot.');
      }

      setActionSuccess('Company updated successfully in HubSpot CRM!');
      setTimeout(() => {
        setEditingCompany(null);
        setActionSuccess('');
        if (onRefreshCompanies) onRefreshCompanies();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error updating company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/companies?id=${deletingCompany.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to delete company from HubSpot.');
      }

      setActionSuccess('Company deleted successfully!');
      setTimeout(() => {
        setDeletingCompany(null);
        setActionSuccess('');
        if (onRefreshCompanies) onRefreshCompanies();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error deleting company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.domain && c.domain.toLowerCase().includes(q));

      const matchesSource =
        selectedSourceFilter === 'ALL' || getNormalizedSource(c.lead_source, c.created_by) === selectedSourceFilter;

      return matchesQuery && matchesSource;
    });
  }, [companies, searchQuery, selectedSourceFilter]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const handleCopyDomain = (domain, id) => {
    navigator.clipboard.writeText(domain);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateCompanySubmit = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!newCompanyData.name.trim() && !newCompanyData.domain.trim()) {
      setCreateErrorMsg('Company name or domain name is required.');
      return;
    }

    if (exactMatchingCompany) {
      setCreateErrorMsg(`A company with this ${exactMatchingDomainCompany ? 'domain' : 'name'} already exists in HubSpot CRM (${exactMatchingCompany.name}, ID #${exactMatchingCompany.id}). Duplicate creation is blocked.`);
      return;
    }

    setIsSubmitting(true);
    setCreateErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          domain: newCompanyData.domain.trim(),
          name: newCompanyData.name.trim(),
          hubspot_owner_id: newCompanyData.hubspot_owner_id || '',
          industry: newCompanyData.industry || '',
          type: newCompanyData.type || '',
          city: newCompanyData.city.trim(),
          state: newCompanyData.state.trim(),
          zip: newCompanyData.zip.trim(),
          numberofemployees: newCompanyData.numberofemployees,
          annualrevenue: newCompanyData.annualrevenue,
          timezone: newCompanyData.timezone.trim(),
          description: newCompanyData.description.trim(),
          linkedin_company_page: newCompanyData.linkedin_company_page.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || 'A company with this domain or name already exists in HubSpot CRM.');
        }
        throw new Error(data.error || data.message || `Failed to create company (HTTP ${res.status})`);
      }

      setSuccessMsg('Company created successfully in HubSpot CRM!');
      if (onRefreshCompanies) onRefreshCompanies();

      if (addAnother) {
        setTimeout(() => {
          setSuccessMsg('');
          setNewCompanyData(initialCompanyForm);
        }, 1200);
      } else {
        setTimeout(() => {
          setSuccessMsg('');
          setCreateErrorMsg('');
          setShowCreateModal(false);
          setNewCompanyData(initialCompanyForm);
        }, 1200);
      }
    } catch (err) {
      setCreateErrorMsg(err.message || 'Something went wrong creating the company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in font-sans flex flex-col h-full min-h-0">
      {/* Controls Bar */}
      <div className="bg-white p-3.5 sm:px-5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies by name or domain..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
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
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create HubSpot Company</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col flex-1 min-h-0">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-[#EE3124] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading companies from HubSpot CRM...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-2xl m-4 space-y-2">
            <p className="text-sm font-bold">Failed to load companies: {error}</p>
          </div>
        )}

        {!loading && !error && filteredCompanies.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No HubSpot companies found</p>
            <p className="text-xs text-slate-500">
              Create a new company or submit a contact with company details.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white text-xs font-bold"
            >
              + Create First Company
            </button>
          </div>
        )}

        {!loading && !error && filteredCompanies.length > 0 && (
          <>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Company Name</th>
                    <th className="px-4 py-3 font-extrabold">Domain Name</th>
                    <th className="px-4 py-3 font-extrabold">Source</th>
                    <th className="px-4 py-3 font-extrabold">Created By</th>
                    <th className="px-4 py-3 font-extrabold">Created Date</th>
                    <th className="px-4 py-3 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-50 to-amber-50 text-[#EE3124] flex items-center justify-center shrink-0 border border-orange-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="truncate max-w-[220px] font-extrabold block text-slate-900 text-xs sm:text-sm">{c.name || '—'}</span>
                            <span className="text-[11px] text-slate-400 font-medium block truncate max-w-[200px]">
                              {c.industry ? c.industry.replace(/_/g, ' ') : (c.city && c.state ? `${c.city}, ${c.state}` : (c.city || 'HubSpot Organization'))}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {c.domain && c.domain !== '—' ? (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={c.domain.startsWith('http') ? c.domain : `https://${c.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#EE3124] hover:underline font-mono text-xs font-bold truncate max-w-[170px]"
                            >
                              {c.domain}
                            </a>
                            <button
                              onClick={() => handleCopyDomain(c.domain, c.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Copy domain"
                            >
                              {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getSourceBadge(c.lead_source, c.created_by)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getCreatorBadge(c.created_by)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-xs font-medium whitespace-nowrap">
                        {c.createdate ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-700">{new Date(c.createdate).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">{new Date(c.createdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          {(() => {
                            const hasVisit = Boolean(c.domain && c.domain !== '—');
                            const hasActions = hasVisit || canEdit || canDelete;

                            if (!hasActions) {
                              return <span className="text-slate-400 font-mono text-xs font-medium px-2 py-1">—</span>;
                            }

                            return (
                              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100/80 border border-slate-200/80 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                                {hasVisit && (
                                  <a
                                    href={c.domain.startsWith('http') ? c.domain : `https://${c.domain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-[#EE3124] hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                    title="Visit Website"
                                  >
                                    <span>Visit</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover/btn:text-[#EE3124] transition-colors" />
                                  </a>
                                )}

                                {hasVisit && (canEdit || canDelete) && (
                                  <div className="w-px h-3 bg-slate-200/80 my-auto" />
                                )}

                                {canEdit && (
                                  <button
                                    onClick={() => handleStartEdit(c)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-amber-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn cursor-pointer"
                                    title="Edit Company"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-600 transition-colors" />
                                    <span className="hidden xl:inline">Edit</span>
                                  </button>
                                )}

                                {canEdit && canDelete && (
                                  <div className="w-px h-3 bg-slate-200/80 my-auto" />
                                )}

                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setDeletingCompany(c);
                                      setActionError('');
                                      setActionSuccess('');
                                    }}
                                    className="inline-flex items-center p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn cursor-pointer"
                                    title="Delete Company"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-rose-600 transition-colors" />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
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
                    {Math.min(currentPage * pageSize, filteredCompanies.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredCompanies.length}</span> entries
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

      {/* Drawer to Create New Company - HubSpot CRM Form */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={() => {
              setShowCreateModal(false);
              setNewCompanyData(initialCompanyForm);
            }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in" 
          />

          {/* Right Slide-over Panel matching HubSpot */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-xl md:max-w-[560px] bg-white shadow-2xl flex flex-col z-[10000] border-l border-slate-200 animate-slide-left">
            
            {/* Drawer Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <h2 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">Create Company</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCompanyData(initialCompanyForm);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {successMsg ? (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-2.5 border border-emerald-200 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              ) : (
                <form id="create-company-form" onSubmit={(e) => handleCreateCompanySubmit(e, false)} className="space-y-4 text-xs sm:text-sm">
                  {createErrorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200 flex items-start gap-2.5 animate-shake">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{createErrorMsg}</span>
                    </div>
                  )}

                  {/* 1. Company Domain Name (Primary identifier in HubSpot) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Company domain name
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder=""
                        value={newCompanyData.domain}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, domain: e.target.value })}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                          exactMatchingDomainCompany 
                            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30' 
                            : 'border-slate-300 focus:ring-[#00A389]/20 focus:border-[#00A389]'
                        }`}
                      />
                      {newCompanyData.domain && (
                        <Globe className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>

                    {/* Real-time duplicate domain warning card */}
                    {exactMatchingDomainCompany && (
                      <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50/95 border border-amber-300 space-y-2.5 animate-fade-in shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                Domain Already Exists in HubSpot CRM
                              </span>
                              <p className="text-[11px] text-amber-800 font-medium">
                                Duplicate creation is blocked to protect CRM data integrity.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-amber-400 shrink-0 font-mono">
                            ID #{exactMatchingDomainCompany.id}
                          </span>
                        </div>

                        <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-800 min-w-0">
                            <div className="font-extrabold truncate text-slate-900 flex items-center gap-2">
                              <span>{exactMatchingDomainCompany.name}</span>
                              {exactMatchingDomainCompany.type && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                  {exactMatchingDomainCompany.type}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                              {exactMatchingDomainCompany.domain} {exactMatchingDomainCompany.createdate ? `• Created ${new Date(exactMatchingDomainCompany.createdate).toLocaleDateString()}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateModal(false);
                              handleStartEdit(exactMatchingDomainCompany);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>View / Edit Existing</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Company Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Company name
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder=""
                      value={newCompanyData.name}
                      onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                        exactMatchingNameCompany && !exactMatchingDomainCompany
                          ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30' 
                          : 'border-slate-300 focus:ring-[#00A389]/20 focus:border-[#00A389]'
                      }`}
                    />

                    {exactMatchingNameCompany && !exactMatchingDomainCompany && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs animate-fade-in">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Company with name "{exactMatchingNameCompany.name}" already exists (ID #{exactMatchingNameCompany.id})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateModal(false);
                            handleStartEdit(exactMatchingNameCompany);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] shrink-0"
                        >
                          Edit Existing
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Progressive Disclosure Section (Locked/Overlay until Domain or Name is entered) */}
                  <div className="relative pt-1">
                    {/* Centered Overlay Prompt matching HubSpot Screenshot 1 */}
                    {!newCompanyData.domain.trim() && !newCompanyData.name.trim() && (
                      <div className="absolute inset-0 z-20 flex items-start justify-center pt-24 pointer-events-none select-none px-4">
                        <div className="text-center max-w-[280px]">
                          <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            Start by entering a domain name, an account name, or both.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lower Fields: Company owner, Industry, Type, etc. */}
                    <div className={`space-y-4 transition-all duration-200 ${
                      !newCompanyData.domain.trim() && !newCompanyData.name.trim() 
                        ? 'opacity-25 pointer-events-none select-none' 
                        : 'opacity-100'
                    }`}>
                      {/* 3. Company Owner */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Company owner
                        </label>
                        <select
                          value={newCompanyData.hubspot_owner_id}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, hubspot_owner_id: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          <option value="">Hub Dev</option>
                          {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email} {o.email ? `(${o.email})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Industry */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Industry
                        </label>
                        <select
                          value={newCompanyData.industry}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, industry: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          {companyIndustries.map((ind) => (
                            <option key={ind.value} value={ind.value}>
                              {ind.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 5. Type */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Type
                        </label>
                        <select
                          value={newCompanyData.type}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, type: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          {companyTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 6. City */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          City
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={newCompanyData.city}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, city: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                        />
                      </div>

                      {/* 7. State/Region */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          State/Region
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={newCompanyData.state}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, state: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                        />
                      </div>

                      {/* 8. Postal code */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Postal code
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={newCompanyData.zip}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, zip: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                        />
                      </div>

                      {/* 9. Number of employees */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Number of employees
                        </label>
                        <input
                          type="number"
                          placeholder=""
                          value={newCompanyData.numberofemployees}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, numberofemployees: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                        />
                      </div>

                      {/* 10. Annual revenue */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Annual revenue
                        </label>
                        <input
                          type="number"
                          placeholder=""
                          value={newCompanyData.annualrevenue}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, annualrevenue: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                        />
                      </div>

                      {/* 11. Time zone */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Time zone
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={newCompanyData.timezone}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, timezone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                        />
                      </div>

                      {/* 12. Description */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          placeholder=""
                          value={newCompanyData.description}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, description: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all resize-y text-xs sm:text-sm"
                        />
                      </div>

                      {/* 13. LinkedIn company page */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          LinkedIn company page
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            placeholder=""
                            value={newCompanyData.linkedin_company_page}
                            onChange={(e) => setNewCompanyData({ ...newCompanyData, linkedin_company_page: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] transition-all text-xs sm:text-sm"
                          />
                          <LinkedInIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Fixed Drawer Footer matching HubSpot Screenshot 1 */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-2.5 shrink-0">
              {(() => {
                const isPrimaryFilled = Boolean(newCompanyData.domain.trim() || newCompanyData.name.trim());
                const isBlocked = isSubmitting || Boolean(exactMatchingCompany) || !isPrimaryFilled;

                return (
                  <>
                    <button
                      type="submit"
                      form="create-company-form"
                      disabled={isBlocked}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        isBlocked
                          ? 'bg-[#f5f8fa] text-[#b0c1d4] border border-[#cbd6e2] cursor-not-allowed'
                          : 'bg-[#00A389] hover:bg-[#008f77] text-white shadow-xs cursor-pointer'
                      }`}
                    >
                      {isSubmitting ? 'Creating...' : exactMatchingCompany ? 'Duplicate Blocked' : 'Create'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCreateCompanySubmit(e, true)}
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
                        setShowCreateModal(false);
                        setNewCompanyData(initialCompanyForm);
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

      {/* Edit Company Modal - Full 13 HubSpot Properties */}
      {editingCompany && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200/90 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-2xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">Edit HubSpot Company</h3>
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      ID #{editingCompany.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Update company properties directly in HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-2.5 border border-emerald-200 animate-fade-in">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSaveCompanyEdit} className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200 flex items-start gap-2.5 animate-shake">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{actionError}</span>
                  </div>
                )}

                {/* Domain & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Company domain name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. acme.com"
                      value={editCompanyData.domain}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, domain: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Company name <span className="text-[#EE3124]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Company Name"
                      value={editCompanyData.name}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company owner
                  </label>
                  <select
                    value={editCompanyData.hubspot_owner_id}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, hubspot_owner_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all cursor-pointer text-xs sm:text-sm"
                  >
                    <option value="">-- No Owner (Unassigned) --</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.email} {o.email ? `(${o.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Industry & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Industry
                    </label>
                    <select
                      value={editCompanyData.industry}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all cursor-pointer text-xs sm:text-sm"
                    >
                      {companyIndustries.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Type
                    </label>
                    <select
                      value={editCompanyData.type}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, type: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all cursor-pointer text-xs sm:text-sm"
                    >
                      {companyTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* City & State/Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. San Francisco"
                      value={editCompanyData.city}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      State/Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. California"
                      value={editCompanyData.state}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Postal Code & Time Zone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Postal code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 94107"
                      value={editCompanyData.zip}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, zip: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Time zone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. America/Los_Angeles or GMT+5:30"
                      value={editCompanyData.timezone}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Employees & Revenue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Number of employees
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={editCompanyData.numberofemployees}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, numberofemployees: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Annual revenue
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={editCompanyData.annualrevenue}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, annualrevenue: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of company..."
                    value={editCompanyData.description}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all resize-y"
                  />
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    LinkedIn company page
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://www.linkedin.com/company/acme"
                      value={editCompanyData.linkedin_company_page}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, linkedin_company_page: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A389]/20 focus:border-[#00A389] focus:bg-white transition-all"
                    />
                    <LinkedInIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingCompany(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-2xl bg-[#00A389] hover:bg-[#008f77] text-white text-xs font-bold shadow-md shadow-[#00A389]/20 disabled:opacity-50 transition-all cursor-pointer"
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

      {/* Delete Company Modal */}
      {deletingCompany && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Delete Company</h3>
                  <p className="text-xs text-slate-500 font-medium">Remove company from HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingCompany(null)}
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
                  Are you sure you want to delete company <strong className="text-slate-900">{deletingCompany.name}</strong> from HubSpot CRM? This action cannot be undone.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingCompany(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteCompany}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Company'}
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

