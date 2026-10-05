import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StarkEdgeLogo from './StarkEdgeLogo';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginModal() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f4f6fa] text-slate-800 font-sans overflow-hidden animate-fade-in">
      {/* Premium Light Background Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F7941D]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#EE3124]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Light Tech Dot Grid Pattern */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-8 sm:p-10 relative z-10 space-y-6">
        {/* Card Internal Glow Accents */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="text-center relative">
          <div className="flex justify-center mb-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
              <StarkEdgeLogo className="h-9 w-auto" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
            Local Form Bridge
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to access your CRM Dashboard & Team Controls
          </p>
        </div>

        {/* Error Alert */}
        {(errorMsg || authError) && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-shake shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg || authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide Password' : 'Show Password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md shadow-orange-600/20 focus:outline-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] font-bold text-slate-400 border-t border-slate-100 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Independent Role System • Protected Access</span>
        </div>
      </div>
    </div>
  );
}
