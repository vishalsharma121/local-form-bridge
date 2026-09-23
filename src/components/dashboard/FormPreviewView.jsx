import ContactForm from '../ContactForm';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FormPreviewView() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Informational Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Interactive Form Showcase</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Live Form Showcase & Tester</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Submit test leads here to verify backend API endpoint response, validation errors, and HubSpot sync behavior.
          </p>
        </div>

        <Link
          to="/"
          target="_blank"
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-md shadow-orange-600/20"
        >
          <span>Open Public Link</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Embedded Public Form */}
      <div className="rounded-3xl overflow-hidden border border-slate-200/80 shadow-lg">
        <ContactForm />
      </div>
    </div>
  );
}

