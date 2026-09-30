import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getSourceBadge } from './ContactsView';
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
  Check
} from 'lucide-react';

export default function DealsView({
  deals = [],
  pipelines = [],
  loading = false,
  error = null,
  contacts = [],
  onRefreshDeals,
  adminKey
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    amount: ''
  });
  const [deletingDeal, setDeletingDeal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const handleStartEditDeal = (d) => {
    const pipeId = d.pipeline || activePipelines[0]?.id || 'default';
    const stageId = d.dealstage || activePipelines[0]?.stages[0]?.id || 'appointmentscheduled';
    setEditingDeal(d);
    setEditDealData({
      dealname: d.dealname || '',
      pipeline: pipeId,
      dealstage: stageId,
      amount: d.amount || ''
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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        },
        body: JSON.stringify({
          id: editingDeal.id,
          dealname: editDealData.dealname.trim(),
          pipeline: editDealData.pipeline,
          dealstage: editDealData.dealstage,
          amount: editDealData.amount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update deal in HubSpot.');
      }

      setActionSuccess('Deal updated successfully in HubSpot!');
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
        headers: {
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        }
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
  const [createErrorMsg, setCreateErrorMsg] = useState('');

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
      const matchesSource = selectedSourceFilter === 'ALL' || (d.lead_source || 'HubSpot / Unknown') === selectedSourceFilter;

      return matchesQuery && matchesPipeline && matchesStage && matchesSource;
    });
  }, [deals, searchQuery, pipelineFilter, stageFilter, selectedSourceFilter, activePipelines]);

  const totalPages = Math.ceil(filteredDeals.length / pageSize) || 1;
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeals.slice(start, start + pageSize);
  }, [filteredDeals, currentPage, pageSize]);

  // Create Deal submit handler
  const handleCreateDealSubmit = async (e) => {
    e.preventDefault();
    if (!newDealData.dealname.trim()) return;

    setIsSubmitting(true);
    setCreateErrorMsg('');
    setCreateSuccessMsg('');

    try {
      const activeAdminKey = adminKey || sessionStorage.getItem('admin_key') || '';

      // Create Company first if name provided
      let companyId = null;
      if (newDealData.companyName.trim()) {
        const compRes = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': activeAdminKey
          },
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
      const dealRes = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': activeAdminKey
        },
        body: JSON.stringify({
          dealname: newDealData.dealname.trim(),
          pipeline: newDealData.pipeline,
          dealstage: newDealData.dealstage,
          amount: newDealData.amount,
          contactId: newDealData.contactId || null,
          companyId
        })
      });

      const dealData = await dealRes.json().catch(() => ({}));

      if (!dealRes.ok) {
        throw new Error(dealData.error || dealData.message || dealData.details?.message || `Failed to create deal (HTTP ${dealRes.status})`);
      }

      setCreateSuccessMsg('Deal created successfully and associated in HubSpot!');
      setTimeout(() => {
        setCreateSuccessMsg('');
        setCreateErrorMsg('');
        setShowCreateModal(false);
        setNewDealData({
          dealname: '',
          pipeline: activePipelines[0]?.id || 'default',
          dealstage: activePipelines[0]?.stages[0]?.id || 'appointmentscheduled',
          amount: '',
          companyName: '',
          companyDomain: '',
          contactId: ''
        });
        if (onRefreshDeals) onRefreshDeals();
      }, 1500);
    } catch (err) {
      setCreateErrorMsg(err.message || 'Something went wrong creating the deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
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
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pipeline Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs">
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
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs">
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
            <span>Create HubSpot Deal</span>
          </button>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
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
            <p className="text-sm font-bold text-slate-700">No HubSpot deals found</p>
            <p className="text-xs text-slate-500">
              Create a new deal or associate deals with contacts/companies.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white text-xs font-bold shadow-md shadow-orange-600/20"
            >
              + Create First Deal
            </button>
          </div>
        )}

        {!loading && !error && filteredDeals.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-4 font-extrabold">Deal Name</th>
                    <th className="px-4 py-4 font-extrabold">Pipeline</th>
                    <th className="px-4 py-4 font-extrabold">Deal Stage</th>
                    <th className="px-4 py-4 font-extrabold">Amount</th>
                    <th className="px-4 py-4 font-extrabold">Source</th>
                    <th className="px-4 py-4 font-extrabold">Created Date</th>
                    <th className="px-4 py-4 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedDeals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#EE3124] flex items-center justify-center shrink-0 border border-orange-100">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <span className="truncate max-w-[200px]">{d.dealname}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-xs px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 whitespace-nowrap">
                            {getPipelineLabel(d.pipeline)}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getStageBadge(d.dealstage, d.pipeline)}
                        </td>

                        <td className="px-4 py-3.5 font-extrabold text-emerald-600 font-mono">
                          ${Number(d.amount || 0).toLocaleString()}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getSourceBadge(d.lead_source)}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 text-xs font-medium">
                          {d.createdate ? new Date(d.createdate).toLocaleDateString() : '—'}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end">
                            <div className="inline-flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                              <button
                                onClick={() => handleStartEditDeal(d)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-amber-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                title="Edit Deal"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-600 transition-colors" />
                                <span>Edit</span>
                              </button>

                              <div className="w-px h-3.5 bg-slate-200/80 my-auto" />

                              <button
                                onClick={() => {
                                  setDeletingDeal(d);
                                  setActionError('');
                                  setActionSuccess('');
                                }}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                title="Delete Deal"
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
            {filteredDeals.length > pageSize && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredDeals.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredDeals.length}</span> entries
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal to Create New Deal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Create HubSpot Deal</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a new deal & associate with contact/company</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {createSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleCreateDealSubmit} className="space-y-4 text-xs sm:text-sm">
                {createErrorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{createErrorMsg}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Deal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Enterprise Deal"
                    value={newDealData.dealname}
                    onChange={(e) => setNewDealData({ ...newDealData, dealname: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Pipeline
                    </label>
                    <select
                      value={newDealData.pipeline}
                      onChange={(e) => handleCreatePipelineChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all cursor-pointer"
                    >
                      {activePipelines.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Deal Stage
                    </label>
                    <select
                      value={newDealData.dealstage}
                      onChange={(e) => setNewDealData({ ...newDealData, dealstage: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all cursor-pointer"
                    >
                      {(activePipelines.find(p => p.id === newDealData.pipeline)?.stages || activePipelines[0]?.stages || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={newDealData.amount}
                    onChange={(e) => setNewDealData({ ...newDealData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                {/* Optional Company info */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#EE3124]" />
                    <span>Associate Company (Optional)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newDealData.companyName}
                      onChange={(e) => setNewDealData({ ...newDealData, companyName: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Company Domain (acme.com)"
                      value={newDealData.companyDomain}
                      onChange={(e) => setNewDealData({ ...newDealData, companyDomain: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Optional Contact Selector */}
                {contacts.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Associate Contact (Optional)
                    </label>
                    <select
                      value={newDealData.contactId}
                      onChange={(e) => setNewDealData({ ...newDealData, contactId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
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
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs transition-all shadow-md shadow-orange-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating Deal...' : 'Create & Associate Deal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Edit Deal Modal */}
      {editingDeal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit HubSpot Deal</h3>
                  <p className="text-xs text-slate-500 font-medium">Update deal details in HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDeal(null)}
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
              <form onSubmit={handleSaveDealEdit} className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Deal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Deal Name"
                    value={editDealData.dealname}
                    onChange={(e) => setEditDealData({ ...editDealData, dealname: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Pipeline
                    </label>
                    <select
                      value={editDealData.pipeline}
                      onChange={(e) => handleEditPipelineChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all cursor-pointer"
                    >
                      {activePipelines.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Deal Stage
                    </label>
                    <select
                      value={editDealData.dealstage}
                      onChange={(e) => setEditDealData({ ...editDealData, dealstage: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all cursor-pointer"
                    >
                      {(activePipelines.find(p => p.id === editDealData.pipeline)?.stages || activePipelines[0]?.stages || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={editDealData.amount}
                    onChange={(e) => setEditDealData({ ...editDealData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDeal(null)}
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


