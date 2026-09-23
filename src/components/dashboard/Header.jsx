import { 
  Menu, 
  RefreshCw, 
  Search, 
  LogOut, 
  ChevronRight,
  Radio,
  CheckCircle2,
  Calendar,
  Download
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
  syncSuccess = false,
  dateRange = 'all',
  setDateRange,
  customStart = '',
  setCustomStart,
  customEnd = '',
  setCustomEnd
}) {
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview':
        return { title: 'Executive Overview', desc: 'Real-time CRM metrics, analytics & activity stream' };
      case 'contacts':
        return { title: 'Contacts Directory', desc: 'Manage lead submissions, view contact details, and export data' };
      case 'companies':
        return { title: 'Companies Directory', desc: 'Manage HubSpot company organizations and domains' };
      case 'deals':
        return { title: 'Deals & Sales Pipeline', desc: 'Manage HubSpot deals, stages, and company associations' };
      case 'error-logs':
        return { title: 'Sync Error History', desc: 'Audit sync failures and retry queue items' };
      case 'retry-queue':
        return { title: 'Retry Queue', desc: 'Manage automated re-sync pipeline operations' };
      case 'activity-feed':
        return { title: 'Activity Stream Log', desc: 'Live event stream of lead submissions & CRM updates' };
      case 'preview':
        return { title: 'Form Showcase & Live Tester', desc: 'Test lead submission pipeline & public form preview' };
      case 'settings':
        return { title: 'System Settings & Diagnostics', desc: 'API health checks & credentials status' };
      default:
        return { title: 'Analytics Dashboard', desc: 'Management console' };
    }
  };

  const breadcrumb = getBreadcrumbTitle();
  const formattedCountdown = String(countdown).padStart(2, '0');

  return (
    <header className="sticky top-0 lg:top-5 z-30 bg-white/95 backdrop-blur-md transition-all py-3.5 px-4 sm:px-6 lg:mt-5 lg:mr-5 lg:ml-0 lg:rounded-3xl border-b lg:border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        {/* Left: Title & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 lg:hidden"
            aria-label="Open Mobile Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Link to="/" className="hover:text-[#EE3124] transition-colors">
                StarkEdge
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-700 font-bold capitalize">{activeTab}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {breadcrumb.title}
            </h1>
          </div>
        </div>

        {/* Middle: Integrated Search Control */}
        <div className="flex items-center gap-3 flex-1 max-w-md mx-0 md:mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts, companies, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100/80 border border-slate-200/90 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions & Date Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Date Range Selector Pill */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Timeframe:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange && setDateRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All-time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5 ml-1 border-l border-slate-200 pl-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart && setCustomStart(e.target.value)}
                  className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-800"
                />
                <span className="text-[10px] text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd && setCustomEnd(e.target.value)}
                  className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Live Auto-Sync Toggle Button */}
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              autoSync
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={
              autoSync
                ? `Live Auto-sync active. Refetches in ${formattedCountdown}s. Click to pause.`
                : 'Auto-sync paused. Click to enable live countdown.'
            }
          >
            <Radio className={`w-3.5 h-3.5 ${autoSync ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            {autoSync ? (
              <span className="flex items-center gap-1 font-mono font-bold text-xs">
                <span>Sync in</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300/80">
                  {formattedCountdown}s
                </span>
              </span>
            ) : (
              <span>Auto-Sync Off</span>
            )}
          </button>

          {/* StarkEdge Gradient "Sync Now" Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border-0 shadow-sm disabled:opacity-60 cursor-pointer ${
              syncSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white shadow-orange-500/20 active:scale-95'
            }`}
            title="Force immediate sync of contacts, companies, and deals from HubSpot"
          >
            {syncSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                <span>Synced!</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
              </>
            )}
          </button>

          {/* Logout Action */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
            title="Sign out of admin session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}


