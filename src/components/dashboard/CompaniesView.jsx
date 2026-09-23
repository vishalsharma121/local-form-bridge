import React, { useState, useMemo } from 'react';
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
  Filter
} from 'lucide-react';

export default function CompaniesView({
  companies = [],
  loading = false,
  error = null,
  onRefreshCompanies
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
    try {
      const res = await fetch('/api/create-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompanyData.name.trim(),
          domain: newCompanyData.domain.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create company in HubSpot.');
      }

      setSuccessMsg('Company created successfully in HubSpot!');
      setTimeout(() => {
        setSuccessMsg('');
        setShowCreateModal(false);
        setNewCompanyData({ name: '', domain: '' });
        if (onRefreshCompanies) onRefreshCompanies();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Something went wrong creating the company.');
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
                        {c.domain && c.domain !== '—' && (
                          <a
                            href={c.domain.startsWith('http') ? c.domain : `https://${c.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EE3124] border border-orange-200 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Visit Website</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5">
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
        </div>
      )}
    </div>
  );
}
