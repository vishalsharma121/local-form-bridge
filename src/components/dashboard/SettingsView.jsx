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
  Building2
} from 'lucide-react';

export default function SettingsView({ adminKey, onUpdateKey }) {
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState(adminKey || '');
  const [keySavedMessage, setKeySavedMessage] = useState('');

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
      if (!adminKey) return;
      setLoadingSettings(true);
      try {
        const res = await fetch('/api/settings', {
          headers: { 'x-admin-key': adminKey },
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
  }, [adminKey]);

  const handleToggleAutoCreate = async () => {
    const nextVal = !autoCreateEnabled;
    setAutoCreateEnabled(nextVal);
    setSavingSetting(true);
    setSettingSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
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

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    onUpdateKey(newKey.trim());
    setKeySavedMessage('Admin key updated successfully!');
    setTimeout(() => setKeySavedMessage(''), 3000);
  };

  const runDiagnosticPing = async () => {
    setPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/contacts', {
        headers: { 'x-admin-key': adminKey }
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
      {/* Admin Key Session Security Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#EE3124] flex items-center justify-center border border-orange-100 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Admin Authentication & Session Key</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage your session secret key used for authorizing requests to <code className="px-1.5 py-0.5 rounded bg-slate-100 text-[#EE3124] font-mono text-[11px] font-bold">/api/contacts</code>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveKey} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Current Session Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter secret admin key..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs transition-all shadow-md shadow-orange-600/20"
            >
              Update Admin Key
            </button>

            {keySavedMessage && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {keySavedMessage}
              </span>
            )}
          </div>
        </form>
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

