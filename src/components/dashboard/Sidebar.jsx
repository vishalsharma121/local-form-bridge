import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldAlert,
  Activity,
  RotateCw,
  FileCode2,
  Settings,
  LogOut,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StarkEdgeLogo from '../StarkEdgeLogo';

export default function Sidebar({ activeTab, setActiveTab, contactsCount, companiesCount, dealsCount, errorLogsCount, retryQueueCount, onLogout, isMobileOpen, setIsMobileOpen, initialLoading }) {
  const mainNavItems = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Analytics & Activity'
    },
    {
      id: 'contacts',
      label: 'Contacts Directory',
      icon: Users,
      badge: initialLoading ? '...' : (contactsCount !== undefined ? contactsCount : null),
      description: 'Manage Leads'
    },
    {
      id: 'companies',
      label: 'Companies Directory',
      icon: Building2,
      badge: initialLoading ? '...' : (companiesCount !== undefined ? companiesCount : null),
      badgeColor: 'bg-orange-50 text-orange-600 border-orange-200',
      description: 'HubSpot Orgs'
    },
    {
      id: 'deals',
      label: 'Deals & Pipeline',
      icon: Briefcase,
      badge: initialLoading ? '...' : (dealsCount !== undefined ? dealsCount : null),
      badgeColor: 'bg-[#EE3124]/10 text-[#EE3124] border-[#EE3124]/20',
      description: 'Sales Stages'
    }
  ];

  const systemNavItems = [
    {
      id: 'error-logs',
      label: 'Sync Error History',
      icon: ShieldAlert,
      badge: initialLoading ? '...' : (errorLogsCount !== undefined ? errorLogsCount : null),
      badgeColor: errorLogsCount > 0 ? 'bg-rose-500/10 text-rose-600 border-rose-200 font-extrabold' : 'bg-emerald-50 text-emerald-600 border-emerald-200 font-bold',
      description: 'Audit Sync Failures'
    },
    {
      id: 'retry-queue',
      label: 'Retry Queue',
      icon: RotateCw,
      badge: initialLoading ? '...' : (retryQueueCount !== undefined ? retryQueueCount : 0),
      badgeColor: retryQueueCount > 0 ? 'bg-orange-500/10 text-orange-600 border-orange-200 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200',
      description: 'Re-sync Operations'
    },
    {
      id: 'activity-feed',
      label: 'Activity Feed',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      description: 'Sync Stream Log'
    },
    {
      id: 'preview',
      label: 'Live Form Tester',
      icon: FileCode2,
      badge: 'Live',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      description: 'Form Showcase'
    },
    {
      id: 'settings',
      label: 'Settings & API',
      icon: Settings,
      badge: null,
      description: 'Diagnostics'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Floating Figma-Style White Sidebar Card Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white text-slate-700 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:translate-x-0 lg:my-5 lg:ml-5 lg:rounded-3xl lg:shadow-[0_4px_24px_rgba(0,0,0,0.03)] lg:border lg:border-slate-200/80 overflow-hidden shrink-0 ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Brand Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100/80 shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <StarkEdgeLogo className="h-8 w-auto" />
            </Link>

            {/* Close button for mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Link to Public Site */}
          <div className="px-4 py-3 shrink-0">
            <Link
              to="/"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-50/80 to-red-50/60 hover:from-orange-100/90 hover:to-red-100/80 border border-orange-200/70 text-xs font-bold text-[#EE3124] transition-all group shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F7941D]" />
                <span>Public Contact Form</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-2 space-y-5 overflow-y-auto flex-1 min-h-0">
            {/* Main Navigation Group */}
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Analytics & Directories
              </div>

              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-xs sm:text-sm transition-all text-left outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ${isActive
                      ? 'bg-gradient-to-r from-orange-50 to-red-50 text-[#EE3124] font-bold shadow-2xs border-orange-200/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#EE3124]' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold text-xs sm:text-sm leading-tight">{item.label}</div>
                        <div className={`text-[10px] ${isActive ? 'text-[#EE3124]/80' : 'text-slate-400'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge !== null && (
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${item.badgeColor ||
                          (isActive
                            ? 'bg-[#EE3124]/10 text-[#EE3124] border-[#EE3124]/30'
                            : 'bg-slate-100 text-slate-500 border-slate-200/80')
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* System & Tools Navigation Group */}
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                System & Tools
              </div>

              {systemNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-xs transition-all text-left outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ${isActive
                      ? 'bg-gradient-to-r from-orange-50 to-red-50 text-[#EE3124] font-bold shadow-2xs border-orange-200/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#EE3124]' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold text-xs leading-tight">{item.label}</div>
                        <div className={`text-[10px] ${isActive ? 'text-[#EE3124]/80' : 'text-slate-400'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge !== null && (
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${item.badgeColor ||
                          (isActive
                            ? 'bg-[#EE3124]/10 text-[#EE3124] border-[#EE3124]/30'
                            : 'bg-slate-100 text-slate-500 border-slate-200/80')
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Account & Logout */}
        <div className="p-3.5 m-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F7941D] to-[#EE3124] flex items-center justify-center font-bold text-white text-xs shadow-md shadow-orange-500/20 shrink-0">
                SE
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-extrabold text-slate-800 truncate">Administrator</div>
                <div className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Authenticated
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Logout Session"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}


