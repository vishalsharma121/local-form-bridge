import { 
  Menu, 
  RefreshCw, 
  Search, 
  LogOut, 
  ChevronRight,
  ExternalLink,
  Radio,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header({
  activeTab,
  onRefresh,
  loading,
  searchQuery,
  setSearchQuery,
  onLogout,
  setIsMobileOpen,
  autoSync,
  setAutoSync,
  countdown = 10,
  lastSyncedAt
}) {
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview':
        return { title: 'Executive Overview', desc: 'Real-time metrics, analytics & activity stream' };
      case 'contacts':
        return { title: 'Contacts Directory', desc: 'Manage submissions, view details, and export data' };
      case 'deals':
        return { title: 'Deals & Sales Pipeline', desc: 'Manage HubSpot deals, stages, and company associations' };
      case 'preview':
        return { title: 'Form Showcase & Live Tester', desc: 'Test submission pipeline & debug logger' };
      case 'settings':
        return { title: 'System Settings & Diagnostics', desc: 'API health checks & credentials status' };
      default:
        return { title: 'Dashboard', desc: 'Management console' };
    }
  };

  const breadcrumb = getBreadcrumbTitle();
  const formattedCountdown = String(countdown).padStart(2, '0');

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 lg:hidden"
            aria-label="Open Mobile Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Bridge App
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-700 dark:text-slate-200 font-bold capitalize">{activeTab}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {breadcrumb.title}
            </h1>
          </div>
        </div>

        {/* Middle: Search Bar (Hidden on smaller screens, shown on md+) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Auto-Sync Countdown Toggle Button */}
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoSync
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title={
              autoSync
                ? `Auto-sync active. Refetches in ${formattedCountdown}s. Click to pause.`
                : 'Auto-sync paused. Click to enable 10s live countdown.'
            }
          >
            <Radio className={`w-3.5 h-3.5 ${autoSync ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            
            {autoSync ? (
              <span className="flex items-center gap-1 font-mono font-bold text-xs">
                <span>Sync in</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-extrabold border border-emerald-500/30">
                  {formattedCountdown}s
                </span>
              </span>
            ) : (
              <span>Auto-Sync Off</span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            title="Manual sync now"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {/* Public Link */}
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <span>Live Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Logout Action */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Sign out of admin session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
