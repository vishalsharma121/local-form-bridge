import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import OverviewView from '../components/dashboard/OverviewView';
import ContactsView from '../components/dashboard/ContactsView';
import CompaniesView from '../components/dashboard/CompaniesView';
import DealsView from '../components/dashboard/DealsView';
import FormPreviewView from '../components/dashboard/FormPreviewView';
import SettingsView from '../components/dashboard/SettingsView';
import ErrorLogsView from '../components/dashboard/ErrorLogsView';
import RetryQueueView from '../components/dashboard/RetryQueueView';
import ActivityFeedView from '../components/dashboard/ActivityFeedView';
import { filterByDateRange } from '../utils/dateFilterUtils';
import { 
  ShieldCheck, 
  Key, 
  ArrowRight, 
  AlertCircle, 
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const [key, setKey] = useState(() => sessionStorage.getItem('admin_key') || '');
  const [inputKey, setInputKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Data states
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [deals, setDeals] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Live Auto-Sync states
  const [autoSync, setAutoSync] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Date Range Filter State (persisted in sessionStorage)
  const [dateRange, setDateRangeState] = useState(() => sessionStorage.getItem('date_range') || 'all');
  const [customStart, setCustomStartState] = useState(() => sessionStorage.getItem('custom_start') || '');
  const [customEnd, setCustomEndState] = useState(() => sessionStorage.getItem('custom_end') || '');

  const setDateRange = (val) => {
    sessionStorage.setItem('date_range', val);
    setDateRangeState(val);
  };

  const setCustomStart = (val) => {
    sessionStorage.setItem('custom_start', val);
    setCustomStartState(val);
  };

  const setCustomEnd = (val) => {
    sessionStorage.setItem('custom_end', val);
    setCustomEndState(val);
  };

  // Filtered Datasets based on selected Date Range
  const filteredContacts = useMemo(() => {
    return filterByDateRange(contacts, 'createdate', dateRange, customStart, customEnd);
  }, [contacts, dateRange, customStart, customEnd]);

  const filteredCompanies = useMemo(() => {
    return filterByDateRange(companies, 'createdate', dateRange, customStart, customEnd);
  }, [companies, dateRange, customStart, customEnd]);

  const filteredDeals = useMemo(() => {
    return filterByDateRange(deals, 'createdate', dateRange, customStart, customEnd);
  }, [deals, dateRange, customStart, customEnd]);

  const filteredErrorLogs = useMemo(() => {
    return filterByDateRange(errorLogs, 'timestamp', dateRange, customStart, customEnd);
  }, [errorLogs, dateRange, customStart, customEnd]);

  const filteredActivities = useMemo(() => {
    return filterByDateRange(activities, 'timestamp', dateRange, customStart, customEnd);
  }, [activities, dateRange, customStart, customEnd]);

  const unresolvedErrorLogsCount = useMemo(() => {
    return (errorLogs || []).filter(log => !log.resolved && log.status !== 'resolved').length;
  }, [errorLogs]);

  // Dashboard layout state
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);


  const [initialLoading, setInitialLoading] = useState(true);

  // --------------------------------------------------
  // LOAD DATA FROM HUBSPOT & ERROR LOG APIs
  // --------------------------------------------------
  const loadContacts = useCallback(async (adminKey, silent = false) => {
    setError(null);
    try {
      const res = await fetch('/api/contacts', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.status === 401) {
        sessionStorage.removeItem('admin_key');
        setKey('');
        throw new Error('Invalid admin key. Please check credentials and try again.');
      }
      if (!res.ok) throw new Error('Failed to load contacts data');
      const data = await res.json();
      setContacts(data.contacts || []);
      setLastSyncedAt(new Date().toLocaleTimeString());
      return data;
    } catch (err) {
      if (!silent) setError(err.message);
      return null;
    }
  }, []);

  const loadCompanies = useCallback(async (adminKey) => {
    try {
      const res = await fetch('/api/companies', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load companies:', err);
    }
    return null;
  }, []);

  const loadDeals = useCallback(async (adminKey) => {
    try {
      const res = await fetch('/api/deals', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
        if (data.pipelines) setPipelines(data.pipelines);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load deals:', err);
    }
    return null;
  }, []);

  const loadErrorLogs = useCallback(async (adminKey) => {
    const activeKey = adminKey || key || sessionStorage.getItem('admin_key') || '';
    try {
      const res = await fetch('/api/sync-errors', {
        headers: { 'x-admin-key': activeKey },
      });
      if (res.ok) {
        const data = await res.json();
        setErrorLogs(data.logs || []);
        return data;
      } else {
        const fallbackRes = await fetch('/api/error-logs', {
          headers: { 'x-admin-key': activeKey },
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setErrorLogs(data.logs || []);
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to load error logs:', err);
    }
    return null;
  }, [key]);

  const clearErrorLogsAPI = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch('/api/sync-errors', {
        method: 'DELETE',
        headers: { 'x-admin-key': key },
      });
      if (res.ok) {
        setErrorLogs([]);
      }
    } catch (err) {
      console.error('Failed to clear error logs:', err);
    }
  }, [key]);

  const loadActivityLogs = useCallback(async (adminKey) => {
    try {
      const res = await fetch('/api/sync-activity', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || data.logs || []);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load activity logs:', err);
    }
    return null;
  }, []);

  const clearActivityLogsAPI = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch('/api/sync-activity', {
        method: 'DELETE',
        headers: { 'x-admin-key': key },
      });
      if (res.ok) {
        setActivities([]);
      }
    } catch (err) {
      console.error('Failed to clear activity logs:', err);
    }
  }, [key]);

  const triggerAutoRetry = useCallback(async (adminKey) => {
    const activeKey = adminKey || key || sessionStorage.getItem('admin_key') || '';
    if (!activeKey) return;
    try {
      const res = await fetch('/api/cron-auto-retry', {
        headers: { 'x-admin-key': activeKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.processed > 0) {
          loadErrorLogs(activeKey);
          loadActivityLogs(activeKey);
        }
      }
    } catch (err) {
      console.warn('Auto-retry trigger error:', err);
    }
  }, [key, loadErrorLogs, loadActivityLogs]);

  const loadAllData = useCallback(async (adminKey, silent = false) => {
    if (!silent) setLoading(true);
    try {
      await Promise.allSettled([
        loadContacts(adminKey, silent),
        loadCompanies(adminKey),
        loadDeals(adminKey),
        loadErrorLogs(adminKey),
        loadActivityLogs(adminKey)
      ]);
    } catch (err) {
      console.warn('Sync load error:', err);
    } finally {
      if (!silent) setLoading(false);
      setInitialLoading(false);
    }
  }, [loadContacts, loadCompanies, loadDeals, loadErrorLogs, loadActivityLogs]);

  const pollCountRef = useRef(0);

  // --------------------------------------------------
  // LIVE AUTO-SYNC COUNTDOWN (10, 09, 08... 00 -> Sync -> 10)
  // --------------------------------------------------
  useEffect(() => {
    if (!key) return;

    // Initial load asynchronously
    const initFetch = async () => {
      loadAllData(key, false);
      triggerAutoRetry(key);
    };
    initFetch();
  }, [key, loadAllData, triggerAutoRetry]);

  useEffect(() => {
    if (!key || !autoSync) {
      return;
    }

    // 1 second countdown interval
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadAllData(key, true);
          pollCountRef.current += 1;
          // Trigger auto-retry check roughly every 60s (every 6th 10-second tick)
          if (pollCountRef.current % 6 === 0) {
            triggerAutoRetry(key);
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    // Instant update when switching tab back from HubSpot to our app
    const handleFocus = () => {
      loadAllData(key, true);
      triggerAutoRetry(key);
      setCountdown(10);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [key, autoSync, loadAllData, triggerAutoRetry]);

  const handleManualRefresh = async () => {
    setSyncSuccess(false);
    loadAllData(key, false);
    setCountdown(10);
    setTimeout(() => {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }, 400);
  };

  // --------------------------------------------------
  // HANDLERS
  // --------------------------------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    sessionStorage.setItem('admin_key', inputKey.trim());
    setKey(inputKey.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_key');
    setKey('');
    setInputKey('');
  };

  const handleUpdateKey = (newAdminKey) => {
    sessionStorage.setItem('admin_key', newAdminKey);
    setKey(newAdminKey);
    loadAllData(newAdminKey, false);
    setCountdown(10);
  };

  // CSV Export Helper
  const handleExportCSV = () => {
    if (contacts.length === 0) return;

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Created Date'];
    const rows = contacts.map(c => [
      `"${(c.id || '').replace(/"/g, '""')}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.subject || '').replace(/"/g, '""')}"`,
      `"${(c.message || '').replace(/"/g, '""')}"`,
      `"${c.createdate ? new Date(c.createdate).toLocaleString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `form_bridge_contacts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --------------------------------------------------
  // LOGIN SCREEN (WHEN NOT AUTHENTICATED)
  // --------------------------------------------------
  if (!key) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] text-slate-800 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Soft Glow Accents */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F7941D]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#EE3124]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl space-y-6">
            {/* Header Brand */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] flex items-center justify-center mx-auto text-white shadow-lg shadow-orange-500/20">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Admin Dashboard Login
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Enter your secure admin authorization key
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Admin Key
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter security key..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/30 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Authorize & Enter</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}
            </form>

            {/* Back to Public Form */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <Link
                to="/"
                className="text-xs text-slate-500 hover:text-[#EE3124] font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Return to Public Contact Form</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN DASHBOARD (AUTHENTICATED)
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 flex flex-col lg:flex-row gap-0 lg:gap-5 font-sans transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactsCount={contacts.length}
        companiesCount={companies.length}
        dealsCount={deals.length}
        errorLogsCount={unresolvedErrorLogsCount}
        retryQueueCount={unresolvedErrorLogsCount}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        initialLoading={initialLoading}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onRefresh={handleManualRefresh}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (activeTab !== 'contacts' && activeTab !== 'companies' && activeTab !== 'deals' && activeTab !== 'error-logs') {
              setActiveTab('contacts');
            }
          }}
          onLogout={handleLogout}
          setIsMobileOpen={setIsMobileOpen}
          autoSync={autoSync}
          setAutoSync={setAutoSync}
          countdown={countdown}
          lastSyncedAt={lastSyncedAt}
          syncSuccess={syncSuccess}
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:py-6 lg:px-0 lg:pr-5 w-full">
          {activeTab === 'overview' && (
            <OverviewView
              contacts={filteredContacts}
              companies={filteredCompanies}
              deals={filteredDeals}
              errorLogs={filteredErrorLogs}
              loading={loading}
              initialLoading={initialLoading}
              error={error}
              onNavigate={(tab) => setActiveTab(tab)}
              onExportCSV={handleExportCSV}
              onSelectContact={(c) => {
                setSelectedContact(c);
                setActiveTab('contacts');
              }}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsView
              contacts={filteredContacts}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onExportCSV={handleExportCSV}
              selectedContact={selectedContact}
              setSelectedContact={setSelectedContact}
              onRefreshContacts={() => loadContacts(key, false)}
              adminKey={key}
            />
          )}

          {activeTab === 'companies' && (
            <CompaniesView
              companies={filteredCompanies}
              loading={loading}
              error={error}
              onRefreshCompanies={() => loadCompanies(key, false)}
              adminKey={key}
            />
          )}

          {activeTab === 'deals' && (
            <DealsView
              deals={filteredDeals}
              pipelines={pipelines}
              loading={loading}
              error={error}
              contacts={filteredContacts}
              onRefreshDeals={() => loadDeals(key, false)}
              adminKey={key}
            />
          )}

          {activeTab === 'error-logs' && (
            <ErrorLogsView
              errorLogs={filteredErrorLogs}
              loading={loading}
              error={error}
              onRefreshLogs={() => loadErrorLogs(key, false)}
              onClearLogs={clearErrorLogsAPI}
            />
          )}

          {activeTab === 'retry-queue' && (
            <RetryQueueView
              errorLogs={filteredErrorLogs}
              loading={loading}
              adminKey={key}
              onRefreshLogs={() => loadErrorLogs(key, false)}
            />
          )}

          {activeTab === 'activity-feed' && (
            <ActivityFeedView
              activities={filteredActivities}
              loading={loading}
              error={error}
              onRefreshActivities={() => loadActivityLogs(key)}
              onClearActivities={clearActivityLogsAPI}
            />
          )}

          {activeTab === 'preview' && <FormPreviewView />}

          {activeTab === 'settings' && (
            <SettingsView
              adminKey={key}
              onUpdateKey={handleUpdateKey}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>
    </div>
  );
}