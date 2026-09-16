import { Link } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  Form Bridge
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">HubSpot Lead Capture Platform</p>
            </div>
          </Link>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>HubSpot API Connected</span>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/30 group"
            >
              <LayoutDashboard className="w-4 h-4 group-hover:rotate-6 transition-transform" />
              <span>Admin Dashboard</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
