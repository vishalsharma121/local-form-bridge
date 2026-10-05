import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UserCheck, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Pencil,
  Key,
  Trash2,
  Eye,
  EyeOff,
  Search,
  AlertTriangle,
  ShieldCheck,
  Shield,
  Sparkles,
  Building2,
  Copy,
  Check,
  Crown
} from 'lucide-react';

export default function TeamMembersView() {
  const { getAuthHeaders, user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedEmailId, setCopiedEmailId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit User Modal
  const [editUser, setEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'viewer'
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reset Password Modal
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Delete User Modal
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCopyEmail = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load team members.');
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  // CREATE USER
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!addFormData.name || !addFormData.email || !addFormData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmittingAdd(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addFormData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user.');
      }

      setSuccessMsg(`Team member "${addFormData.name}" (${addFormData.email}) created successfully!`);
      setIsAddModalOpen(false);
      setAddFormData({ name: '', email: '', password: '', role: 'viewer' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (u) => {
    setEditUser(u);
    setEditFormData({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'viewer'
    });
    setError('');
    setSuccessMsg('');
  };

  // SAVE EDIT DETAILS
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    if (!editFormData.name || !editFormData.email) {
      setError('Name and Email are required.');
      return;
    }

    setSubmittingEdit(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: editUser.id,
          name: editFormData.name,
          email: editFormData.email,
          role: editFormData.role
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update team member.');
      }

      setSuccessMsg(`Updated user details for ${editFormData.name} successfully.`);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // CHANGE PASSWORD
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmittingPassword(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: passwordUser.id,
          newPassword: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccessMsg(`Password for ${passwordUser.name} (${passwordUser.email}) updated successfully.`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  // TOGGLE ACTIVE / INACTIVE STATUS
  const handleToggleActive = async (userId, userName, currentActive) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, is_active: !currentActive })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status.');
      }

      setSuccessMsg(`User ${userName} ${!currentActive ? 'activated' : 'deactivated'} successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  // DELETE USER
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setSubmittingDelete(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/users?userId=${deleteTargetUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user.');
      }

      setSuccessMsg(`Team member "${deleteTargetUser.name}" was permanently deleted.`);
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-3 py-1 text-[11px] font-extrabold rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white shadow-sm shadow-purple-600/25 inline-flex items-center gap-1.5 border border-purple-400/30">
            <Crown className="w-3.5 h-3.5 text-purple-200" />
            <span>Super Admin</span>
          </span>
        );
      case 'admin':
        return (
          <span className="px-3 py-1 text-[11px] font-extrabold rounded-xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] text-white shadow-sm shadow-orange-600/25 inline-flex items-center gap-1.5 border border-orange-400/30">
            <Shield className="w-3.5 h-3.5 text-orange-100" />
            <span>Admin</span>
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="px-3 py-1 text-[11px] font-extrabold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5 shadow-2xs">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Viewer</span>
          </span>
        );
    }
  };

  // Filter users by search query and role filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Executive Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
              <span>Team Members & Role Access</span>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono uppercase tracking-wider">
                Super Admin Control
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage sales team members, role assignments, passwords, and account statuses.
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setError('');
              setSuccessMsg('');
              setAddFormData({ name: '', email: '', password: '', role: 'viewer' });
              setIsAddModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-extrabold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 shrink-0 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-extrabold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 font-extrabold">✕</button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2 text-xs font-bold">
                      <div className="w-5 h-5 border-2 border-[#EE3124] border-t-transparent rounded-full animate-spin" />
                      Loading team members...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-bold text-xs">
                    {searchQuery || roleFilter !== 'all' 
                      ? 'No team members match your filters.' 
                      : 'No team members found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F7941D] to-[#EE3124] flex items-center justify-center font-extrabold text-white text-xs shadow-sm shadow-orange-500/20 shrink-0">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="text-slate-900 font-extrabold text-xs">{u.name}</div>
                            {isSelf && <span className="text-[10px] text-emerald-600 font-mono font-bold">(You)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>{u.email}</span>
                          <button
                            onClick={() => handleCopyEmail(u.email, u.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                            title="Copy email address"
                          >
                            {copiedEmailId === u.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400 font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* EDIT DETAILS BUTTON */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => openEditModal(u)}
                              title="Edit User Details"
                              className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-all cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* CHANGE PASSWORD BUTTON */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setPasswordUser(u);
                                setNewPassword('');
                                setError('');
                                setSuccessMsg('');
                              }}
                              title="Reset / Change Password"
                              className="p-2 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all cursor-pointer"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}

                          {/* ACTIVATE / DEACTIVATE BUTTON */}
                          {isSuperAdmin && !isSelf && (
                            <button
                              onClick={() => handleToggleActive(u.id, u.name, u.is_active)}
                              title={u.is_active ? "Deactivate Account" : "Activate Account"}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                u.is_active
                                  ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {/* DELETE USER BUTTON */}
                          {isSuperAdmin && !isSelf && (
                            <button
                              onClick={() => {
                                setDeleteTargetUser(u);
                                setError('');
                                setSuccessMsg('');
                              }}
                              title="Delete Team Member"
                              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#EE3124]" />
                Add New Team Member
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="new_member_fullname_no_fill"
                  autoComplete="off"
                  required
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="new_member_email_no_fill"
                  autoComplete="new-password"
                  required
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder="sarah@starkedge.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    name="new_member_password_no_fill"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Permission
                </label>
                <select
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="viewer">Viewer (View Dashboard Only)</option>
                  <option value="admin">Admin (Create/Edit/Delete CRM Data)</option>
                  <option value="super_admin">Super Admin (Full Control + Team Management)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdd ? 'Creating...' : 'Create Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT USER MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-purple-600" />
                Edit Team Member Details
              </h3>
              <button
                onClick={() => setEditUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="email@starkedge.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Permission
                </label>
                <select
                  value={editFormData.role}
                  disabled={currentUser?.id === editUser.id}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="viewer">Viewer (View Dashboard Only)</option>
                  <option value="admin">Admin (Create/Edit/Delete CRM Data)</option>
                  <option value="super_admin">Super Admin (Full Control + Team Management)</option>
                </select>
                {currentUser?.id === editUser.id && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    You cannot change your own role to prevent lockout.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. RESET PASSWORD MODAL */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Change Password for {passwordUser.name}
              </h3>
              <button
                onClick={() => setPasswordUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Password Reset Notice</span>
              </div>
              <p>Updating the password for <strong className="font-mono">{passwordUser.email}</strong> will take effect immediately. The user must log in with their new password.</p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="reset_member_password_no_fill"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE USER CONFIRMATION MODAL */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-rose-100 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Delete Team Member</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 leading-relaxed">
              Are you sure you want to permanently delete <strong className="font-extrabold">{deleteTargetUser.name}</strong> (<span className="font-mono">{deleteTargetUser.email}</span>)? They will lose all access to Local Form Bridge.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={submittingDelete}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {submittingDelete ? 'Deleting...' : 'Delete Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
