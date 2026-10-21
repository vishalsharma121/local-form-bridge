import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import OverviewView from '../components/dashboard/OverviewView';
import ContactsView from '../components/dashboard/ContactsView';
import CompaniesView from '../components/dashboard/CompaniesView';
import DealsView from '../components/dashboard/DealsView';
import SettingsView from '../components/dashboard/SettingsView';
import ErrorLogsView from '../components/dashboard/ErrorLogsView';
import RetryQueueView from '../components/dashboard/RetryQueueView';
import ActivityFeedView from '../components/dashboard/ActivityFeedView';
import TeamMembersView from '../components/dashboard/TeamMembersView';
import AccessRestrictedView from '../components/dashboard/AccessRestrictedView';
import LoginModal from '../components/LoginModal';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { filterByDateRange } from '../utils/dateFilterUtils';

function AdminDashboardContent() {
  const { user, loading: authLoading, getAuthHeaders, logout, isSuperAdmin, can } = useAuth();

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

  // Date Range Filter State
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

  // Filtered Datasets
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

  // LOAD DATA FROM HUBSPOT & ERROR LOG APIs
  const loadContacts = useCallback(async (silent = false) => {
    if (!can('view', 'contacts')) {
      setContacts([]);
      return null;
    }
    setError(null);
    try {
      const res = await fetch('/api/contacts', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        logout('contacts_401', 'Your account has been deleted or deactivated. Session terminated.');
        throw new Error('Session expired. Please log in again.');
      }
      if (res.status === 403) {
        setContacts([]);
        return null;
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
  }, [getAuthHeaders, logout, can]);

  const loadCompanies = useCallback(async () => {
    if (!can('view', 'companies')) {
      setCompanies([]);
      return null;
    }
    try {
      const res = await fetch('/api/companies', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        logout('companies_401', 'Your account has been deleted or deactivated. Session terminated.');
        return null;
      }
      if (res.status === 403) {
        setCompanies([]);
        return null;
      }
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load companies:', err);
    }
    return null;
  }, [getAuthHeaders, logout, can]);

  const loadDeals = useCallback(async () => {
    if (!can('view', 'deals')) {
      setDeals([]);
      return null;
    }
    try {
      const res = await fetch('/api/deals', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        logout('deals_401', 'Your account has been deleted or deactivated. Session terminated.');
        return null;
      }
      if (res.status === 403) {
        setDeals([]);
        return null;
      }
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
  }, [getAuthHeaders, logout, can]);

  const loadErrorLogs = useCallback(async () => {
    if (!can('view', 'logs')) {
      setErrorLogs([]);
      return null;
    }
    try {
      const res = await fetch('/api/sync-errors', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        logout('logs_401', 'Your account has been deleted or deactivated. Session terminated.');
        return null;
      }
      if (res.status === 403) {
        setErrorLogs([]);
        return null;
      }
      if (res.ok) {
        const data = await res.json();
        setErrorLogs(data.logs || []);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load error logs:', err);
    }
    return null;
  }, [getAuthHeaders, logout, can]);

  const clearErrorLogsAPI = useCallback(async () => {
    try {
      const res = await fetch('/api/sync-errors', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setErrorLogs([]);
      }
    } catch (err) {
      console.error('Failed to clear error logs:', err);
    }
  }, [getAuthHeaders]);

  const loadActivityLogs = useCallback(async () => {
    if (!can('view', 'activity')) {
      setActivities([]);
      return null;
    }
    try {
      const res = await fetch('/api/sync-activity', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        logout('activity_401', 'Your account has been deleted or deactivated. Session terminated.');
        return null;
      }
      if (res.status === 403) {
        setActivities([]);
        return null;
      }
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || data.logs || []);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load activity logs:', err);
    }
    return null;
  }, [getAuthHeaders, logout, can]);

  const clearActivityLogsAPI = useCallback(async () => {
    try {
      const res = await fetch('/api/sync-activity', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setActivities([]);
      }
    } catch (err) {
      console.error('Failed to clear activity logs:', err);
    }
  }, [getAuthHeaders]);

  const triggerAutoRetry = useCallback(async () => {
    if (!can('view', 'retry')) return;
    try {
      const res = await fetch('/api/cron-auto-retry', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.processed > 0) {
          loadErrorLogs();
          loadActivityLogs();
        }
      }
    } catch (err) {
      console.warn('Auto-retry trigger error:', err);
    }
  }, [getAuthHeaders, can, loadErrorLogs, loadActivityLogs]);

  const loadAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      await Promise.allSettled([
        loadContacts(silent),
        loadCompanies(),
        loadDeals(),
        loadErrorLogs(),
        loadActivityLogs()
      ]);
    } catch (err) {
      console.warn('Sync load error:', err);
    } finally {
      if (!silent) setLoading(false);
      setInitialLoading(false);
    }
  }, [loadContacts, loadCompanies, loadDeals, loadErrorLogs, loadActivityLogs]);

  const pollCountRef = useRef(0);

  // Initial load when user logs in
  useEffect(() => {
    if (!user) return;
    loadAllData(false);
    triggerAutoRetry();
  }, [user, loadAllData, triggerAutoRetry]);

  // LIVE AUTO-SYNC COUNTDOWN
  useEffect(() => {
    if (!user || !autoSync) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadAllData(true);
          pollCountRef.current += 1;
          if (pollCountRef.current % 6 === 0) {
            triggerAutoRetry();
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    const handleFocus = () => {
      loadAllData(true);
      triggerAutoRetry();
      setCountdown(10);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, autoSync, loadAllData, triggerAutoRetry]);

  const handleManualRefresh = async () => {
    setSyncSuccess(false);
    loadAllData(false);
    setCountdown(10);
    setTimeout(() => {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }, 400);
  };

  // Export CSV Helper
  const handleExportCSV = (dataList = contacts, filename = 'hubspot-export.csv') => {
    if (!dataList || dataList.length === 0) return;

    const headers = Object.keys(dataList[0] || {}).join(',');
    const rows = dataList.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val || '').replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-4 font-sans antialiased">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col items-center gap-4 max-w-xs w-full animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900">StarkEdge Bridge</h3>
            <p className="text-xs text-slate-500 font-medium">Verifying session credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated user -> Show Login Modal
  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f6fa] text-slate-800 flex flex-col lg:flex-row gap-0 lg:gap-5 font-sans transition-colors antialiased selection:bg-[#EE3124]/10 selection:text-[#EE3124]">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactsCount={filteredContacts.length}
        companiesCount={filteredCompanies.length}
        dealsCount={filteredDeals.length}
        errorLogsCount={unresolvedErrorLogsCount}
        retryQueueCount={unresolvedErrorLogsCount}
        onLogout={logout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        initialLoading={initialLoading}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-[calc(100vh-2.5rem)] lg:my-5 lg:mr-5">
        <Header
          activeTab={activeTab}
          onRefresh={handleManualRefresh}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onLogout={logout}
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
        <main className={`flex-1 p-4 sm:p-6 lg:pt-3.5 lg:pb-0 lg:px-0 w-full min-h-0 flex flex-col ${activeTab === 'settings' ? 'overflow-y-auto pr-1' : 'overflow-hidden'}`}>
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
            can('view', 'contacts') ? (
              <ContactsView
                contacts={filteredContacts}
                allContacts={contacts}
                companies={companies}
                deals={deals}
                pipelines={pipelines}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onExportCSV={handleExportCSV}
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                onRefreshContacts={() => loadContacts(false)}
                onRefreshCompanies={() => loadCompanies()}
                onRefreshDeals={() => loadDeals()}
              />
            ) : (
              <AccessRestrictedView
                title="Contacts Access Restricted"
                moduleName="Contacts"
                onBack={() => setActiveTab('overview')}
              />
            )
          )}

          {activeTab === 'companies' && (
            can('view', 'companies') ? (
              <CompaniesView
                companies={filteredCompanies}
                loading={loading}
                error={error}
                onRefreshCompanies={() => loadCompanies()}
              />
            ) : (
              <AccessRestrictedView
                title="Companies Access Restricted"
                moduleName="Companies"
                onBack={() => setActiveTab('overview')}
              />
            )
          )}

          {activeTab === 'deals' && (
            can('view', 'deals') ? (
              <DealsView
                deals={filteredDeals}
                pipelines={pipelines}
                loading={loading}
                error={error}
                contacts={contacts}
                companies={companies}
                onRefreshDeals={() => loadDeals()}
                onRefreshContacts={() => loadContacts(false)}
                onRefreshCompanies={() => loadCompanies()}
              />
            ) : (
              <AccessRestrictedView
                title="Deals Access Restricted"
                moduleName="Deals & Pipelines"
                onBack={() => setActiveTab('overview')}
              />
            )
          )}

          {activeTab === 'error-logs' && (
            can('view', 'logs') ? (
              <ErrorLogsView
                errorLogs={filteredErrorLogs}
                loading={loading}
                error={error}
                onRefreshLogs={() => loadErrorLogs()}
                onClearLogs={clearErrorLogsAPI}
              />
            ) : (
              <AccessRestrictedView
                title="Error Logs Access Restricted"
                moduleName="Sync Error Logs"
                onBack={() => setActiveTab('overview')}
              />
            )
          )}

          {activeTab === 'retry-queue' && (
            can('view', 'retry') ? (
              <RetryQueueView
                errorLogs={filteredErrorLogs}
                loading={loading}
                onRefreshLogs={() => loadErrorLogs()}
              />
            ) : (
              <AccessRestrictedView
                title="Retry Queue Access Restricted"
                moduleName="Retry Queue"
                onBack={() => setActiveTab('overview')}
              />
            )
          )}

          {activeTab === 'activity-feed' && (
            can('view', 'activity') ? (
              <ActivityFeedView
                activities={filteredActivities}
                loading={loading}
                error={error}
                onRefreshActivities={() => loadActivityLogs()}
                onClearActivities={clearActivityLogsAPI}
              />
            ) : (
              <AccessRestrictedView
                title="Activity Feed Access Restricted"
                moduleName="Activity & Audit Logs"
                onBack={() => setActiveTab('overview')}
              />
            )
          )}

          {activeTab === 'team-members' && isSuperAdmin && (
            <TeamMembersView />
          )}

          {activeTab === 'settings' && isSuperAdmin && (
            <SettingsView
              onLogout={logout}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminDashboardContent />
    </AuthProvider>
  );
}