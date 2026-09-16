import { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Mail, 
  Phone, 
  User, 
  MessageSquare, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  X, 
  ExternalLink,
  Filter,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';

export default function ContactsView({
  contacts,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  onExportCSV,
  selectedContact,
  setSelectedContact
}) {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'
  const [selectedIds, setSelectedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Extract unique subjects for filter dropdown
  const uniqueSubjects = useMemo(() => {
    const set = new Set();
    contacts.forEach(c => {
      if (c.subject) set.add(c.subject);
    });
    return Array.from(set);
  }, [contacts]);

  // Filter & Sort contacts
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        // Search query check
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.subject && c.subject.toLowerCase().includes(q)) ||
          (c.message && c.message.toLowerCase().includes(q));

        // Subject filter check
        const matchesSubject =
          selectedSubjectFilter === 'ALL' || c.subject === selectedSubjectFilter;

        return matchesQuery && matchesSubject;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdate || 0) - new Date(a.createdate || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdate || 0) - new Date(b.createdate || 0);
        }
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [contacts, searchQuery, selectedSubjectFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Checkbox helpers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedContacts.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCopyEmail = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySelectedEmails = () => {
    const emails = contacts
      .filter((c) => selectedIds.includes(c.id) && c.email)
      .map((c) => c.email)
      .join(', ');
    if (emails) {
      navigator.clipboard.writeText(emails);
      alert(`Copied ${selectedIds.length} email(s) to clipboard!`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Bar: Search, Category Filter, Sort, Export */}
      <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts by name, email, phone, subject..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>

        {/* Right: Filters & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => {
                setSelectedSubjectFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories ({contacts.length})</option>
              {uniqueSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>

          {/* Bulk Action Copy */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleCopySelectedEmails}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy ({selectedIds.length}) Emails</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            disabled={contacts.length === 0}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading contacts from HubSpot API...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 space-y-2">
            <p className="text-sm font-bold">Failed to load contacts: {error}</p>
            <p className="text-xs text-slate-500">Please check your Admin Key or internet connection.</p>
          </div>
        )}

        {!loading && !error && filteredContacts.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No contacts found</p>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedSubjectFilter !== 'ALL'
                ? 'Try adjusting your search query or category filters.'
                : 'No contacts submitted yet.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredContacts.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3.5 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600">
                        {selectedIds.length === paginatedContacts.length && paginatedContacts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 font-bold">Contact Name</th>
                    <th className="px-4 py-3.5 font-bold">Email Address</th>
                    <th className="px-4 py-3.5 font-bold">Phone Number</th>
                    <th className="px-4 py-3.5 font-bold">Subject / Category</th>
                    <th className="px-4 py-3.5 font-bold">Submitted Date</th>
                    <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                  {paginatedContacts.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <button onClick={() => handleToggleSelect(c.id)} className="text-slate-400 hover:text-slate-600">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td
                          onClick={() => setSelectedContact(c)}
                          className="px-4 py-3.5 font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {(c.name || 'C')[0].toUpperCase()}
                            </div>
                            <span className="truncate max-w-[160px]">{c.name || '—'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {c.email ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[180px] font-medium text-slate-600 dark:text-slate-300">
                                {c.email}
                              </span>
                              <button
                                onClick={() => handleCopyEmail(c.email, c.id)}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                                title="Copy Email"
                              >
                                {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-400">
                          {c.phone || '—'}
                        </td>

                        <td className="px-4 py-3.5">
                          {c.subject ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                              {c.subject}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                          {c.createdate ? new Date(c.createdate).toLocaleDateString() : '—'}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedContact(c)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Math.min(currentPage * pageSize, filteredContacts.length)}
                </span>{' '}
                of <span className="font-bold text-slate-800 dark:text-slate-200">{filteredContacts.length}</span> entries
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-base flex items-center justify-center shadow-md">
                  {(selectedContact.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedContact.name || 'Unnamed Contact'}
                  </h3>
                  <p className="text-xs text-slate-400">ID: {selectedContact.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Email Address</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedContact.email || '—'}</div>
                </div>
                {selectedContact.email && (
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs flex items-center gap-1 hover:bg-blue-500"
                  >
                    <span>Send Email</span>
                  </a>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Phone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Phone Number</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedContact.phone || '—'}</div>
                </div>
                {selectedContact.phone && (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-semibold text-xs"
                  >
                    Call
                  </a>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <MessageSquare className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Subject Category</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedContact.subject || '—'}</div>
                </div>
              </div>

              {/* Message Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">Full Message Payload</div>
                <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-sans p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  {selectedContact.message || 'No additional message text submitted.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setSelectedContact(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
