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
  UserCheck,
  Crown,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StarkEdgeLogo from '../StarkEdgeLogo';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, contactsCount, companiesCount, dealsCount, errorLogsCount, retryQueueCount, onLogout, isMobileOpen, setIsMobileOpen, initialLoading }) {
  const { user, isSuperAdmin, logout, can } = useAuth();

  const handleLogoutClick = () => {
    logout();
    if (onLogout) onLogout();
  };

  const mainNavItems = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Analytics & Activity'
    },
    ...(can('view', 'contacts') ? [{
      id: 'contacts',
      label: 'Contacts Directory',
      icon: Users,
      badge: initialLoading ? '...' : (contactsCount !== undefined ? contactsCount : null),
      description: 'Manage Leads'
    }] : []),
    ...(can('view', 'companies') ? [{
      id: 'companies',
      label: 'Companies Directory',
      icon: Building2,
      badge: initialLoading ? '...' : (companiesCount !== undefined ? companiesCount : null),
      badgeColor: 'bg-orange-50 text-orange-600 border-orange-200',
      description: 'HubSpot Orgs'
    }] : []),
    ...(can('view', 'deals') ? [{
      id: 'deals',
      label: 'Deals & Pipeline',
      icon: Briefcase,
      badge: initialLoading ? '...' : (dealsCount !== undefined ? dealsCount : null),
      badgeColor: 'bg-[#EE3124]/10 text-[#EE3124] border-[#EE3124]/20',
      description: 'Sales Stages'
    }] : [])
  ];

  const systemNavItems = [
    ...(can('view', 'activity') ? [{
      id: 'activity-feed',
      label: 'Activity Feed',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      description: 'Sync Stream Log'
    }] : []),
    ...(can('view', 'logs') ? [{
      id: 'error-logs',
      label: 'Sync Error History',
      icon: ShieldAlert,
      badge: initialLoading ? '...' : (errorLogsCount !== undefined ? errorLogsCount : null),
      badgeColor: errorLogsCount > 0 ? 'bg-rose-500/10 text-rose-600 border-rose-200 font-extrabold' : 'bg-emerald-50 text-emerald-600 border-emerald-200 font-bold',
      description: 'Audit Sync Failures'
    }] : []),
    ...(can('view', 'retry') ? [{
      id: 'retry-queue',
      label: 'Retry Queue',
      icon: RotateCw,
      badge: initialLoading ? '...' : (retryQueueCount !== undefined ? retryQueueCount : 0),
      badgeColor: retryQueueCount > 0 ? 'bg-orange-500/10 text-orange-600 border-orange-200 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200',
      description: 'Re-sync Operations'
    }] : []),
    ...(isSuperAdmin ? [{
      id: 'team-members',
      label: 'Team Members',
      icon: UserCheck,
      badge: (
        <span className="flex items-center gap-1 font-extrabold">
          <Crown className="w-3 h-3 text-purple-600 shrink-0" />
          <span>Admin</span>
        </span>
      ),
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/90 font-extrabold',
      description: 'Roles & Access'
    }] : []),
    ...(isSuperAdmin ? [{
      id: 'settings',
      label: 'Settings & Sync',
      icon: Settings,
      badge: 'v3',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200 font-bold',
      description: 'Webhooks & Config'
    }] : [])
  ];

  const getRoleLabel = (role) => {
    if (role === 'super_admin' || role === 'super admin') return 'Super Admin';
    return 'Team Member';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Floating White Sidebar Card */}
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

          {/* Two-Way CRM Sync Badge */}
          <div className="px-4 py-3 shrink-0">
            <a
              href="https://app.hubspot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-orange-50/80 hover:from-orange-100 hover:to-amber-100 border border-orange-200/80 text-xs font-bold text-[#EE3124] transition-all group shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-800 font-extrabold">HubSpot CRM ↔ Bridge</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
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
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EE3124]' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm leading-tight truncate">{item.label}</div>
                        <div className={`text-[10px] truncate ${isActive ? 'text-[#EE3124]/80' : 'text-slate-400'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge !== null && (
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border whitespace-nowrap shrink-0 inline-flex items-center ${item.badgeColor ||
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
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EE3124]' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="font-bold text-xs leading-tight truncate">{item.label}</div>
                        <div className={`text-[10px] truncate ${isActive ? 'text-[#EE3124]/80' : 'text-slate-400'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge !== null && (
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border whitespace-nowrap shrink-0 inline-flex items-center ${item.badgeColor ||
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

        {/* Executive Light Sidebar User Profile Card */}
        <div className="p-3 m-3 rounded-2xl bg-gradient-to-r from-slate-50 via-orange-50/20 to-slate-50 border border-slate-200/80 hover:border-orange-200 hover:shadow-sm transition-all duration-300 group shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Initials Avatar */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] flex items-center justify-center font-black text-white text-xs shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                {user?.name 
                  ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                  : 'A'}
              </div>

              {/* User Details */}
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-extrabold text-slate-900 truncate group-hover:text-[#EE3124] transition-colors">
                  {user?.name || 'Admin User'}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                    isSuperAdmin
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Action */}
            <button
              onClick={handleLogoutClick}
              title="Logout Session"
              className="p-2 rounded-xl text-slate-400 hover:text-[#EE3124] hover:bg-orange-50 hover:border-orange-200 transition-all shrink-0 cursor-pointer border border-transparent"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}


