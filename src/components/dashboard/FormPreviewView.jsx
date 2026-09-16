import ContactForm from '../ContactForm';
import { ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FormPreviewView() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Informational Header */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Form Showcase</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Form & Debug Environment</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit test leads here to verify backend API endpoint response, validation errors, and HubSpot sync behavior.
          </p>
        </div>

        <Link
          to="/"
          target="_blank"
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shrink-0 shadow-sm"
        >
          <span>Open Public Link</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Embedded Public Form */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
        <ContactForm />
      </div>
    </div>
  );
}
