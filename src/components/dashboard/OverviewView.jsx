import { useState, useEffect } from 'react';
import OverviewSkeleton from './OverviewSkeleton';
import { 
  Users, 
  Building2,
  Briefcase,
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert,
  ArrowUpRight, 
  Mail, 
  Sparkles, 
  Download,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe,
  Layout,
  Layers
} from 'lucide-react';

export default function OverviewView({ contacts = [], companies = [], deals = [], errorLogs = [], loading, initialLoading, onNavigate, onExportCSV, onSelectContact }) {
  const [health, setHealth] = useState({ connected: false, loading: true, message: '' });

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/hubspot-health');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setHealth({ connected: data.connected, loading: false, message: data.message });
          }
        }
      } catch {
        if (isMounted) {
          setHealth({ connected: false, loading: false, message: 'Network error checking health' });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (initialLoading) {
    return <OverviewSkeleton />;
  }

  // Compute analytics metrics
  const totalContacts = contacts.length;
  const totalCompanies = companies.length;
  const totalDeals = deals.length;
  const totalSyncFailures = errorLogs.filter(log => !log.resolved).length;

  // Calculate today's contacts
  const todayStr = new Date().toISOString().split('T')[0];
  const todayContacts = contacts.filter(c => {
    if (!c.createdate) return false;
    const dateStr = new Date(c.createdate).toISOString().split('T')[0];
    return dateStr === todayStr;
  });

  // Calculate lead source distribution
  const sourceCounts = contacts.reduce((acc, c) => {
    const s = c.lead_source || 'HubSpot / Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Calculate subject breakdown
  const subjectCounts = contacts.reduce((acc, c) => {
    const s = c.subject || 'General Inquiry';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Recent 5 contacts
  const recentContacts = contacts.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-10">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Contacts */}
        <div 
          onClick={() => onNavigate('contacts')}
          className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contacts Directory
            </span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#EE3124] flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : totalContacts}
            </div>
            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <TrendingUp className="w-3 h-3 mr-1" />
              Active Leads
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {todayContacts.length} submission{todayContacts.length !== 1 ? 's' : ''} today
          </p>
        </div>

        {/* Total Companies */}
        <div 
          onClick={() => onNavigate('companies')}
          className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Companies Directory
            </span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#F7941D] flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : totalCompanies}
            </div>
            <div className="text-xs font-bold text-[#F7941D] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
              HubSpot Orgs
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Associated company profiles
          </p>
        </div>

        {/* Total Deals */}
        <div 
          onClick={() => onNavigate('deals')}
          className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Deals & Sales Pipeline
            </span>
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#EE3124] flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : totalDeals}
            </div>
            <div className="text-xs font-bold text-[#EE3124] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
              Pipeline Deals
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Active sales opportunities
          </p>
        </div>

        {/* Sync Failures (Error History) */}
        <div 
          onClick={() => onNavigate('error-logs')}
          className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sync Health & Errors
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform ${
              totalSyncFailures > 0
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {totalSyncFailures > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : totalSyncFailures}
            </div>
            <div className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              totalSyncFailures > 0 
                ? 'text-rose-600 bg-rose-50 border-rose-200 animate-pulse'
                : 'text-emerald-600 bg-emerald-50 border-emerald-200'
            }`}>
              {totalSyncFailures > 0 ? 'Action Needed' : 'All Systems Clear'}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center justify-between font-medium">
            <span>Click to audit sync errors</span>
            <ArrowUpRight className={`w-3.5 h-3.5 transition-colors ${
              totalSyncFailures > 0 ? 'group-hover:text-rose-500' : 'group-hover:text-emerald-500'
            }`} />
          </p>
        </div>
      </div>

      {/* Main Section: Operations Banner, Breakdown & Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Operations Banner & Subject Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 via-red-500/5 to-orange-500/10 bg-white rounded-3xl p-6 border border-orange-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-[#EE3124] text-xs font-extrabold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#F7941D]" />
                  <span>StarkEdge Integration Platform</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Form Bridge Operations Hub</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed font-medium">
                  Monitor live lead submissions from your public website form, review lead sources across Contacts, Companies, and Deals, or trigger live re-sync operations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => onNavigate('contacts')}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 border-0 cursor-pointer"
                >
                  <span>View All Contacts</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onExportCSV}
                  disabled={totalContacts === 0}
                  className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lead Source Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Website Form Leads</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {sourceCounts['Website Form'] || 0}
              </div>
              <div className="text-[10px] font-bold text-[#EE3124] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 inline-block mt-2">
                Website Originated
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Dashboard</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {sourceCounts['Admin Dashboard'] || 0}
              </div>
              <div className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block mt-2">
                Manual Admin Created
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">HubSpot Direct / Other</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {sourceCounts['HubSpot / Unknown'] || 0}
              </div>
              <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-2">
                HubSpot CRM Native
              </div>
            </div>
          </div>

          {/* Inquiry Subject Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Inquiry Subject Breakdown</h3>
                <p className="text-xs text-slate-500 font-medium">Distribution of inbound lead requests by topic</p>
              </div>
              <span className="text-xs font-extrabold text-[#EE3124] bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                {Object.keys(subjectCounts).length} Categories
              </span>
            </div>

            {totalContacts === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No contact submissions recorded yet to visualize breakdown.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(subjectCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([subject, count]) => {
                    const percentage = Math.round((count / totalContacts) * 100);
                    return (
                      <div key={subject} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-800">{subject}</span>
                          <span className="text-slate-500 font-bold">
                            {count} contact{count !== 1 ? 's' : ''} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#F7941D] to-[#EE3124] rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Recent Submissions Feed */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Recent Submissions</h3>
                <p className="text-xs text-slate-500 font-medium">Latest inbound lead stream</p>
              </div>
              <button
                onClick={() => onNavigate('contacts')}
                className="text-xs font-extrabold text-[#EE3124] hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentContacts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold">No contacts logged yet.</p>
                <button
                  onClick={() => onNavigate('preview')}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 text-[#EE3124] border border-orange-200 text-xs font-bold hover:bg-orange-100"
                >
                  Submit a Test Lead
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentContacts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectContact(c)}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-orange-50/60 hover:border-orange-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 group-hover:text-[#EE3124] transition-colors truncate">
                        {c.name || 'Unnamed Contact'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {c.createdate ? new Date(c.createdate).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 truncate font-medium">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email || 'No email provided'}</span>
                    </div>

                    {c.subject && (
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-[#EE3124] border border-orange-200">
                        {c.subject}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('contacts')}
            className="w-full mt-4 py-3 rounded-2xl border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>Open Directory Manager</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#F7941D]" />
          </button>
        </div>
      </div>
    </div>
  );
}


