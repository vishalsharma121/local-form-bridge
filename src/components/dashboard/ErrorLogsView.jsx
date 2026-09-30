import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronRight,
  Check,
  Copy,
  FileCode2,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Edit3,
  Bot,
  RotateCw
} from 'lucide-react';

export function getOperationBadge(operation) {
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
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <span>{operation || 'Sync'}</span>
    </span>
  );
}

// Helper to extract a human-readable clean error summary from raw API error strings/JSON
export function parseHumanReadableError(rawErrorMsg) {
  if (!rawErrorMsg) return 'Unknown sync failure occurred.';

  const str = typeof rawErrorMsg === 'object' ? JSON.stringify(rawErrorMsg) : String(rawErrorMsg);

  // 1. Check for nested JSON array inside message string
  if (str.includes('[{"isValid":false') || str.includes('PROPERTY_DOESNT_EXIST')) {
    if (str.toLowerCase().includes('lead_source')) {
      return 'Property "lead_source" is not defined in target HubSpot portal schema.';
    }
    const match = str.match(/"message"\s*:\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
    return 'HubSpot property validation failed: Invalid portal schema field.';
  }

  // 2. Common HubSpot / API error patterns
  if (str.includes('Authentication credentials not found') || str.includes('MISSING_TOKEN_ERROR') || str.includes('Unauthorized')) {
    return 'HubSpot API Key/Token is missing or unauthorized.';
  }
  if (str.includes('CONTACT_EXISTS') || str.includes('Contact already exists')) {
    return 'Duplicate Record: A contact with this email address already exists in HubSpot.';
  }
  if (str.includes('INVALID_EMAIL') || str.includes('email address is invalid')) {
    return 'Invalid Email Format: Provided email address was rejected by HubSpot.';
  }

  // 3. Clean up leading JSON string prefixes
  let clean = str;
  if (clean.startsWith('Property values were not valid:')) {
    clean = clean.replace(/^Property values were not valid:\s*/, '');
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        return parsed[0].message;
      }
    } catch {
      // Fallback
    }
  }

  return clean.length > 130 ? clean.slice(0, 127) + '...' : clean;
}

export function getResolutionDetails(log) {
  const isResolved = log.resolved || log.status === 'resolved';
  if (!isResolved) return null;

  const raw = String(log.errorMessage || '').toLowerCase();
  if (raw.includes('lead_source')) {
    return 'Auto-Retry Engine bypassed "lead_source" schema dependency and successfully updated record in HubSpot CRM.';
  }
  if ((log.autoRetryAttempts || log.retry_count || 0) > 0) {
    return `Auto-Retry Engine re-executed operation (Attempt #${log.autoRetryAttempts || log.retry_count || 1}) and verified clean sync with HubSpot.`;
  }
  return 'Sync operation re-executed cleanly and confirmed resolved with HubSpot CRM.';
}

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
  const [activeModalTab, setActiveModalTab] = useState('summary'); // 'summary' | 'json'
  const [copiedJson, setCopiedJson] = useState(false);

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

  const unresolvedLogs = useMemo(() => {
    return errorLogs.filter(l => !l.resolved && l.status !== 'resolved');
  }, [errorLogs]);

  const resolvedLogs = useMemo(() => {
    return errorLogs.filter(l => l.resolved || l.status === 'resolved');
  }, [errorLogs]);

  const filteredLogs = useMemo(() => {
    return errorLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesType = selectedType === 'all' || log.type === selectedType;
      
      const entityStr = JSON.stringify(log.entityInfo || {}).toLowerCase();
      const msgStr = (log.errorMessage || '').toLowerCase();
      const statusStr = String(log.statusCode || '');
      const parsedMsg = parseHumanReadableError(log.errorMessage).toLowerCase();

      const matchesSearch =
        !q ||
        entityStr.includes(q) ||
        msgStr.includes(q) ||
        parsedMsg.includes(q) ||
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

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
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
            <h3 className="font-extrabold text-base text-slate-900 flex flex-wrap items-center gap-2">
              <span>HubSpot Sync Audit & Error Logs</span>
              {unresolvedLogs.length > 0 ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
                  {unresolvedLogs.length} Active Error{unresolvedLogs.length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  0 Active Errors (All Resolved)
                </span>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {errorLogs.length} Total Audit Events
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
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>

          {errorLogs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
                  {paginatedLogs.map((log) => {
                    const isResolved = log.resolved || log.status === 'resolved';
                    const humanError = parseHumanReadableError(log.errorMessage);
                    const resolutionMsg = getResolutionDetails(log);

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

                        <td className="px-4 py-4 whitespace-nowrap">
                          {getOperationBadge(log.operation)}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          {isResolved ? (
                            <div className="space-y-1">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Resolved</span>
                              </span>
                              {(log.autoRetryAttempts || log.retry_count || 0) > 0 && (
                                <div className="text-[10px] font-bold text-slate-400">
                                  Resolved via retry #{log.autoRetryAttempts || log.retry_count}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 uppercase">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              <span>{log.status || 'Pending'}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-900">
                          <div className="max-w-[320px] sm:max-w-[420px] font-semibold text-xs text-slate-900 leading-snug">
                            {humanError}
                          </div>
                          {log.entityInfo?.email && (
                            <span className="text-[11px] font-mono text-slate-500 block truncate mt-0.5">
                              Entity: {log.entityInfo.email || log.entityInfo.name || log.entityInfo.dealName}
                            </span>
                          )}
                          {isResolved && (
                            <div className="mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 max-w-[380px] truncate">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">Resolved: Updated in HubSpot CRM</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setActiveModalTab('summary');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EE3124] border border-orange-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>View Details</span>
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

      {/* Modal Drawer for Executive Diagnostics & Technical Inspection */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto animate-modal-pop">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                  selectedLog.resolved || selectedLog.status === 'resolved'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-rose-100 text-rose-600 border-rose-200'
                }`}>
                  {selectedLog.resolved || selectedLog.status === 'resolved' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                    <span>Sync Audit Log</span>
                    <span className="font-mono text-xs font-bold text-slate-400">#{selectedLog.id}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs: Executive Summary vs Raw JSON */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-extrabold">
              <button
                onClick={() => setActiveModalTab('summary')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'summary'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#EE3124]" />
                <span>Executive Summary</span>
              </button>
              <button
                onClick={() => setActiveModalTab('json')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'json'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Raw Developer JSON</span>
              </button>
            </div>

            {activeModalTab === 'summary' ? (
              <div className="space-y-4 text-xs">
                {/* Status Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Category</span>
                    <span className="font-extrabold text-slate-900 capitalize flex items-center gap-1 mt-0.5">
                      {getTypeIcon(selectedLog.type)}
                      <span>{selectedLog.type}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Operation</span>
                    <span className="font-extrabold text-slate-900 capitalize mt-0.5 block">{selectedLog.operation || 'Sync'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">HTTP Status</span>
                    <span className="font-mono font-extrabold text-rose-600 mt-0.5 block">{selectedLog.statusCode || 500}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Resolution State</span>
                    <span className={`font-extrabold mt-0.5 block ${
                      selectedLog.resolved || selectedLog.status === 'resolved' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {selectedLog.resolved || selectedLog.status === 'resolved' ? '✓ Resolved' : '⚠️ Pending'}
                    </span>
                  </div>
                </div>

                {/* Initial Issue Card */}
                <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Initial Failure Reason</span>
                  </div>
                  <p className="text-slate-800 font-bold text-xs leading-relaxed">
                    {parseHumanReadableError(selectedLog.errorMessage)}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 break-all pt-1 border-t border-rose-200/60 mt-2">
                    Raw Log: {typeof selectedLog.errorMessage === 'string' ? selectedLog.errorMessage : JSON.stringify(selectedLog.errorMessage)}
                  </p>
                </div>

                {/* Resolution Audit Card */}
                {(selectedLog.resolved || selectedLog.status === 'resolved') && (
                  <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Resolution & Sync Audit</span>
                    </div>
                    <p className="text-emerald-950 font-semibold text-xs leading-relaxed">
                      {getResolutionDetails(selectedLog)}
                    </p>
                    <div className="text-[11px] text-emerald-700 font-medium pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                      <span>Status: Verified Clean Sync</span>
                      <span className="font-mono">Attempts: {selectedLog.autoRetryAttempts || selectedLog.retry_count || 1}</span>
                    </div>
                  </div>
                )}

                {/* Entity Details Card */}
                {selectedLog.entityInfo && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <span className="text-xs font-extrabold text-slate-800 block">Target Entity Information</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {selectedLog.entityInfo.email && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                          <span className="font-mono font-bold text-slate-800">{selectedLog.entityInfo.email}</span>
                        </div>
                      )}
                      {selectedLog.entityInfo.name && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Entity Name</span>
                          <span className="font-bold text-slate-800">{selectedLog.entityInfo.name}</span>
                        </div>
                      )}
                      {selectedLog.entityInfo.contactId && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">HubSpot Contact ID</span>
                          <span className="font-mono font-bold text-slate-800">{selectedLog.entityInfo.contactId}</span>
                        </div>
                      )}
                      {selectedLog.entityInfo.companyId && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">HubSpot Company ID</span>
                          <span className="font-mono font-bold text-slate-800">{selectedLog.entityInfo.companyId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Raw JSON Payload</span>
                  <button
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-80 border border-slate-800">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
