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

function AnimatedNumber({ value, duration = 1200 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const targetValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;

    if (targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease-out curve for fluid count animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * targetValue));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    const handle = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(handle);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

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

  // Recent 6 contacts
  const recentContacts = contacts.slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-3">
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
              {loading ? '...' : <AnimatedNumber value={totalContacts} />}
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
              {loading ? '...' : <AnimatedNumber value={totalCompanies} />}
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
              {loading ? '...' : <AnimatedNumber value={totalDeals} />}
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
              {loading ? '...' : <AnimatedNumber value={totalSyncFailures} />}
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
        <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
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

          {/* Executive Channel Distribution & Analytics Card */}
          <div className="flex-1 flex flex-col justify-between bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EE3124]/10 via-[#F7941D]/10 to-amber-500/10 border border-[#EE3124]/20 flex items-center justify-center text-[#EE3124] shadow-2xs">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Lead Acquisition Channel Breakdown</h3>
                    <p className="text-xs text-slate-500 font-medium">Real-time breakdown & share of incoming lead traffic</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>3 Active Channels</span>
                </div>
              </div>

              {totalContacts === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  No contact submissions recorded yet to visualize channel breakdown.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stacked Visual Bar with Segment Labels */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Channel Traffic Distribution</span>
                      <span className="text-slate-400 font-medium">{totalContacts} Total Contacts Analyzed</span>
                    </div>

                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 shadow-inner gap-0.5 border border-slate-200/60">
                      {(() => {
                        const webCount = sourceCounts['Website Form'] || 0;
                        const adminCount = sourceCounts['Admin Dashboard'] || 0;
                        const hsCount = sourceCounts['HubSpot / Unknown'] || 0;
                        
                        const webPct = totalContacts > 0 ? (webCount / totalContacts) * 100 : 0;
                        const adminPct = totalContacts > 0 ? (adminCount / totalContacts) * 100 : 0;
                        const hsPct = totalContacts > 0 ? (hsCount / totalContacts) * 100 : 0;

                        return (
                          <>
                            {webPct > 0 && (
                              <div 
                                style={{ width: `${webPct}%` }}
                                className="h-full bg-gradient-to-r from-[#F7941D] to-[#EE3124] rounded-l-full first:rounded-l-full last:rounded-r-full transition-all duration-700 relative group cursor-pointer"
                                title={`Website Form: ${webCount} (${Math.round(webPct)}%)`}
                              />
                            )}
                            {adminPct > 0 && (
                              <div 
                                style={{ width: `${adminPct}%` }}
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 first:rounded-l-full last:rounded-r-full transition-all duration-700 relative group cursor-pointer"
                                title={`Admin Dashboard: ${adminCount} (${Math.round(adminPct)}%)`}
                              />
                            )}
                            {hsPct > 0 && (
                              <div 
                                style={{ width: `${hsPct}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-r-full first:rounded-l-full last:rounded-r-full transition-all duration-700 relative group cursor-pointer"
                                title={`HubSpot Direct: ${hsCount} (${Math.round(hsPct)}%)`}
                              />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 3 Metric Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        title: 'Website Form Leads',
                        tag: 'Website Originated',
                        count: sourceCounts['Website Form'] || 0,
                        icon: Globe,
                        color: 'text-[#EE3124]',
                        bgColor: 'bg-gradient-to-b from-orange-50/90 to-orange-50/30 border-orange-200/80',
                        pillColor: 'text-[#EE3124] bg-orange-100/80 border-orange-200',
                        badgeBg: 'from-[#F7941D] to-[#EE3124]',
                        barBg: 'bg-gradient-to-r from-[#F7941D] to-[#EE3124]'
                      },
                      {
                        title: 'Admin Dashboard',
                        tag: 'Manual Admin Created',
                        count: sourceCounts['Admin Dashboard'] || 0,
                        icon: Layout,
                        color: 'text-amber-600',
                        bgColor: 'bg-gradient-to-b from-amber-50/90 to-amber-50/30 border-amber-200/80',
                        pillColor: 'text-amber-800 bg-amber-100/80 border-amber-200',
                        badgeBg: 'from-amber-400 to-amber-500',
                        barBg: 'bg-amber-500'
                      },
                      {
                        title: 'HubSpot Direct / Other',
                        tag: 'HubSpot CRM Native',
                        count: sourceCounts['HubSpot / Unknown'] || 0,
                        icon: Building2,
                        color: 'text-blue-600',
                        bgColor: 'bg-gradient-to-b from-blue-50/90 to-indigo-50/30 border-blue-200/80',
                        pillColor: 'text-blue-800 bg-blue-100/80 border-blue-200',
                        badgeBg: 'from-blue-500 to-indigo-600',
                        barBg: 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      }
                    ].map((channel) => {
                      const percentage = totalContacts > 0 ? Math.round((channel.count / totalContacts) * 100) : 0;
                      const IconComponent = channel.icon;

                      return (
                        <div 
                          key={channel.title}
                          className={`p-4 rounded-2xl border ${channel.bgColor} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-xl bg-white shadow-2xs border border-slate-100 ${channel.color}`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{channel.title}</span>
                              </div>
                            </div>
                            <div className="mt-1">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border inline-block ${channel.pillColor}`}>
                                {channel.tag}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200/40">
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-2xl font-black text-slate-900 leading-none">
                                  <AnimatedNumber value={channel.count} />
                                </div>
                                <div className="text-[11px] font-semibold text-slate-400 mt-1">
                                  {channel.count === 1 ? 'Total contact' : 'Total contacts'}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg text-white bg-gradient-to-r ${channel.badgeBg} shadow-2xs`}>
                                  <AnimatedNumber value={percentage} />%
                                </span>
                              </div>
                            </div>
                            {/* Individual Micro Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mt-3">
                              <div 
                                className={`h-full ${channel.barBg} rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Executive Intelligence Summary Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Primary lead source: <strong className="text-slate-900 font-extrabold">HubSpot CRM Direct ({Math.round(((sourceCounts['HubSpot / Unknown'] || 0) / (totalContacts || 1)) * 100)}%)</strong>
                </span>
              </div>
              <button
                onClick={() => onNavigate('contacts')}
                className="text-xs font-extrabold text-[#EE3124] hover:text-[#d82417] flex items-center gap-1 hover:underline cursor-pointer shrink-0"
              >
                <span>Filter Directory by Origin</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Recent Submissions Feed */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#EE3124]/10 to-[#F7941D]/10 border border-[#EE3124]/20 flex items-center justify-center text-[#EE3124] shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Recent Submissions</h3>
                  <p className="text-xs text-slate-500 font-medium">Latest inbound lead stream</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('contacts')}
                className="text-xs font-extrabold text-[#EE3124] hover:text-[#d82417] flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentContacts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold">No contacts logged yet.</p>
                <button
                  onClick={() => onNavigate('preview')}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 text-[#EE3124] border border-orange-200 text-xs font-bold hover:bg-orange-100 cursor-pointer"
                >
                  Submit a Test Lead
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentContacts.map((c) => {
                  const source = c.lead_source || 'HubSpot / Unknown';
                  const initials = c.name 
                    ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                    : 'CD';
                  
                  // Source themes
                  const isWeb = source === 'Website Form';
                  const isAdmin = source === 'Admin Dashboard';
                  
                  const avatarBg = isWeb 
                    ? 'from-[#F7941D] to-[#EE3124]' 
                    : isAdmin 
                    ? 'from-amber-400 to-amber-500' 
                    : 'from-blue-500 to-indigo-600';

                  const badgeStyle = isWeb 
                    ? 'text-[#EE3124] bg-orange-50 border-orange-200' 
                    : isAdmin 
                    ? 'text-amber-800 bg-amber-50 border-amber-200' 
                    : 'text-blue-700 bg-blue-50 border-blue-200';

                  const badgeLabel = isWeb ? 'Website' : isAdmin ? 'Admin' : 'HubSpot';

                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectContact(c)}
                      className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 hover:bg-white hover:border-orange-200 hover:shadow-md hover:translate-x-1 transition-all duration-300 cursor-pointer group flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-[#EE3124] transition-colors truncate">
                              {c.name || 'Unnamed Contact'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate font-medium">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{c.email || 'No email provided'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {c.createdate ? new Date(c.createdate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' }) : 'Recent'}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${badgeStyle}`}>
                          {badgeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('contacts')}
            className="w-full mt-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all shadow-md shadow-slate-900/10 hover:shadow-slate-900/20 flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <span>Open Full Directory Manager</span>
            <ArrowUpRight className="w-4 h-4 text-[#F7941D]" />
          </button>
        </div>
      </div>
    </div>
  );
}


