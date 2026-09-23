import { useState, useMemo, useEffect } from 'react';
import {
  RotateCw,
  CheckCircle2,
  Search,
  Clock,
  ShieldAlert,
  Zap,
  Users,
  Building2,
  Briefcase,
  AlertCircle,
  AlertOctagon,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export default function RetryQueueView({
  errorLogs = [],
  loading = false,
  adminKey = '',
  onRefreshLogs
}) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'failed'
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Auto-Retry state initialized to ON by default, persisted in localStorage
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(() => {
    const saved = localStorage.getItem('auto_retry_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleAutoRetry = () => {
    const nextVal = !autoRetryEnabled;
    setAutoRetryEnabled(nextVal);
    localStorage.setItem('auto_retry_enabled', String(nextVal));
  };

  // Split logs into Pending vs Failed categories
  const unresolvedLogs = useMemo(() => {
    return errorLogs.filter((log) => !log.resolved);
  }, [errorLogs]);

  const pendingLogs = useMemo(() => {
    return unresolvedLogs.filter((log) => {
      const attempts = Number(log.auto_retry_attempts || log.autoRetryAttempts || 0);
      const st = log.status || 'pending';
      return st === 'pending' || st === 'retrying' || attempts < 3;
    });
  }, [unresolvedLogs]);

  const failedLogs = useMemo(() => {
    return unresolvedLogs.filter((log) => {
      const attempts = Number(log.auto_retry_attempts || log.autoRetryAttempts || 0);
      const st = log.status;
      return st === 'failed' || attempts >= 3;
    });
  }, [unresolvedLogs]);

  const currentTabLogs = activeTab === 'pending' ? pendingLogs : failedLogs;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, errorLogs.length]);

  const filteredLogs = useMemo(() => {
    return currentTabLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const entityStr = JSON.stringify(log.entityInfo || {}).toLowerCase();
      const msgStr = (log.errorMessage || '').toLowerCase();
      const statusStr = String(log.statusCode || '');
      const typeStr = (log.type || '').toLowerCase();
      return !q || entityStr.includes(q) || msgStr.includes(q) || statusStr.includes(q) || typeStr.includes(q);
    });
  }, [currentTabLogs, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Single Retry Handler
  const handleRetrySingle = async (logId) => {
    setRetryingId(logId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/sync-errors/${logId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'Sync operation retried and resolved successfully!',
        });
        if (onRefreshLogs) onRefreshLogs();
      } else {
        setFeedback({
          type: 'error',
          message: data.message || data.error || 'Retry attempt failed.',
        });
        if (onRefreshLogs) onRefreshLogs();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to connect to retry endpoint.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  // Bulk Retry All Handler
  const handleRetryAll = async () => {
    if (filteredLogs.length === 0) return;
    setIsRetryingAll(true);
    setFeedback(null);
    let successCount = 0;
    let failCount = 0;

    for (const log of filteredLogs) {
      try {
        const res = await fetch(`/api/sync-errors/${log.id}/retry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsRetryingAll(false);
    setFeedback({
      type: successCount > 0 ? 'success' : 'error',
      message: `Batch retry complete: ${successCount} resolved, ${failCount} failed.`,
    });
    if (onRefreshLogs) onRefreshLogs();
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'contact':
        return 'bg-orange-50 text-[#EE3124] border-orange-200';
      case 'company':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'deal':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'contact': return <Users className="w-3.5 h-3.5" />;
      case 'company': return <Building2 className="w-3.5 h-3.5" />;
      case 'deal': return <Briefcase className="w-3.5 h-3.5" />;
      default: return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent bg-white p-6 rounded-3xl border border-orange-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <span>Sync Operations Retry Lifecycle</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-extrabold">
                {pendingLogs.length} Pending • {failedLogs.length} Failed
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Dashboard auto-retry + manual override for failed HubSpot CRM sync operations.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          {/* Auto-Retry Toggle */}
          <button
            onClick={handleToggleAutoRetry}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
              autoRetryEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoRetryEnabled ? 'fill-emerald-500 text-emerald-500' : ''}`} />
            <span>Auto-Retry: {autoRetryEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Bulk Retry Button (only in pending tab) */}
          {activeTab === 'pending' && (
            <button
              onClick={handleRetryAll}
              disabled={isRetryingAll || filteredLogs.length === 0}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
              <span>{isRetryingAll ? 'Retrying Queue...' : 'Retry All Operations'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-extrabold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs & Search Navigation Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white shadow-md shadow-orange-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Pending Queue</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('failed')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'failed'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Failed (Manual Only)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'failed' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {failedLogs.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab} retries by email, target, or error text...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-[#EE3124] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading retry queue items...</p>
          </div>
        )}

        {!loading && filteredLogs.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm font-extrabold text-slate-800">
              {activeTab === 'pending' ? 'No Pending Retries!' : 'No Failed Operations!'}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? 'No sync operations matched your search query.'
                : activeTab === 'pending'
                  ? 'All background sync operations are healthy or moving through retry lifecycle.'
                  : 'No sync errors have exhausted auto-retries.'}
            </p>
          </div>
        )}

        {!loading && filteredLogs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-4 font-extrabold">Timestamp</th>
                    <th className="px-4 py-4 font-extrabold">Category</th>
                    <th className="px-4 py-4 font-extrabold">Target Entity</th>
                    <th className="px-4 py-4 font-extrabold">Failure Reason</th>
                    <th className="px-4 py-4 font-extrabold text-center">Auto-Retries</th>
                    <th className="px-4 py-4 font-extrabold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedLogs.map((log) => {
                    const isItemRetrying = retryingId === log.id;
                    const attempts = Number(log.auto_retry_attempts || log.autoRetryAttempts || 0);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 uppercase tracking-wide ${getBadgeColor(log.type)}`}>
                            {getTypeIcon(log.type)}
                            <span>{log.type}</span>
                          </span>
                        </td>

                        <td className="px-4 py-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {log.entityInfo?.email || log.entityInfo?.name || log.entityInfo?.dealName || log.record_email || 'CRM Object'}
                        </td>

                        <td className="px-4 py-4 max-w-xs truncate text-xs text-rose-700 font-medium">
                          {log.errorMessage}
                        </td>

                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {activeTab === 'failed' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <AlertOctagon className="w-3 h-3 text-rose-500" />
                              <span>Auto-retried {attempts}x, then failed</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {attempts} / 3 attempts
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleRetrySingle(log.id)}
                            disabled={isItemRetrying || isRetryingAll}
                            className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs transition-all shadow-md shadow-orange-600/20 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${isItemRetrying ? 'animate-spin' : ''}`} />
                            <span>{isItemRetrying ? 'Retrying...' : 'Retry Now'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredLogs.length > pageSize && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredLogs.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredLogs.length}</span> entries
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
    </div>
  );
}

