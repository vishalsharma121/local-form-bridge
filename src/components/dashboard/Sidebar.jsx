import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  FileCode2, 
  Settings, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Sidebar({ activeTab, setActiveTab, contactsCount, dealsCount, onLogout, isMobileOpen, setIsMobileOpen }) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Analytics & Activity'
    },
    {
      id: 'contacts',
      label: 'Contacts Directory',
      icon: Users,
      badge: contactsCount !== undefined ? contactsCount : null,
      description: 'Manage & Export Leads'
    },
    {
      id: 'deals',
      label: 'Deals & Pipeline',
      icon: Briefcase,
      badge: dealsCount !== undefined ? dealsCount : null,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      description: 'HubSpot Deals & Stages'
    },
    {
      id: 'preview',
      label: 'Live Form Tester',
      icon: FileCode2,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Interactive Showcase'
    },
    {
      id: 'settings',
      label: 'Settings & API',
      icon: Settings,
      badge: null,
      description: 'System Diagnostics'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block">
                Form Bridge
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Admin Console
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Link to Public Site */}
        <div className="px-4 py-3">
          <Link
            to="/"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white transition-all group"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Public Contact Form</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                      item.badgeColor ||
                      (isActive
                        ? 'bg-white/20 text-white border-white/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Account & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs">
                AD
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">Administrator</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Authenticated
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Logout Session"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
