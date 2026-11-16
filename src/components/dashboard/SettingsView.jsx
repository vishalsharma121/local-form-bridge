import { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Globe,
  Lock,
  ShieldCheck,
  LogOut,
  Copy,
  Check,
  Radio,
  User,
  ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsView({ onLogout }) {
  const { getAuthHeaders, user } = useAuth();

  // Diagnostics & Webhook test state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/hubspot-webhook`
    : '/api/hubspot-webhook';

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
          message: `Webhook endpoint active and responding (HTTP ${res.status})`
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
        message: err.message || 'Failed to connect to webhook endpoint'
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
          message: 'HubSpot API connection healthy and authenticated'
        });
      } else {
        setPingResult({
          success: false,
          status: res.status,
          latency: `${latency}ms`,
          message: `API responded with HTTP status ${res.status}`
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

  const isSuper = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="space-y-5 animate-fade-in font-sans pb-4">
      {/* 1. Inbound HubSpot CRM Webhook Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F7941D]/15 to-[#EE3124]/15 border border-[#EE3124]/20 flex items-center justify-center text-[#EE3124] shadow-2xs shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  HubSpot CRM Webhook
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Listener
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Captures real-time record creations and updates made directly in your HubSpot portal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Radio className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
            <span>{testingWebhook ? 'Testing...' : 'Test Webhook Ingestion'}</span>
          </button>
        </div>

        {/* Webhook Test Feedback Banner */}
        {webhookTestResult && (
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1 transition-all ${
            webhookTestResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                {webhookTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                {webhookTestResult.message}
              </span>
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-white/70 border border-current/20">
                {webhookTestResult.latency}
              </span>
            </div>
          </div>
        )}

        {/* Target URL Input Box */}
        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                Target Webhook URL
              </span>
              <p className="text-xs text-slate-500 font-medium">
                Add this URL to your HubSpot Developer App under <span className="font-bold text-slate-700">Webhooks → Target URL</span>
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
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Webhook URL</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm break-all flex items-center justify-between gap-3 border border-slate-800 shadow-inner">
            <span className="text-emerald-400 font-bold select-all">{webhookUrl}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest shrink-0 font-sans font-extrabold bg-slate-800 px-2.5 py-1 rounded-lg">
              POST Endpoint
            </span>
          </div>
        </div>
      </div>

      {/* 2. Integration Health & Synchronization Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* HubSpot Connection Status */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">HubSpot CRM Integration</h3>
              <p className="text-xs text-slate-500 font-medium">REST API v3 bi-directional data bridge</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-slate-500 font-semibold">Connection Status</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected & Synchronized
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-slate-500 font-semibold">Background Auto-Sync</span>
              <span className="font-bold text-slate-800">Every 60 seconds</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-slate-500 font-semibold">Supported CRM Modules</span>
              <span className="font-bold text-slate-800">Contacts, Companies, Deals</span>
            </div>
          </div>
        </div>

        {/* API Health & Latency Test */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">API Health Diagnostics</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify live API responsiveness and latency</p>
                </div>
              </div>

              <button
                type="button"
                onClick={runDiagnosticPing}
                disabled={pinging}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
                <span>{pinging ? 'Checking...' : 'Run Diagnostics'}</span>
              </button>
            </div>

            <div className="mt-4">
              {pingResult ? (
                <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm space-y-1 ${
                  pingResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2">
                      {pingResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{pingResult.message}</span>
                    </span>
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-white/70 border border-current/20">
                      {pingResult.latency}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-500 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Ready for diagnostics. Click "Run Diagnostics" to verify live latency.</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="font-medium">Data Transport: HTTPS / TLS 1.3</span>
            <span className="font-bold text-emerald-600">Encrypted</span>
          </div>
        </div>
      </div>

      {/* 3. Session & Security Summary Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/15 to-indigo-500/15 border border-purple-200/80 text-purple-700 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                {user?.name || 'Administrator'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wider">
                {isSuper ? 'Admin' : 'Team Member'}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
              <span>{user?.email || 'admin@starkedge.com'}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <Lock className="w-3 h-3" />
                Encrypted Session
              </span>
            </div>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs self-end sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
