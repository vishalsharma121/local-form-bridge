import { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Mail, 
  Phone, 
  User, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  X, 
  Filter,
  ArrowUpDown
} from 'lucide-react';

export function getSourceBadge(source) {
  const src = (source || '').toLowerCase().trim();
  if (src === 'website form' || src === 'website') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-orange-50 text-[#EE3124] border border-orange-200 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EE3124]"></span>
        Website Form
      </span>
    );
  }
  if (src === 'admin dashboard' || src === 'admin') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F7941D]"></span>
        Admin Dashboard
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      HubSpot / Unknown
    </span>
  );
}

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
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
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

        // Source filter check
        const matchesSource =
          selectedSourceFilter === 'ALL' || (c.lead_source || 'HubSpot / Unknown') === selectedSourceFilter;

        return matchesQuery && matchesSubject && matchesSource;
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
  }, [contacts, searchQuery, selectedSubjectFilter, selectedSourceFilter, sortBy]);

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
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
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
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Right: Filters & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => {
                setSelectedSubjectFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories ({contacts.length})</option>
              {uniqueSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSourceFilter}
              onChange={(e) => {
                setSelectedSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="Website Form">Website Form</option>
              <option value="Admin Dashboard">Admin Dashboard</option>
              <option value="HubSpot / Unknown">HubSpot / Unknown</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-800 font-extrabold focus:outline-none cursor-pointer"
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
              className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy ({selectedIds.length}) Emails</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            disabled={contacts.length === 0}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-4 border-[#EE3124] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading contacts from HubSpot API...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-2xl m-4 space-y-2">
            <p className="text-sm font-bold">Failed to load contacts: {error}</p>
            <p className="text-xs text-slate-500">Please check your Admin Key or internet connection.</p>
          </div>
        )}

        {!loading && !error && filteredContacts.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No contacts found</p>
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
                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600">
                        {selectedIds.length === paginatedContacts.length && paginatedContacts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#EE3124]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 font-extrabold">Contact Name</th>
                    <th className="px-4 py-4 font-extrabold">Email Address</th>
                    <th className="px-4 py-4 font-extrabold">Phone Number</th>
                    <th className="px-4 py-4 font-extrabold">Subject / Category</th>
                    <th className="px-4 py-4 font-extrabold">Source</th>
                    <th className="px-4 py-4 font-extrabold">Submitted Date</th>
                    <th className="px-4 py-4 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedContacts.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-orange-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <button onClick={() => handleToggleSelect(c.id)} className="text-slate-400 hover:text-slate-600">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#EE3124]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td
                          onClick={() => setSelectedContact(c)}
                          className="px-4 py-4 font-bold text-slate-900 cursor-pointer hover:text-[#EE3124] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                              {(c.name || 'C')[0].toUpperCase()}
                            </div>
                            <span className="truncate max-w-[160px]">{c.name || '—'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {c.email ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[180px] font-medium text-slate-600">
                                {c.email}
                              </span>
                              <button
                                onClick={() => handleCopyEmail(c.email, c.id)}
                                className="text-slate-400 hover:text-[#EE3124] p-1"
                                title="Copy Email"
                              >
                                {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-600">
                          {c.phone || '—'}
                        </td>

                        <td className="px-4 py-3.5">
                          {c.subject ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {c.subject}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getSourceBadge(c.lead_source)}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 text-xs font-medium">
                          {c.createdate ? new Date(c.createdate).toLocaleDateString() : '—'}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedContact(c)}
                            className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EE3124] border border-orange-200 font-bold text-xs transition-colors"
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
            {filteredContacts.length > pageSize && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredContacts.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-800">{filteredContacts.length}</span> entries
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-orange-500/20">
                  {(selectedContact.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedContact.name || 'Unnamed Contact'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">ID: {selectedContact.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <Mail className="w-4 h-4 text-[#EE3124] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Email Address</div>
                  <div className="font-bold text-slate-900">{selectedContact.email || '—'}</div>
                </div>
                {selectedContact.email && (
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white font-bold text-xs flex items-center gap-1 hover:from-[#e58312] hover:to-[#d82417] shadow-md shadow-orange-600/20"
                  >
                    <span>Send Email</span>
                  </a>
                )}
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <Phone className="w-4 h-4 text-[#F7941D] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Phone Number</div>
                  <div className="font-bold text-slate-900">{selectedContact.phone || '—'}</div>
                </div>
                {selectedContact.phone && (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                  >
                    Call
                  </a>
                )}
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <MessageSquare className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Subject Category</div>
                  <div className="font-bold text-slate-900">{selectedContact.subject || '—'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Lead Source</div>
                <div>{getSourceBadge(selectedContact.lead_source)}</div>
              </div>

              {/* Message Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400">Full Message Payload</div>
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-sans p-3 bg-white rounded-xl border border-slate-200/80 font-medium">
                  {selectedContact.message || 'No additional message text submitted.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setSelectedContact(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
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

