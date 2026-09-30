import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Trash2, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Building2, 
  Briefcase,
  Info,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RotateCw,
  Bot,
  ArrowRight,
  Edit3
} from 'lucide-react';

function parseMessageDiffs(message) {
  if (!message) return [];
  const regex = /([A-Za-z0-9\s_]+)\s*\("([^"]*)"\s*→\s*"([^"]*)"\)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(message)) !== null) {
    matches.push({
      field: match[1].trim(),
      oldVal: match[2],
      newVal: match[3]
    });
  }
  return matches;
}

export default function ActivityFeedView({
  activities = [],
  loading = false,
  error = null,
  onRefreshActivities,
  onClearActivities
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'success' | 'failure'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'contact' | 'company' | 'deal'
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, activities.length]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesStatus = statusFilter === 'all' || act.status === statusFilter;
      const matchesType = typeFilter === 'all' || act.type === typeFilter;

      const entityStr = JSON.stringify(act.entityInfo || {}).toLowerCase();
      const msgStr = (act.message || '').toLowerCase();
      const statusStr = String(act.statusCode || '');

      const matchesSearch =
        !q ||
        entityStr.includes(q) ||
        msgStr.includes(q) ||
        statusStr.includes(q);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [activities, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredActivities.length / pageSize) || 1;

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, currentPage, pageSize]);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all sync activity history logs?')) return;
    setIsClearing(true);
    try {
      if (onClearActivities) await onClearActivities();
    } catch (err) {
      alert(err.message || 'Failed to clear activity history.');
    } finally {
      setIsClearing(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'contact': return <Users className="w-3.5 h-3.5" />;
      case 'company': return <Building2 className="w-3.5 h-3.5" />;
      case 'deal': return <Briefcase className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'success') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Success</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5 uppercase tracking-wider">
        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
        <span>Failure</span>
      </span>
    );
  };

  const getOperationBadge = (operation) => {
    const op = (operation || '').toLowerCase().trim();

    if (op.includes('delete')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Delete</span>
        </span>
      );
    }

    if (op.includes('update')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
          <span>Update</span>
        </span>
      );
    }

    if (op.includes('create')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
          <PlusCircle className="w-3.5 h-3.5 text-sky-500" />
          <span>Create</span>
        </span>
      );
    }

    if (op.includes('auto-retry')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
          <Bot className="w-3.5 h-3.5 text-purple-500" />
          <span>Auto-Retry</span>
        </span>
      );
    }

    if (op.includes('retry')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-violet-50 text-violet-700 border border-violet-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
          <RotateCw className="w-3.5 h-3.5 text-violet-500" />
          <span>Retry</span>
        </span>
      );
    }

    if (op.includes('lookup')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
          <Search className="w-3.5 h-3.5 text-blue-500" />
          <span>Lookup</span>
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
        <Activity className="w-3.5 h-3.5 text-slate-400" />
        <span>{operation || 'System'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner Bar */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent bg-white p-6 rounded-3xl border border-emerald-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span>Live CRM Sync Activity Feed</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold">
                {activities.length} Events
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Auto-Refreshing (10s)
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time chronological stream of every HubSpot sync event (successes and failures).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onRefreshActivities}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stream</span>
          </button>

          {activities.length > 0 && (
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sync messages, emails, or status codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'success', label: 'Successes' },
              { id: 'failure', label: 'Failures' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  statusFilter === btn.id
                    ? 'bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white shadow-md shadow-orange-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'contact', label: 'Contacts' },
              { id: 'company', label: 'Companies' },
              { id: 'deal', label: 'Deals' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTypeFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  typeFilter === btn.id
                    ? 'bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white shadow-md shadow-orange-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Stream View */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading && activities.length === 0 && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading sync activity stream...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl m-4 space-y-2">
            <p className="text-sm font-bold">Failed to load sync activities: {error}</p>
          </div>
        )}

        {!loading && !error && filteredActivities.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Activity className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No Activity Logged Yet</p>
            <p className="text-xs text-slate-500">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No activities match your current search or filter rules.'
                : 'Submit a contact form or trigger a CRM operation to generate activity logs.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredActivities.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-4 font-extrabold">Timestamp</th>
                    <th className="px-4 py-4 font-extrabold">Outcome</th>
                    <th className="px-4 py-4 font-extrabold">Category</th>
                    <th className="px-4 py-4 font-extrabold">Operation</th>
                    <th className="px-4 py-4 font-extrabold">Message & Summary</th>
                    <th className="px-4 py-4 font-extrabold text-right">Raw Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(act.status)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5 uppercase tracking-wide">
                          {getTypeIcon(act.type)}
                          <span>{act.type}</span>
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {getOperationBadge(act.operation)}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-900">
                        <div className="max-w-[320px] sm:max-w-[420px] truncate text-xs font-semibold">
                          {act.message}
                        </div>
                        {act.entityInfo?.email && (
                          <span className="text-[11px] font-mono text-slate-500 block truncate">
                            Target: {act.entityInfo.email}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedActivity(act)}
                          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EE3124] border border-orange-200 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Inspect JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredActivities.length > pageSize && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredActivities.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredActivities.length}</span> entries
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
                    disabled={currentPage >= totalPages}
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

      {/* JSON Inspector Modal */}
      {selectedActivity && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Activity Log Inspection</h3>
                  <p className="text-xs text-slate-500 font-medium">ID: {selectedActivity.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
                  {getStatusBadge(selectedActivity.status)}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Operation</span>
                  {getOperationBadge(selectedActivity.operation)}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
                  <span className="font-extrabold capitalize text-slate-900">{selectedActivity.type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Timestamp</span>
                  <span className="font-mono text-slate-700">{new Date(selectedActivity.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Status Code</span>
                  <span className="font-mono font-bold text-slate-900">{selectedActivity.statusCode}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Message</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium">
                  {selectedActivity.message}
                </p>
              </div>

              {/* Old vs New Diff Card */}
              {(() => {
                const diffs = parseMessageDiffs(selectedActivity.message);
                if (diffs.length === 0) return null;
                return (
                  <div className="space-y-2 p-3.5 bg-orange-50/60 border border-orange-200/80 rounded-2xl">
                    <span className="text-xs font-extrabold text-[#EE3124] uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Field Changes Comparison (Old vs New)</span>
                    </span>
                    <div className="space-y-2">
                      {diffs.map((d, i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-orange-100 shadow-2xs text-xs font-semibold">
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] sm:text-xs">
                            {d.field}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-mono line-through decoration-rose-400">
                              {d.oldVal || '—'}
                            </span>
                            <span className="text-slate-400 font-bold">→</span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                              {d.newVal}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Retry Resolution Details Card */}
              {(() => {
                const matchPrior = selectedActivity.message?.match(/\[Prior Issue:\s*"([^"]+)"\]/i);
                const priorIssue = selectedActivity.entityInfo?.originalError || selectedActivity.details?.originalError || (matchPrior ? matchPrior[1] : null);
                const isRetryOp = selectedActivity.operation === 'retry' || selectedActivity.operation === 'auto-retry' || Boolean(priorIssue);

                if (!isRetryOp) return null;

                return (
                  <div className="space-y-3 p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Retry Resolution & Issue Summary</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                        Resolved
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          Original Issue / Failed Error
                        </span>
                        <p className="font-semibold text-rose-900 font-mono text-[11px] leading-relaxed">
                          {priorIssue || 'Sync operation previously failed in HubSpot API'}
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Resolution Outcome
                        </span>
                        <p className="font-bold text-emerald-900 leading-relaxed">
                          Successfully re-synced {selectedActivity.type || 'record'} to HubSpot CRM
                          {selectedActivity.entityInfo?.syncedRecordId ? ` (HubSpot ID: ${selectedActivity.entityInfo.syncedRecordId})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedActivity.entityInfo && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">Entity Payload</span>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedActivity.entityInfo, null, 2)}
                  </pre>
                </div>
              )}

              {selectedActivity.details && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">Raw Response Payload</span>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedActivity.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

