import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Database,
  Lock,
  Building2,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsView({ onLogout }) {
  const { getAuthHeaders, user, token, updateToken } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState(token || '');
  const [keySavedMessage, setKeySavedMessage] = useState('');

  useEffect(() => {
    if (token) {
      setNewKey(token);
    }
  }, [token]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    if (updateToken) {
      updateToken(newKey.trim());
    } else {
      localStorage.setItem('app_auth_token', newKey.trim());
    }
    setKeySavedMessage('Admin session key updated successfully!');
    setTimeout(() => setKeySavedMessage(''), 3000);
  };

  // Diagnostic ping state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  // App Settings state
  const [autoCreateEnabled, setAutoCreateEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [settingSuccessMsg, setSettingSuccessMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const res = await fetch('/api/settings', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const val = data.settings?.auto_create_company_deal;
          if (isMounted) {
            setAutoCreateEnabled(String(val).toLowerCase() === 'true');
          }
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, [getAuthHeaders]);

  const handleToggleAutoCreate = async () => {
    const nextVal = !autoCreateEnabled;
    setAutoCreateEnabled(nextVal);
    setSavingSetting(true);
    setSettingSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          key: 'auto_create_company_deal',
          value: String(nextVal),
        }),
      });
      if (res.ok) {
        setSettingSuccessMsg(`Auto-create Company & Deal turned ${nextVal ? 'ON' : 'OFF'}`);
        setTimeout(() => setSettingSuccessMsg(''), 3000);
      } else {
        setAutoCreateEnabled(!nextVal); // Revert on error
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
      setAutoCreateEnabled(!nextVal);
    } finally {
      setSavingSetting(false);
    }
  };

  const runDiagnosticPing = async () => {
    setPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/contacts', {
        headers: getAuthHeaders()
      });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        setPingResult({
          success: true,
          status: res.status,
          latency: `${latency}ms`,
          message: 'API server responded with HTTP 200 OK'
        });
      } else {
        setPingResult({
          success: false,
          status: res.status,
          latency: `${latency}ms`,
          message: `API returned error HTTP status ${res.status}`
        });
      }
    } catch (err) {
      setPingResult({
        success: false,
        status: 500,
        latency: 'N/A',
        message: err.message || 'Network connection failed'
      });
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Active Administrator Session & Security Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EE3124]/10 via-[#F7941D]/10 to-amber-500/10 border border-[#EE3124]/20 flex items-center justify-center text-[#EE3124]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Active Admin Session & Security</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Authenticated session context & role authorization status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Session Active & Authorized</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Logged In User</div>
            <div className="text-sm font-extrabold text-slate-900 mt-1 truncate">
              {user?.name || 'Administrator Account'}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
              {user?.email || 'admin@starkedge.com'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Role</div>
            <div className="mt-1">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-purple-600 text-white shadow-2xs inline-block">
                {user?.role ? user.role.toUpperCase() : 'SUPER ADMIN'}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-2">
              Full System Privileges
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">API Authentication</div>
              <div className="text-xs font-mono font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>JWT Bearer Key Encrypted</span>
              </div>
            </div>
            <div className="pt-2">
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Create Company & Deal Settings Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Auto-create Company & Deal Records</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure whether placeholder CRM records are automatically generated when form fields are left blank
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoCreate}
            disabled={savingSetting || loadingSettings}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 border shrink-0 disabled:opacity-50 ${
              autoCreateEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${autoCreateEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Auto-create Company & Deal: {autoCreateEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {settingSuccessMsg && (
          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{settingSuccessMsg}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <p>
            When <strong>enabled (ON)</strong>, Local Form Bridge will automatically create a placeholder Company and Deal in HubSpot for every contact, even if the form's Company/Deal fields are left blank.
          </p>
          <p className="text-slate-500">
            When <strong>disabled (OFF, recommended)</strong>, Company and Deal records are only created when the visitor explicitly provides that information in the contact form.
          </p>
        </div>
      </div>

      {/* Diagnostics Suite */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">API Health & Latency Test</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ping backend endpoint to measure roundtrip latency and authorization response
              </p>
            </div>
          </div>

          <button
            onClick={runDiagnosticPing}
            disabled={pinging}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
            <span>{pinging ? 'Pinging...' : 'Run Diagnostics'}</span>
          </button>
        </div>

        {pingResult && (
          <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
            pingResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {pingResult.message}
              </span>
              <span className="font-mono">{pingResult.latency}</span>
            </div>
            <p className="text-[11px] opacity-80">HTTP Status: {pingResult.status}</p>
          </div>
        )}
      </div>

      {/* System Route Reference */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">API Architecture Matrix</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#EE3124]" />
              <span>Lead Submission Endpoint</span>
            </div>
            <div className="font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 font-bold">
              POST /api/create-contact
            </div>
            <p className="text-[11px] text-slate-500">Public lead capture handler with automatic HubSpot lookup & upsert logic.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#F7941D]" />
              <span>Contacts List Endpoint</span>
            </div>
            <div className="font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 font-bold">
              GET /api/contacts
            </div>
            <p className="text-[11px] text-slate-500">Requires header <code className="text-[#EE3124]">x-admin-key</code> matching process.env.ADMIN_KEY.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

