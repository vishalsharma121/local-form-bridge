import { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  DollarSign, 
  Calendar, 
  Building2, 
  User, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export default function DealsView({
  deals,
  loading,
  error,
  contacts = [],
  onRefreshDeals,
  adminKey
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating a new deal
  const [newDealData, setNewDealData] = useState({
    dealname: '',
    pipeline: 'default',
    dealstage: 'appointmentscheduled',
    amount: '',
    companyName: '',
    companyDomain: '',
    contactId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  // HubSpot Deal Stages dictionary & color maps
  const stageMap = {
    appointmentscheduled: { label: 'Appointment Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
    qualifiedtobuy: { label: 'Qualified to Buy', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' },
    presentationscheduled: { label: 'Presentation Scheduled', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
    decisionmakerboughtin: { label: 'Decision Maker Bought-In', color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800' },
    contractsent: { label: 'Contract Sent', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
    closedwon: { label: 'Closed Won', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
    closedlost: { label: 'Closed Lost', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' }
  };

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (d.dealname && d.dealname.toLowerCase().includes(q)) ||
        (d.pipeline && d.pipeline.toLowerCase().includes(q)) ||
        (d.dealstage && d.dealstage.toLowerCase().includes(q));

      const matchesStage = stageFilter === 'ALL' || d.dealstage === stageFilter;
      return matchesQuery && matchesStage;
    });
  }, [deals, searchQuery, stageFilter]);

  // Create Deal submit handler
  const handleCreateDealSubmit = async (e) => {
    e.preventDefault();
    if (!newDealData.dealname.trim()) return;

    setIsSubmitting(true);
    try {
      // Create Company first if name provided
      let companyId = null;
      if (newDealData.companyName.trim()) {
        const compRes = await fetch('/api/create-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newDealData.companyName.trim(),
            domain: newDealData.companyDomain.trim(),
            contactId: newDealData.contactId || null
          })
        });
        if (compRes.ok) {
          const compData = await compRes.json();
          companyId = compData.company?.id;
        }
      }

      // Create Deal
      const dealRes = await fetch('/api/create-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealname: newDealData.dealname.trim(),
          pipeline: newDealData.pipeline,
          dealstage: newDealData.dealstage,
          amount: newDealData.amount,
          contactId: newDealData.contactId || null,
          companyId
        })
      });

      if (!dealRes.ok) {
        throw new Error('Failed to create deal in HubSpot.');
      }

      setCreateSuccessMsg('Deal created successfully and associated in HubSpot!');
      setTimeout(() => {
        setCreateSuccessMsg('');
        setShowCreateModal(false);
        setNewDealData({
          dealname: '',
          pipeline: 'default',
          dealstage: 'appointmentscheduled',
          amount: '',
          companyName: '',
          companyDomain: '',
          contactId: ''
        });
        if (onRefreshDeals) onRefreshDeals();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Something went wrong creating the deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by name, pipeline, or stage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Deal Stages ({deals.length})</option>
              {Object.entries(stageMap).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create HubSpot Deal</span>
          </button>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading deals from HubSpot CRM...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 space-y-2">
            <p className="text-sm font-bold">Failed to load deals: {error}</p>
          </div>
        )}

        {!loading && !error && filteredDeals.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No HubSpot deals found</p>
            <p className="text-xs text-slate-500">
              Create a new deal or associate deals with contacts/companies.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              + Create First Deal
            </button>
          </div>
        )}

        {!loading && !error && filteredDeals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Deal Name</th>
                  <th className="px-4 py-3.5 font-bold">Pipeline</th>
                  <th className="px-4 py-3.5 font-bold">Deal Stage</th>
                  <th className="px-4 py-3.5 font-bold">Amount</th>
                  <th className="px-4 py-3.5 font-bold">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                {filteredDeals.map((d) => {
                  const stageInfo = stageMap[d.dealstage] || {
                    label: d.dealstage,
                    color: 'bg-slate-100 text-slate-700 border-slate-200'
                  };
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/40">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-[200px]">{d.dealname}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {d.pipeline}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${stageInfo.color}`}>
                          {stageInfo.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${Number(d.amount || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {d.createdate ? new Date(d.createdate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Create New Deal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Create HubSpot Deal</h3>
                  <p className="text-xs text-slate-400">Add a new deal & associate with contact/company</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {createSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleCreateDealSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Deal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Enterprise Deal"
                    value={newDealData.dealname}
                    onChange={(e) => setNewDealData({ ...newDealData, dealname: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Pipeline
                    </label>
                    <select
                      value={newDealData.pipeline}
                      onChange={(e) => setNewDealData({ ...newDealData, pipeline: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="default">Sales Pipeline (default)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Deal Stage
                    </label>
                    <select
                      value={newDealData.dealstage}
                      onChange={(e) => setNewDealData({ ...newDealData, dealstage: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(stageMap).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={newDealData.amount}
                    onChange={(e) => setNewDealData({ ...newDealData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Optional Company info */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <span>Associate Company (Optional)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newDealData.companyName}
                      onChange={(e) => setNewDealData({ ...newDealData, companyName: e.target.value })}
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Company Domain (acme.com)"
                      value={newDealData.companyDomain}
                      onChange={(e) => setNewDealData({ ...newDealData, companyDomain: e.target.value })}
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Optional Contact Selector */}
                {contacts.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Associate Contact (Optional)
                    </label>
                    <select
                      value={newDealData.contactId}
                      onChange={(e) => setNewDealData({ ...newDealData, contactId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Contact Selected</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || 'Unnamed'} ({c.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating Deal...' : 'Create & Associate Deal'}
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
