import React from 'react';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessRestrictedView({ title = 'Access Restricted', moduleName = 'this module', onBack }) {
  return (
    <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12 animate-fade-in font-sans">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-md shadow-rose-500/10 mb-5">
        <Lock className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-3">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
        <span>Permission Required</span>
      </div>

      <h2 className="text-xl font-extrabold text-slate-900 mb-2">
        {title}
      </h2>

      <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md mb-6">
        You do not currently have permission to access <strong className="text-slate-800">{moduleName}</strong>. 
        Your Admin can configure your access rights under <strong className="text-slate-800">Team Members & Role Access</strong>.
      </p>

      {onBack && (
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      )}
    </div>
  );
}
