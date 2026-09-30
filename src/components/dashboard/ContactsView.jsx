import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowUpDown,
  Edit3,
  Trash2,
  AlertTriangle,
  Eye,
  Plus,
  Building2
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
  setSelectedContact,
  onRefreshContacts,
  adminKey
}) {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'
  const [selectedIds, setSelectedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Edit & Delete State
  const [editingContact, setEditingContact] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [deletingContact, setDeletingContact] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Create Contact State
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [newContactData, setNewContactData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    companyName: '',
    companyDomain: ''
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  const handleCreateContactSubmit = async (e) => {
    e.preventDefault();
    if (!newContactData.name.trim() || !newContactData.email.trim()) {
      setCreateErrorMsg('Contact Name and Email Address are required.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateErrorMsg('');
    setCreateSuccessMsg('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        },
        body: JSON.stringify({
          name: newContactData.name.trim(),
          email: newContactData.email.trim(),
          phone: newContactData.phone.trim(),
          subject: newContactData.subject.trim(),
          message: newContactData.message.trim(),
          companyName: newContactData.companyName.trim(),
          companyDomain: newContactData.companyDomain.trim(),
          leadSource: 'Admin Dashboard'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to create contact (HTTP ${res.status})`);
      }

      setCreateSuccessMsg('Contact created successfully in HubSpot CRM!');
      setTimeout(() => {
        setCreateSuccessMsg('');
        setCreateErrorMsg('');
        setShowCreateContactModal(false);
        setNewContactData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          companyName: '',
          companyDomain: ''
        });
        if (onRefreshContacts) onRefreshContacts();
      }, 1500);
    } catch (err) {
      setCreateErrorMsg(err.message || 'Something went wrong creating the contact.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleStartEdit = (c) => {
    setEditingContact(c);
    setEditForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      subject: c.subject || '',
      message: c.message || ''
    });
    setActionError('');
    setActionSuccess('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingContact || !editForm.name.trim() || !editForm.email.trim()) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        },
        body: JSON.stringify({
          id: editingContact.id,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          subject: editForm.subject.trim(),
          message: editForm.message.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update contact in HubSpot');
      }

      setActionSuccess('Contact updated successfully in HubSpot!');
      setTimeout(() => {
        setEditingContact(null);
        setActionSuccess('');
        if (onRefreshContacts) onRefreshContacts();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error updating contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContact) return;

    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/contacts?id=${deletingContact.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey || sessionStorage.getItem('admin_key') || ''
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to delete contact from HubSpot');
      }

      setActionSuccess('Contact deleted successfully!');
      setTimeout(() => {
        setDeletingContact(null);
        setActionSuccess('');
        if (onRefreshContacts) onRefreshContacts();
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Error deleting contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract unique subjects and uncategorized count for filter dropdown
  const subjectCounts = useMemo(() => {
    const counts = {};
    let noSubjectCount = 0;
    contacts.forEach(c => {
      const subj = (c.subject || '').trim();
      if (subj) {
        counts[subj] = (counts[subj] || 0) + 1;
      } else {
        noSubjectCount++;
      }
    });
    return { counts, noSubjectCount };
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
          selectedSubjectFilter === 'ALL' ||
          (selectedSubjectFilter === 'NONE' ? !c.subject?.trim() : c.subject === selectedSubjectFilter);

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

  const [copyToastMsg, setCopyToastMsg] = useState('');

  const handleCopySelectedEmails = () => {
    const emails = contacts
      .filter((c) => selectedIds.includes(c.id) && c.email)
      .map((c) => c.email)
      .join(', ');
    if (emails) {
      navigator.clipboard.writeText(emails);
      setCopyToastMsg(`Copied ${selectedIds.length} email(s) to clipboard!`);
      setTimeout(() => setCopyToastMsg(''), 3000);
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
              {Object.entries(subjectCounts.counts).map(([subj, count]) => (
                <option key={subj} value={subj}>
                  {subj} ({count})
                </option>
              ))}
              {subjectCounts.noSubjectCount > 0 && (
                <option value="NONE">General / Uncategorized ({subjectCounts.noSubjectCount})</option>
              )}
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
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Create HubSpot Contact Button */}
          <button
            onClick={() => {
              setCreateErrorMsg('');
              setCreateSuccessMsg('');
              setShowCreateContactModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create HubSpot Contact</span>
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
                          <div className="flex items-center justify-end">
                            <div className="inline-flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                              <button
                                onClick={() => setSelectedContact(c)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-[#EE3124] hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-[#EE3124] transition-colors" />
                                <span>Details</span>
                              </button>

                              <div className="w-px h-3.5 bg-slate-200/80 my-auto" />

                              <button
                                onClick={() => handleStartEdit(c)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-amber-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                title="Edit Contact"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-600 transition-colors" />
                                <span className="hidden xl:inline">Edit</span>
                              </button>

                              <div className="w-px h-3.5 bg-slate-200/80 my-auto" />

                              <button
                                onClick={() => {
                                  setDeletingContact(c);
                                  setActionError('');
                                  setActionSuccess('');
                                }}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-white transition-all shadow-none hover:shadow-2xs active:scale-95 group/btn"
                                title="Delete Contact"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-rose-600 transition-colors" />
                              </button>
                            </div>
                          </div>
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
      {selectedContact && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
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
        </div>,
        document.body
      )}

      {/* Edit Contact Modal */}
      {editingContact && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F7941D] to-[#EE3124] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit HubSpot Contact</h3>
                  <p className="text-xs text-slate-500 font-medium">Update contact info in HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setEditingContact(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600" />
                {actionSuccess}
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="Phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Subject / Category
                  </label>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Message Payload
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Message"
                    value={editForm.message}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Delete Contact Modal */}
      {deletingContact && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Delete Contact</h3>
                  <p className="text-xs text-slate-500 font-medium">Remove contact from HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingContact(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600" />
                {actionSuccess}
              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                {actionError && (
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {actionError}
                  </div>
                )}

                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">{deletingContact.name || deletingContact.email}</strong> from HubSpot CRM? This action cannot be undone.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingContact(null)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Contact'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create Contact Modal */}
      {showCreateContactModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#EE3124] flex items-center justify-center border border-orange-200 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Create HubSpot Contact</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a contact lead directly to HubSpot CRM</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateContactModal(false);
                  setCreateErrorMsg('');
                  setCreateSuccessMsg('');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs sm:text-sm flex items-center gap-2.5 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{createSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleCreateContactSubmit} className="space-y-4 text-xs sm:text-sm">
                {createErrorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-snug">{createErrorMsg}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={newContactData.name}
                      onChange={(e) => setNewContactData({ ...newContactData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@example.com"
                      value={newContactData.email}
                      onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 000-0000"
                      value={newContactData.phone}
                      onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Subject / Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Inquiry"
                      value={newContactData.subject}
                      onChange={(e) => setNewContactData({ ...newContactData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Company Link Section */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    <span>Associate Company (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">Company Name</label>
                      <input
                        type="text"
                        placeholder="e.g. StarkEdge"
                        value={newContactData.companyName}
                        onChange={(e) => setNewContactData({ ...newContactData, companyName: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">Company Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. starkedge.com"
                        value={newContactData.companyDomain}
                        onChange={(e) => setNewContactData({ ...newContactData, companyDomain: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Notes / Message</label>
                  <textarea
                    rows={3}
                    placeholder="Enter additional details or initial notes..."
                    value={newContactData.message}
                    onChange={(e) => setNewContactData({ ...newContactData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateContactModal(false);
                      setCreateErrorMsg('');
                      setCreateSuccessMsg('');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmittingCreate && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{isSubmittingCreate ? 'Creating Contact...' : 'Create Contact'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

