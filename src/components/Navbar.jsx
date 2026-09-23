import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import StarkEdgeLogo from './StarkEdgeLogo';

export default function Navbar() {
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

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <StarkEdgeLogo className="h-8 sm:h-9 w-auto hover:opacity-90 transition-opacity" />
            <div className="hidden sm:block border-l border-slate-200 pl-3 py-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-800 group-hover:text-[#EE3124] transition-colors">
                  Local Form Bridge
                </span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-orange-50 text-[#EE3124] border border-orange-200 rounded-full">
                  HubSpot CRM
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                health.loading
                  ? 'bg-slate-100 border-slate-200 text-slate-400'
                  : health.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
              title={health.message}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  health.loading ? 'bg-slate-400' : health.connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
              {health.connected ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>
                {health.loading
                  ? 'Checking HubSpot...'
                  : health.connected
                  ? 'HubSpot API Connected'
                  : 'HubSpot API Disconnected'}
              </span>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all hover:shadow-lg group cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 group-hover:rotate-6 transition-transform" />
              <span>Admin Dashboard</span>
              <Sparkles className="w-3.5 h-3.5 text-orange-100" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
