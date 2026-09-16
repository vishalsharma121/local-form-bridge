import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import OverviewView from '../components/dashboard/OverviewView';
import ContactsView from '../components/dashboard/ContactsView';
import DealsView from '../components/dashboard/DealsView';
import FormPreviewView from '../components/dashboard/FormPreviewView';
import SettingsView from '../components/dashboard/SettingsView';
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
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Live Auto-Sync states
  const [autoSync, setAutoSync] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Dashboard layout state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'contacts' | 'deals' | 'preview' | 'settings'
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);

  // --------------------------------------------------
  // LOAD CONTACTS & DEALS FROM API
  // --------------------------------------------------
  const loadContacts = useCallback(async (adminKey, silent = false) => {
    if (!silent) setLoading(true);
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
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadDeals = useCallback(async (adminKey, silent = false) => {
    try {
      const res = await fetch('/api/deals', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.warn('Failed to load deals:', err);
    }
  }, []);

  const loadAllData = useCallback((adminKey, silent = false) => {
    loadContacts(adminKey, silent);
    loadDeals(adminKey, silent);
  }, [loadContacts, loadDeals]);

  // --------------------------------------------------
  // LIVE AUTO-SYNC COUNTDOWN (10, 09, 08... 00 -> Sync -> 10)
  // --------------------------------------------------
  useEffect(() => {
    if (!key) return;

    // Initial load
    loadAllData(key, false);
  }, [key, loadAllData]);

  useEffect(() => {
    if (!key || !autoSync) {
      setCountdown(10);
      return;
    }

    // 1 second countdown interval
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadAllData(key, true);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    // Instant update when switching tab back from HubSpot to our app
    const handleFocus = () => {
      loadAllData(key, true);
      setCountdown(10);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [key, autoSync, loadAllData]);

  const handleManualRefresh = () => {
    loadAllData(key, false);
    setCountdown(10);
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Glow Accents */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Header Brand */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-blue-600/30">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Admin Dashboard Login
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Enter your secure admin authorization key
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin Key
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter security key..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Authorize & Enter</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}
            </form>

            {/* Back to Public Form */}
            <div className="pt-4 border-t border-slate-800 text-center">
              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-blue-400 font-semibold transition-colors inline-flex items-center gap-1.5"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactsCount={contacts.length}
        dealsCount={deals.length}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
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
            if (activeTab !== 'contacts' && activeTab !== 'deals') {
              setActiveTab('contacts');
            }
          }}
          onLogout={handleLogout}
          setIsMobileOpen={setIsMobileOpen}
          autoSync={autoSync}
          setAutoSync={setAutoSync}
          countdown={countdown}
          lastSyncedAt={lastSyncedAt}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              contacts={contacts}
              loading={loading}
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
              contacts={contacts}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onExportCSV={handleExportCSV}
              selectedContact={selectedContact}
              setSelectedContact={setSelectedContact}
            />
          )}

          {activeTab === 'deals' && (
            <DealsView
              deals={deals}
              loading={loading}
              error={error}
              contacts={contacts}
              onRefreshDeals={() => loadDeals(key, false)}
              adminKey={key}
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