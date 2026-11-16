import { useState, useEffect, useMemo } from 'react';
import OverviewSkeleton from './OverviewSkeleton';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Building2, 
  Briefcase, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert,
  ArrowUpRight, 
  Mail, 
  Sparkles, 
  Download, 
  ChevronRight, 
  MessageSquare, 
  Activity, 
  Layout, 
  Lock, 
  DollarSign, 
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock
} from 'lucide-react';
import { getSourceBadge, DEAL_STAGES } from './ContactsView';

// Stage name formatter for human-readable HubSpot pipeline labels
const STAGE_NAME_MAP = {
  appointmentscheduled: 'Appointment Scheduled',
  qualifiedtobuy: 'Qualified to Buy',
  presentationscheduled: 'Presentation Scheduled',
  decisionmakerboughtin: 'Decision Maker Bought-In',
  contractsent: 'Contract Sent',
  closedwon: 'Closed Won',
  closedlost: 'Closed Lost',
  'hs-fco-trs-sold': 'Closed / Sold',
  'hs_fco_trs_sold': 'Closed / Sold',
};

function formatDealStage(stage) {
  if (!stage) return 'General Pipeline';
  const key = String(stage).toLowerCase().trim();
  if (STAGE_NAME_MAP[key]) return STAGE_NAME_MAP[key];
  return stage
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function AnimatedNumber({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState(() => (typeof value === 'number' ? value : parseInt(value, 10) || 0));

  useEffect(() => {
    let startTimestamp = null;
    let handle;
    const targetValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    const startValue = displayValue;

    if (startValue === targetValue) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (targetValue - startValue) * easeOut));

      if (progress < 1) {
        handle = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    handle = window.requestAnimationFrame(step);
    return () => {
      if (handle) window.cancelAnimationFrame(handle);
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export default function OverviewView({ 
  contacts = [], 
  companies = [], 
  deals = [], 
  errorLogs = [], 
  activities = [],
  loading, 
  initialLoading, 
  onNavigate, 
  onExportCSV, 
  onSelectContact 
}) {
  const { can } = useAuth() || {};
  const canViewContacts = can ? can('view', 'contacts') : true;
  const canViewCompanies = can ? can('view', 'companies') : true;
  const canViewDeals = can ? can('view', 'deals') : true;
  const canViewLogs = can ? can('view', 'logs') : true;
  const canViewActivity = can ? can('view', 'activity') : true;

  // Active right column tab: 'contacts' | 'activities'
  const [activeRightTab, setActiveRightTab] = useState('contacts');

  // Analytics Metrics
  const totalContacts = contacts.length;
  const totalCompanies = companies.length;
  const totalDeals = deals.length;
  const totalSyncFailures = errorLogs.filter(log => !log.resolved).length;

  // Total Pipeline Dollar Value
  const totalPipelineAmount = useMemo(() => {
    return deals.reduce((sum, d) => {
      const cleaned = String(d.amount || '0').replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return sum + (isNaN(num) || num < 0 ? 0 : num);
    }, 0);
  }, [deals]);

  // Today's Contacts count
  const todayStr = new Date().toISOString().split('T')[0];
  const todayContactsCount = useMemo(() => {
    return contacts.filter(c => {
      if (!c.createdate) return false;
      const dateStr = new Date(c.createdate).toISOString().split('T')[0];
      return dateStr === todayStr;
    }).length;
  }, [contacts, todayStr]);

  // Lead Source breakdown
  const { adminCount, hsCount, webCount } = useMemo(() => {
    let admin = 0;
    let hs = 0;
    let web = 0;

    for (const c of contacts) {
      const src = (c.lead_source || '').toLowerCase();
      const author = (c.created_by || '').toLowerCase();
      if (src.includes('website') || src.includes('public') || author.includes('website') || author.includes('public')) {
        web++;
      } else if (src.includes('admin') || src.includes('bridge') || src.includes('portal') || c.created_by_user_id) {
        admin++;
      } else {
        hs++;
      }
    }

    return { adminCount: admin, hsCount: hs, webCount: web };
  }, [contacts]);

  const adminPct = totalContacts > 0 ? Math.round((adminCount / totalContacts) * 100) : 0;
  const hsPct = totalContacts > 0 ? Math.round((hsCount / totalContacts) * 100) : 0;
  const webPct = totalContacts > 0 ? Math.round((webCount / totalContacts) * 100) : 0;

  // Pipeline Stage Distribution (Formatted & Sorted)
  const stageDistribution = useMemo(() => {
    const stageMap = {};
    for (const d of deals) {
      const stageName = d.dealstage || 'appointmentscheduled';
      stageMap[stageName] = (stageMap[stageName] || 0) + 1;
    }
    return Object.entries(stageMap)
      .map(([rawStage, count]) => ({
        rawStage,
        label: formatDealStage(rawStage),
        count,
        pct: totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [deals, totalDeals]);

  // Recent contacts (newest first, up to 6)
  const recentContacts = useMemo(() => {
    return [...contacts]
      .sort((a, b) => new Date(b.createdate || 0) - new Date(a.createdate || 0))
      .slice(0, 6);
  }, [contacts]);

  // Recent activities (newest first, up to 6)
  const recentActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 6);
  }, [activities]);

  if (initialLoading) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="flex flex-col space-y-4 animate-fade-in font-sans w-full pb-8">

      {/* 1. Executive Operations Bar (Streamlined & Compact) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-4.5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EE3124]/10 via-[#F7941D]/15 to-orange-500/10 border border-orange-200/80 flex items-center justify-center text-[#EE3124] shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5 text-[#F7941D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Two-Way CRM Operations Hub
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live 2-Way Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live bi-directional synchronization with HubSpot CRM API v3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {canViewContacts && (
            <button
              onClick={() => onNavigate('contacts')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Contacts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {canViewContacts && (
            <button
              onClick={onExportCSV}
              disabled={totalContacts === 0}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Executive Metric Cards Grid (4 Core Vitals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 shrink-0">
        {/* Total Contacts */}
        <div 
          onClick={() => canViewContacts && onNavigate('contacts')}
          className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all group ${
            canViewContacts ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'opacity-85'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Contacts Directory
            </span>
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-transform ${
              canViewContacts 
                ? 'bg-orange-50 text-[#EE3124] border-orange-200/80 group-hover:scale-110 shadow-2xs' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
              {canViewContacts ? <Users className="w-4.5 h-4.5" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {!canViewContacts ? '—' : loading ? '...' : <AnimatedNumber value={totalContacts} />}
            </div>
            {canViewContacts && (
              <div className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active Leads
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>{canViewContacts ? `${todayContactsCount} new lead${todayContactsCount !== 1 ? 's' : ''} added today` : 'Restricted by admin'}</span>
            {canViewContacts && <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#EE3124] transition-colors" />}
          </p>
        </div>

        {/* Total Companies */}
        <div 
          onClick={() => canViewCompanies && onNavigate('companies')}
          className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all group ${
            canViewCompanies ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'opacity-85'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Companies Directory
            </span>
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-transform ${
              canViewCompanies 
                ? 'bg-amber-50 text-[#F7941D] border-amber-200/80 group-hover:scale-110 shadow-2xs' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
              {canViewCompanies ? <Building2 className="w-4.5 h-4.5" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {!canViewCompanies ? '—' : loading ? '...' : <AnimatedNumber value={totalCompanies} />}
            </div>
            {canViewCompanies && (
              <div className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                Organizations
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>{canViewCompanies ? 'Associated CRM company accounts' : 'Restricted by admin'}</span>
            {canViewCompanies && <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F7941D] transition-colors" />}
          </p>
        </div>

        {/* Total Deals & Pipeline Value */}
        <div 
          onClick={() => canViewDeals && onNavigate('deals')}
          className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all group ${
            canViewDeals ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'opacity-85'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Deals & Sales Pipeline
            </span>
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-transform ${
              canViewDeals 
                ? 'bg-purple-50 text-purple-600 border-purple-200/80 group-hover:scale-110 shadow-2xs' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
              {canViewDeals ? <Briefcase className="w-4.5 h-4.5" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {!canViewDeals ? '—' : loading ? '...' : <AnimatedNumber value={totalDeals} />}
            </div>
            {canViewDeals && totalPipelineAmount > 0 ? (
              <div className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                ${totalPipelineAmount.toLocaleString()}
              </div>
            ) : (
              <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                Pipeline Deals
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>{canViewDeals ? `${stageDistribution.length} active stages tracked` : 'Restricted by admin'}</span>
            {canViewDeals && <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />}
          </p>
        </div>

        {/* Sync Health & Failures */}
        <div 
          onClick={() => canViewLogs && onNavigate('error-logs')}
          className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all group ${
            canViewLogs ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'opacity-85'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Sync Health & Parity
            </span>
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-transform ${
              !canViewLogs
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : totalSyncFailures > 0
                ? 'bg-rose-50 text-rose-600 border-rose-200 group-hover:scale-110 shadow-2xs'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:scale-110 shadow-2xs'
            }`}>
              {!canViewLogs ? <Lock className="w-3.5 h-3.5" /> : totalSyncFailures > 0 ? <ShieldAlert className="w-4.5 h-4.5" /> : <ShieldCheck className="w-4.5 h-4.5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {!canViewLogs ? '—' : loading ? '...' : <AnimatedNumber value={totalSyncFailures} />}
            </div>
            {!canViewLogs ? (
              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                Restricted
              </div>
            ) : (
              <div className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1.5 ${
                totalSyncFailures > 0 
                  ? 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${totalSyncFailures > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                {totalSyncFailures > 0 ? 'Issues Detected' : 'All Clear'}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>{canViewLogs ? 'HubSpot 2-Way Sync Active' : 'Restricted by admin'}</span>
            {canViewLogs && <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />}
          </p>
        </div>
      </div>

      {/* 3. Main Operational Intelligence Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 w-full items-start">
        
        {/* Left Column (2 cols): Channel Breakdown & Deals Matrix */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          
          {/* CRM Channel Breakdown Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EE3124]/10 via-[#F7941D]/10 to-amber-500/10 border border-[#EE3124]/20 flex items-center justify-center text-[#EE3124] shadow-2xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                    CRM Lead Ingestion & Channel Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Attribution split across portal submissions, HubSpot CRM sync, and public forms
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Data Sync</span>
              </div>
            </div>

            {totalContacts === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No contacts synchronized yet.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Distribution Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Channel Traffic Share</span>
                    <span className="text-slate-400 font-medium">{totalContacts} Total Contacts Analyzed</span>
                  </div>

                  <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 shadow-inner gap-1 border border-slate-200/70">
                    {adminPct > 0 && (
                      <div 
                        style={{ width: `${adminPct}%` }}
                        className="h-full bg-gradient-to-r from-amber-400 to-[#F7941D] rounded-full transition-all duration-700"
                        title={`Bridge Portal: ${adminCount} (${adminPct}%)`}
                      />
                    )}
                    {hsPct > 0 && (
                      <div 
                        style={{ width: `${hsPct}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700"
                        title={`HubSpot CRM: ${hsCount} (${hsPct}%)`}
                      />
                    )}
                    {webPct > 0 && (
                      <div 
                        style={{ width: `${webPct}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-700"
                        title={`Website Forms: ${webCount} (${webPct}%)`}
                      />
                    )}
                  </div>
                </div>

                {/* 2 Channel Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bridge Portal Card */}
                  <div className="p-4 sm:p-5 rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-white border border-amber-200/80 text-amber-600 shadow-2xs">
                          <Layout className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">Bridge Portal</div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-block mt-0.5">
                            Portal Created & Synced
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl text-white bg-gradient-to-r from-amber-400 to-[#F7941D] shadow-2xs">
                        {adminPct}%
                      </span>
                    </div>

                    <div className="pt-2 border-t border-amber-200/50 flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-black text-slate-900 leading-none">
                          <AnimatedNumber value={adminCount} />
                        </div>
                        <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
                          Total portal contacts
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-amber-700 hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => onNavigate('contacts')}>
                        <span>View leads</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* HubSpot CRM Card */}
                  <div className="p-4 sm:p-5 rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/30 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-white border border-blue-200/80 text-blue-600 shadow-2xs">
                          <Building2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">HubSpot Direct</div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 inline-block mt-0.5">
                            CRM & Webhooks
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-2xs">
                        {hsPct}%
                      </span>
                    </div>

                    <div className="pt-2 border-t border-blue-200/50 flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-black text-slate-900 leading-none">
                          <AnimatedNumber value={hsCount} />
                        </div>
                        <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
                          Total HubSpot CRM leads
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => onNavigate('contacts')}>
                        <span>View leads</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deals Pipeline Stages Progression Matrix */}
          {canViewDeals && deals.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                      Active Sales Deals & Pipeline Stages
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Overview of current deals tracked in the HubSpot sales pipeline
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('deals')}
                  className="text-xs font-extrabold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Open Pipeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Formatted Deal Stage Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {stageDistribution.map(({ rawStage, label, count, pct }, idx) => {
                  const stageColors = [
                    { bg: 'bg-purple-500', pill: 'text-purple-700 bg-purple-50 border-purple-200' },
                    { bg: 'bg-indigo-500', pill: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                    { bg: 'bg-blue-500', pill: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { bg: 'bg-emerald-500', pill: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  ][idx % 4];

                  return (
                    <div 
                      key={rawStage} 
                      onClick={() => onNavigate('deals')}
                      className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/70 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border text-slate-600 bg-white shadow-2xs">
                          Stage {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {pct}%
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-extrabold text-slate-900 truncate group-hover:text-purple-600 transition-colors" title={label}>
                          {label}
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-0.5">
                          {count} <span className="text-xs font-bold text-slate-400 font-sans">{count === 1 ? 'deal' : 'deals'}</span>
                        </div>
                      </div>

                      {/* Mini visual progress bar */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.max(pct, 8)}%` }} 
                          className={`h-full ${stageColors.bg} rounded-full transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Recent Contacts / Live Activity Stream */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex flex-col">
            {/* Header Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setActiveRightTab('contacts')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeRightTab === 'contacts'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Recent Contacts
                </button>
                {canViewActivity && activities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('activities')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeRightTab === 'activities'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Activity Feed
                  </button>
                )}
              </div>

              <button
                onClick={() => onNavigate(activeRightTab === 'contacts' ? 'contacts' : 'activity-feed')}
                className="text-xs font-extrabold text-[#EE3124] hover:text-[#d82417] flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TAB CONTENT: Recent Contacts */}
            {activeRightTab === 'contacts' && (
              <div className="mt-3">
                {!canViewContacts ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Lock className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">Access Restricted</p>
                  </div>
                ) : loading ? (
                  <div className="space-y-2.5 py-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : recentContacts.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold">No contacts found</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentContacts.map((c) => {
                      const initials = c.name 
                        ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                        : 'LD';

                      // Distinguish avatar backgrounds by source
                      const isPortal = (c.lead_source || '').toLowerCase().includes('bridge') || 
                                       (c.lead_source || '').toLowerCase().includes('portal') || 
                                       Boolean(c.created_by_user_id);
                      
                      const avatarBg = isPortal
                        ? 'from-[#F7941D] to-[#EE3124]'
                        : 'from-blue-500 to-indigo-600';

                      return (
                        <div
                          key={c.id}
                          onClick={() => onSelectContact && onSelectContact(c)}
                          className="py-2.5 px-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-orange-200 hover:shadow-md hover:translate-x-1 transition-all duration-300 cursor-pointer group flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-[#EE3124] transition-colors truncate">
                                {c.name || 'Unnamed Lead'}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 truncate font-medium mt-0.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{c.email || 'No email'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              {c.createdate ? new Date(c.createdate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : 'Recent'}
                            </span>
                            {getSourceBadge(c.lead_source, c.created_by)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Activity Stream */}
            {activeRightTab === 'activities' && (
              <div className="mt-3">
                {recentActivities.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold">No sync activities recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentActivities.map((act) => (
                      <div
                        key={act.id}
                        className="py-2.5 px-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white transition-all text-xs flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate">
                            {act.message || 'Sync operation'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {canViewContacts && (
            <button
              onClick={() => onNavigate(activeRightTab === 'contacts' ? 'contacts' : 'activity-feed')}
              className="w-full mt-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all shadow-md shadow-slate-900/10 hover:shadow-slate-900/20 flex items-center justify-center gap-2 cursor-pointer border-0 shrink-0"
            >
              <span>{activeRightTab === 'contacts' ? 'Open Contacts Directory' : 'Open Activity Stream'}</span>
              <ArrowUpRight className="w-4 h-4 text-[#F7941D]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
