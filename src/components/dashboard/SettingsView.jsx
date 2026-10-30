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
  ShieldCheck,
  LogOut,
  ArrowLeftRight,
  Copy,
  Check,
  Radio,
  User,
  Building2,
  Briefcase,
  Sparkles
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

  // Webhook state
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/hubspot-webhook` : '/api/hubspot-webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    const start = performance.now();
    try {
      const testPayload = [
        {
          subscriptionType: 'contact.propertyChange',
          objectId: 999999,
          propertyName: 'lifecyclestage',
          propertyValue: 'test_sync',
          changeSource: 'CRM',
          occurredAt: Date.now()
        }
      ];
      const res = await fetch('/api/hubspot-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setWebhookTestResult({
          success: true,
          status: res.status,
          latency: `${latency}ms`,
          message: `Webhook received and logged successfully (${data.processed || 1} event processed)`
        });
      } else {
        setWebhookTestResult({
          success: false,
          status: res.status,
          latency: `${latency}ms`,
          message: data.error || `Webhook endpoint returned HTTP ${res.status}`
        });
      }
    } catch (err) {
      setWebhookTestResult({
        success: false,
        status: 500,
        latency: 'N/A',
        message: err.message || 'Failed to ping webhook endpoint'
      });
    } finally {
      setTestingWebhook(false);
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
    <div className="space-y-4 animate-fade-in font-sans pb-2">
      {/* Active Administrator Session & Security Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EE3124]/10 via-[#F7941D]/10 to-amber-500/10 border border-[#EE3124]/20 flex items-center justify-center text-[#EE3124] shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">Active Admin Session & Security</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Authenticated session context & role authorization status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Session Active & Authorized</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logged In User</div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 truncate">
              {user?.name || 'Administrator Account'}
            </div>
            <div className="text-xs font-semibold text-slate-500 truncate mt-0.5">
              {user?.email || 'admin@starkedge.com'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Role</div>
            <div className="mt-1">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-purple-600 text-white shadow-2xs inline-block">
                {(user?.role === 'super_admin' || user?.role === 'super admin') ? 'ADMIN' : (user?.role ? user.role.toUpperCase() : 'ADMIN')}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              Full System Privileges & Configuration
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Authentication</div>
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
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Way HubSpot CRM Webhook & Sync Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500/10 via-[#F7941D]/20 to-[#EE3124]/10 border border-orange-200/80 flex items-center justify-center text-[#EE3124] shadow-2xs">
              <ArrowLeftRight className="w-5 h-5 text-[#EE3124]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">Two-Way HubSpot CRM Integration</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Bidirectional data bridge: App ↔ HubSpot CRM (Contacts, Companies, Deals, Pipelines & Notes)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-[#EE3124] hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Radio className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
            <span>{testingWebhook ? 'Simulating Ingestion...' : 'Test Webhook Ingestion'}</span>
          </button>
        </div>

        {/* Webhook Test Feedback Banner */}
        {webhookTestResult && (
          <div className={`p-3.5 rounded-xl border text-xs sm:text-sm space-y-1 ${
            webhookTestResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                {webhookTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {webhookTestResult.message}
              </span>
              <span className="font-mono text-xs">{webhookTestResult.latency}</span>
            </div>
          </div>
        )}

        {/* Webhook Endpoint Box */}
        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-sm font-extrabold text-slate-900">HubSpot Webhook Target URL</span>
              <p className="text-xs text-slate-500 font-medium">
                Configure this URL in your HubSpot Developer Portal (App → Webhooks → Target URL)
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyWebhook}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Webhook URL</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm break-all flex items-center justify-between gap-3 border border-slate-800 shadow-inner">
            <span className="text-emerald-400 font-bold select-all">{webhookUrl}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest shrink-0 font-sans font-bold bg-slate-800 px-2.5 py-1 rounded-md">
              POST Endpoint
            </span>
          </div>
        </div>

        {/* 2-Way Flow Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50/50 to-white border border-orange-200/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <span className="w-5 h-5 rounded-md bg-[#EE3124] text-white flex items-center justify-center font-black text-xs">1</span>
              <span>App ➔ HubSpot CRM (Outbound Sync)</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 text-xs sm:text-[13px] pl-6 list-disc">
              <li>Direct CRUD on Contacts, Companies, and Deals via REST API v3</li>
              <li>Email deduplication & race-condition 409 handling</li>
              <li>Automated engagement notes and deal association linking</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-xs">2</span>
              <span>HubSpot CRM ➔ App (Inbound Webhook Sync)</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 text-xs sm:text-[13px] pl-6 list-disc">
              <li>Real-time event capture on contact creations, deal updates & changes</li>
              <li>Immediate lead source attribution & live Activity Feed updates</li>
              <li>Auto-sync refresh every 10s with background audit logging</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Diagnostics & Route Architecture Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Diagnostics Suite */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">API Health & Latency Test</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ping backend endpoint to benchmark roundtrip latency
                  </p>
                </div>
              </div>

              <button
                onClick={runDiagnosticPing}
                disabled={pinging}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs transition-all shadow-md shadow-orange-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
                <span>{pinging ? 'Testing...' : 'Run Diagnostics'}</span>
              </button>
            </div>

            <div className="mt-3.5">
              {pingResult ? (
                <div className={`p-3 rounded-xl border text-xs sm:text-sm space-y-1 ${
                  pingResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2">
                      {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                      <span>{pingResult.message}</span>
                    </span>
                    <span className="font-mono text-xs">{pingResult.latency}</span>
                  </div>
                  <p className="text-xs opacity-80 pl-6">HTTP Status: {pingResult.status} • Target: /api/contacts</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Ready for diagnostics. Click "Run Diagnostics" to benchmark REST latency.</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">Target Service</span>
              <span className="text-slate-800 font-bold">Node.js Express / Vercel API</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">Latency Target</span>
              <span className="text-emerald-600 font-bold">&lt; 250ms Target</span>
            </div>
          </div>
        </div>

        {/* System Route Reference */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">API Architecture & Endpoints</h3>
              <p className="text-xs text-slate-500 font-medium">Core operational endpoints powering 2-way sync</p>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              REST & Webhooks
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5 text-[#EE3124]" />
                <span>Webhook Ingestion</span>
              </div>
              <div className="font-mono text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 font-bold text-xs truncate">
                POST /api/hubspot-webhook
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Database className="w-3.5 h-3.5 text-[#F7941D]" />
                <span>Contacts REST API</span>
              </div>
              <div className="font-mono text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 font-bold text-xs truncate">
                GET /api/contacts
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Companies REST API</span>
              </div>
              <div className="font-mono text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 font-bold text-xs truncate">
                GET /api/companies
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                <span>Deals & Pipelines API</span>
              </div>
              <div className="font-mono text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 font-bold text-xs truncate">
                GET /api/deals
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">API Protocol</span>
              <span className="text-slate-800 font-bold">REST v3 / HTTPS JSON</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">Auth Standard</span>
              <span className="text-purple-600 font-bold">Bearer Token / JWT</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Infrastructure & Integrity Parameters Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F7941D] flex items-center justify-center border border-amber-200/60 shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sync Velocity</span>
            <span className="text-xs font-black text-slate-900 truncate block">10s Background Polling</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Deduplication</span>
            <span className="text-xs font-black text-slate-900 truncate block">Email Hash Primary Key</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">CRM Engine</span>
            <span className="text-xs font-black text-slate-900 truncate block">HubSpot REST API v3</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Data Security</span>
            <span className="text-xs font-black text-slate-900 truncate block">TLS 1.3 / JWT Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
}

