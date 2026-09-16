import { 
  Users, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpRight, 
  FileText, 
  Mail, 
  Phone, 
  Sparkles, 
  Download,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Zap
} from 'lucide-react';

export default function OverviewView({ contacts, loading, error, onNavigate, onExportCSV, onSelectContact }) {
  // Compute analytics metrics
  const totalContacts = contacts.length;
  
  // Calculate today's contacts
  const todayStr = new Date().toISOString().split('T')[0];
  const todayContacts = contacts.filter(c => {
    if (!c.createdate) return false;
    const dateStr = new Date(c.createdate).toISOString().split('T')[0];
    return dateStr === todayStr;
  });

  // Calculate top subject
  const subjectCounts = contacts.reduce((acc, c) => {
    const s = c.subject || 'General Inquiry';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  let topSubject = 'None';
  let topSubjectCount = 0;
  Object.entries(subjectCounts).forEach(([subj, count]) => {
    if (count > topSubjectCount) {
      topSubject = subj;
      topSubjectCount = count;
    }
  });

  // Recent 5 contacts
  const recentContacts = contacts.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Contacts */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Contacts
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/50 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : totalContacts}
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
              <TrendingUp className="w-3 h-3 mr-1" />
              HubSpot Synced
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Total active submissions stored
          </p>
        </div>

        {/* Submissions Today */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Activity Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : todayContacts.length}
            </div>
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/50">
              Today
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {todayContacts.length > 0 ? `${todayContacts.length} new lead(s) captured today` : 'No submissions recorded today'}
          </p>
        </div>

        {/* Top Category */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top Subject Demand
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-100 dark:border-violet-800/50 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold text-slate-900 dark:text-white truncate" title={topSubject}>
              {loading ? '...' : topSubject}
            </div>
            <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
              {topSubjectCount} submission{topSubjectCount !== 1 ? 's' : ''} ({totalContacts > 0 ? Math.round((topSubjectCount / totalContacts) * 100) : 0}%)
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Most frequent lead category
          </p>
        </div>

        {/* API Health */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              HubSpot API Health
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              Active
            </div>
            <div className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
              200 OK
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            CRM backend integration operational
          </p>
        </div>
      </div>

      {/* Main Section: Analytics & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Visual Trend & Subject Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Lead Management Suite</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">Form Bridge Operations Hub</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
                  Easily review inbound submissions from your public lead capture form, export reports, or test real-time form API triggers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => onNavigate('contacts')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/30 flex items-center gap-2"
                >
                  <span>View All Contacts</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onExportCSV}
                  disabled={totalContacts === 0}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subject Distribution */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Inquiry Categories Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Distribution of contact requests by topic</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                {Object.keys(subjectCounts).length} Categories
              </span>
            </div>

            {totalContacts === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No contact submissions recorded yet to visualize breakdown.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(subjectCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([subject, count]) => {
                    const percentage = Math.round((count / totalContacts) * 100);
                    return (
                      <div key={subject} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{subject}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {count} contact{count !== 1 ? 's' : ''} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Recent Submissions Feed */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Submissions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Latest inbound lead stream</p>
              </div>
              <button
                onClick={() => onNavigate('contacts')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentContacts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p>No contacts logged yet.</p>
                <button
                  onClick={() => onNavigate('preview')}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100"
                >
                  Submit a Test Lead
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentContacts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectContact(c)}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {c.name || 'Unnamed Contact'}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {c.createdate ? new Date(c.createdate).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email || 'No email provided'}</span>
                    </div>

                    {c.subject && (
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                        {c.subject}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('contacts')}
            className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Open Directory Manager</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
