import { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Zap, 
  Globe, 
  Database,
  Lock,
  Sparkles
} from 'lucide-react';

export default function SettingsView({ adminKey, onUpdateKey, onLogout }) {
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState(adminKey || '');
  const [keySavedMessage, setKeySavedMessage] = useState('');
  
  // Diagnostic ping state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

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
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Admin Key Session Security Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Admin Authentication & Session Key</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your session secret key used for authorizing requests to <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-mono text-[11px]">/api/contacts</code>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveKey} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Current Session Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter secret admin key..."
                className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20"
            >
              Update Admin Key
            </button>

            {keySavedMessage && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {keySavedMessage}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Diagnostics Suite */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">API Health & Latency Test</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ping backend endpoint to measure roundtrip latency and authorization response
              </p>
            </div>
          </div>

          <button
            onClick={runDiagnosticPing}
            disabled={pinging}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
            <span>{pinging ? 'Pinging...' : 'Run Diagnostics'}</span>
          </button>
        </div>

        {pingResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            pingResult.success 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {pingResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {pingResult.message}
              </span>
              <span>Latency: {pingResult.latency}</span>
            </div>
            <p className="text-[11px] opacity-80">HTTP Status: {pingResult.status}</p>
          </div>
        )}
      </div>

      {/* System Route Reference */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">API Architecture Matrix</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Lead Submission Endpoint</span>
            </div>
            <div className="font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              POST /api/create-contact
            </div>
            <p className="text-[11px] text-slate-500">Public lead capture handler with automatic HubSpot lookup & upsert logic.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Contacts List Endpoint</span>
            </div>
            <div className="font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              GET /api/contacts
            </div>
            <p className="text-[11px] text-slate-500">Requires header <code className="text-blue-500">x-admin-key</code> matching process.env.ADMIN_KEY.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
