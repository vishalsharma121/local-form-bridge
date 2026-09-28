import { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Trash2, 
  RefreshCw, 
  X, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Building2,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ErrorLogsView({
  errorLogs = [],
  loading = false,
  error = null,
  onRefreshLogs,
  onClearLogs
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'contact' | 'company' | 'deal'
  const [selectedLog, setSelectedLog] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshLogs) await onRefreshLogs();
    } catch (err) {
      console.error('Failed to refresh logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, errorLogs.length]);

  const filteredLogs = useMemo(() => {
    return errorLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesType = selectedType === 'all' || log.type === selectedType;
      
      const entityStr = JSON.stringify(log.entityInfo || {}).toLowerCase();
      const msgStr = (log.errorMessage || '').toLowerCase();
      const statusStr = String(log.statusCode || '');

      const matchesSearch =
        !q ||
        entityStr.includes(q) ||
        msgStr.includes(q) ||
        statusStr.includes(q);

      return matchesType && matchesSearch;
    });
  }, [errorLogs, searchQuery, selectedType]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all error history logs?')) return;
    setIsClearing(true);
    try {
      if (onClearLogs) await onClearLogs();
    } catch (err) {
      alert(err.message || 'Failed to clear error logs.');
    } finally {
      setIsClearing(false);
    }
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
      default: return <AlertTriangle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner / Info Bar */}
      <div className="bg-gradient-to-r from-rose-500/10 via-orange-500/5 to-transparent bg-white p-6 rounded-3xl border border-rose-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span>HubSpot Sync Audit & Error Logs</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
                {errorLogs.length} Events
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Persisted history log of every failed CRM contact, company, or deal sync operation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>

          {errorLogs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search error messages, status codes, or entity emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-inner"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Logs', count: errorLogs.length },
            { id: 'contact', label: 'Contacts', count: errorLogs.filter(l => l.type === 'contact').length },
            { id: 'company', label: 'Companies', count: errorLogs.filter(l => l.type === 'company').length },
            { id: 'deal', label: 'Deals', count: errorLogs.filter(l => l.type === 'deal').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedType === tab.id
                  ? 'bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                selectedType === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading audit logs...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl m-4 space-y-2">
            <p className="text-sm font-bold">Failed to load error logs: {error}</p>
          </div>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No Sync Errors Found</p>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedType !== 'all'
                ? 'No logs matched your search filters.'
                : 'All HubSpot sync operations have executed cleanly without errors!'}
            </p>
          </div>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-4 font-extrabold">Timestamp</th>
                    <th className="px-4 py-4 font-extrabold">Category</th>
                    <th className="px-4 py-4 font-extrabold">Operation</th>
                    <th className="px-4 py-4 font-extrabold">Resolution State</th>
                    <th className="px-4 py-4 font-extrabold">Error Summary</th>
                    <th className="px-4 py-4 font-extrabold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedLogs.map((log) => (
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

                      <td className="px-4 py-4 font-bold text-xs text-slate-700 capitalize whitespace-nowrap">
                        {log.operation || 'Sync'}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {log.resolved || log.status === 'resolved' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Resolved</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 uppercase">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{log.status || 'Pending'}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-900">
                        <div className="max-w-[280px] sm:max-w-[360px] truncate font-sans text-xs">
                          {log.errorMessage}
                        </div>
                        {log.entityInfo?.email && (
                          <span className="text-[11px] font-mono text-slate-500 block truncate">
                            Entity: {log.entityInfo.email || log.entityInfo.name || log.entityInfo.dealName}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EE3124] border border-orange-200 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>View JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Modal Drawer for Raw Log Inspection */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Sync Error Details</h3>
                  <p className="text-xs text-slate-500 font-medium">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Category</span>
                  <span className="font-extrabold text-slate-900 capitalize">{selectedLog.type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status Code</span>
                  <span className="font-mono font-bold text-rose-600">{selectedLog.statusCode}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Timestamp</span>
                  <span className="font-mono text-slate-700">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Operation</span>
                  <span className="font-extrabold text-slate-900 capitalize">{selectedLog.operation}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Error Message</span>
                <p className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 font-medium">
                  {selectedLog.errorMessage}
                </p>
              </div>

              {selectedLog.entityInfo && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">Entity Details</span>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.entityInfo, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">HubSpot Raw Payload</span>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

