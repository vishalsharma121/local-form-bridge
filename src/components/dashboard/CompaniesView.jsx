import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getSourceBadge } from './ContactsView';
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
  Filter,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function CompaniesView({
  companies = [],
  loading = false,
  error = null,
  onRefreshCompanies,
  adminKey
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({ name: '', domain: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Edit & Delete state
  const [editingCompany, setEditingCompany] = useState(null);
  const [editCompanyData, setEditCompanyData] = useState({ name: '', domain: '' });
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState('');

  const handleStartEdit = (c) => {
    setEditingCompany(c);
    setEditCompanyData({
      name: c.name || '',
      domain: c.domain && c.domain !== '—' ? c.domain : ''
    });
    setActionError('');
    setActionSuccess('');
  };

  const handleSaveCompanyEdit = async (e) => {
    e.preventDefault();
    if (!editingCompany || !editCompanyData.name.trim()) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/companies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        },
        body: JSON.stringify({
          id: editingCompany.id,
          name: editCompanyData.name.trim(),
          domain: editCompanyData.domain.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update company in HubSpot.');
      }

      setActionSuccess('Company updated successfully in HubSpot!');
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
        headers: {
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        }
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
        selectedSourceFilter === 'ALL' || (c.lead_source || 'HubSpot / Unknown') === selectedSourceFilter;

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

  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    if (!newCompanyData.name.trim() && !newCompanyData.domain.trim()) return;

    setIsSubmitting(true);
    setCreateErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        },
        body: JSON.stringify({
          name: newCompanyData.name.trim(),
          domain: newCompanyData.domain.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to create company (HTTP ${res.status})`);
      }

      setSuccessMsg('Company created successfully in HubSpot!');
      setTimeout(() => {
        setSuccessMsg('');
        setCreateErrorMsg('');
        setShowCreateModal(false);
        setNewCompanyData({ name: '', domain: '' });
        if (onRefreshCompanies) onRefreshCompanies();
      }, 1500);
    } catch (err) {
      setCreateErrorMsg(err.message || 'Something went wrong creating the company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies by name or domain..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs">
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
              <option value="Website Form">Website Form</option>
              <option value="Admin Dashboard">Admin Dashboard</option>
              <option value="HubSpot / Unknown">HubSpot / Unknown</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create HubSpot Company</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-4 font-extrabold">Company Name</th>
                    <th className="px-4 py-4 font-extrabold">Domain Name</th>
                    <th className="px-4 py-4 font-extrabold">Source</th>
                    <th className="px-4 py-4 font-extrabold">Created Date</th>
                    <th className="px-4 py-4 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#EE3124] flex items-center justify-center shrink-0 border border-orange-100">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-[200px]">{c.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {c.domain && c.domain !== '—' ? (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <a
                              href={c.domain.startsWith('http') ? c.domain : `https://${c.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#EE3124] hover:underline font-mono text-xs font-bold"
                            >
                              {c.domain}
                            </a>
                            <button
                              onClick={() => handleCopyDomain(c.domain, c.id)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Copy domain"
                            >
                              {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getSourceBadge(c.lead_source)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-xs font-medium">
                        {c.createdate ? new Date(c.createdate).toLocaleDateString() : '—'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          <div className="inline-flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                            {c.domain && c.domain !== '—' && (
                              <>
                                <a
                                  href={c.domain.startsWith('http') ? c.domain : `https://${c.domain}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-[#EE3124] hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                  title="Visit Website"
                                >
                                  <span>Visit</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover/btn:text-[#EE3124] transition-colors" />
                                </a>
                                <div className="w-px h-3.5 bg-slate-200/80 my-auto" />
                              </>
                            )}

                            <button
                              onClick={() => handleStartEdit(c)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-amber-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                              title="Edit Company"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-600 transition-colors" />
                              <span className="hidden xl:inline">Edit</span>
                            </button>

                            <div className="w-px h-3.5 bg-slate-200/80 my-auto" />

                            <button
                              onClick={() => {
                                setDeletingCompany(c);
                                setActionError('');
                                setActionSuccess('');
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                              title="Delete Company"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-rose-600 transition-colors" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredCompanies.length > pageSize && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredCompanies.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredCompanies.length}</span> entries
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal to Create New Company */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Create HubSpot Company</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a company record to HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleCreateCompanySubmit} className="space-y-4 text-xs sm:text-sm">
                {createErrorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{createErrorMsg}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={newCompanyData.name}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Company Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. acme.com"
                    value={newCompanyData.domain}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Edit Company Modal */}
      {editingCompany && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit HubSpot Company</h3>
                  <p className="text-xs text-slate-500 font-medium">Update company details in HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
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
              <form onSubmit={handleSaveCompanyEdit} className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Company Name"
                    value={editCompanyData.name}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Company Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. acme.com"
                    value={editCompanyData.domain}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCompany(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-50"
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

