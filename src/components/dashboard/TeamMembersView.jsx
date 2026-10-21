import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserEffectivePermissions, formatRole } from '../../../lib/permissions';
import { 
  UserCheck, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Users,
  Briefcase,
  Activity,
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
  Crown,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Layers,
  Settings2
} from 'lucide-react';

export default function TeamMembersView() {
  const { getAuthHeaders, user: currentUser, isSuperAdmin, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedEmailId, setCopiedEmailId] = useState(null);
  const [isSyncingNotes, setIsSyncingNotes] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    canAccessContacts: true,
    canAccessCompanies: true,
    canAccessDeals: true,
    canAccessActivity: true,
    accessLevel: 'full'
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addModalError, setAddModalError] = useState('');

  // Edit User Modal
  const [editUser, setEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // Reset Password Modal
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState('');

  // Delete User Modal
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Manage User Access (Permissions) Modal - HubSpot Styled
  const [permissionsModalUser, setPermissionsModalUser] = useState(null);
  const [userPermsDraft, setUserPermsDraft] = useState(null);
  const [permsActiveTab, setPermsActiveTab] = useState('access'); // 'access' | 'review'
  const [permsCategory, setPermsCategory] = useState('crm_objects'); // 'crm_objects' | 'audit_logs'
  const [permsSearch, setPermsSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState({
    contacts: true,
    companies: false,
    deals: false,
    activity: false,
    logs: false
  });
  const [expandAll, setExpandAll] = useState(false);
  const [submittingPerms, setSubmittingPerms] = useState(false);

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

  const handleSyncNotes = async () => {
    setIsSyncingNotes(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users?action=sync-notes', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync HubSpot creator notes.');
      setSuccessMsg(data.message || 'Successfully synced creator names across HubSpot CRM notes!');
    } catch (err) {
      setError(err.message || 'Failed to sync HubSpot creator notes.');
    } finally {
      setIsSyncingNotes(false);
    }
  };

  // CREATE USER
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddModalError('');

    if (!addFormData.name?.trim() || !addFormData.email?.trim() || !addFormData.password) {
      setAddModalError('Please fill in all required fields.');
      return;
    }

    if (addFormData.password.length < 6) {
      setAddModalError('Password must be at least 6 characters long.');
      return;
    }

    setSubmittingAdd(true);
    setError('');
    setSuccessMsg('');

    try {
      const isSuper = addFormData.role === 'super_admin';
      const customPermissions = isSuper ? null : {
        contacts: {
          view: Boolean(addFormData.canAccessContacts),
          create: Boolean(addFormData.canAccessContacts && addFormData.accessLevel === 'full'),
          edit: Boolean(addFormData.canAccessContacts && addFormData.accessLevel === 'full'),
          delete: Boolean(addFormData.canAccessContacts && addFormData.accessLevel === 'full')
        },
        companies: {
          view: Boolean(addFormData.canAccessCompanies),
          create: Boolean(addFormData.canAccessCompanies && addFormData.accessLevel === 'full'),
          edit: Boolean(addFormData.canAccessCompanies && addFormData.accessLevel === 'full'),
          delete: Boolean(addFormData.canAccessCompanies && addFormData.accessLevel === 'full')
        },
        deals: {
          view: Boolean(addFormData.canAccessDeals),
          create: Boolean(addFormData.canAccessDeals && addFormData.accessLevel === 'full'),
          edit: Boolean(addFormData.canAccessDeals && addFormData.accessLevel === 'full'),
          delete: Boolean(addFormData.canAccessDeals && addFormData.accessLevel === 'full')
        },
        activity: {
          view: Boolean(addFormData.canAccessActivity)
        },
        logs: {
          view: addFormData.accessLevel === 'full'
        },
        retry: {
          view: addFormData.accessLevel === 'full'
        }
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: addFormData.name.trim(),
          email: addFormData.email.trim().toLowerCase(),
          password: addFormData.password,
          role: isSuper ? 'super_admin' : 'user',
          permissions: customPermissions
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAddModalError(data.error || 'Failed to create user. Please check the details.');
        return;
      }

      setSuccessMsg(`Team member "${addFormData.name}" (${addFormData.email}) created successfully!`);
      setIsAddModalOpen(false);
      setAddFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        canAccessContacts: true,
        canAccessCompanies: true,
        canAccessDeals: true,
        canAccessActivity: true,
        accessLevel: 'full'
      });
      fetchUsers();
    } catch (err) {
      setAddModalError(err.message || 'Failed to create user. Please try again.');
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
      role: (u.role === 'super_admin' || u.role === 'super admin') ? 'super_admin' : 'user'
    });
    setEditModalError('');
    setError('');
    setSuccessMsg('');
  };

  // SAVE EDIT DETAILS
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setEditModalError('');

    if (!editFormData.name?.trim() || !editFormData.email?.trim()) {
      setEditModalError('Name and Email are required.');
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
          name: editFormData.name.trim(),
          email: editFormData.email.trim().toLowerCase(),
          role: editFormData.role === 'super_admin' ? 'super_admin' : 'user'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setEditModalError(data.error || 'Failed to update team member.');
        return;
      }

      setSuccessMsg(`Updated user details for ${editFormData.name} successfully.`);
      
      const isSelf = data.updatedSelf || String(editUser.id) === String(currentUser?.id || currentUser?.userId) || editUser.email?.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim();
      if (isSelf) {
        updateUser(
          data.updatedUser || { name: editFormData.name, email: editFormData.email, role: editFormData.role },
          data.token || null
        );
      }

      setEditUser(null);
      fetchUsers();
    } catch (err) {
      setEditModalError(err.message || 'Failed to update user.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // CHANGE PASSWORD
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordModalError('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordModalError('Password must be at least 6 characters long.');
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
        setPasswordModalError(data.error || 'Failed to reset password.');
        return;
      }

      setSuccessMsg(`Password for ${passwordUser.name} (${passwordUser.email}) updated successfully.`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      setPasswordModalError(err.message || 'Failed to reset password.');
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

  // OPEN PERMISSIONS MODAL
  const openPermissionsModal = (u) => {
    const effective = getUserEffectivePermissions(u);
    setUserPermsDraft({
      contacts: {
        view: effective.contacts?.view ?? true,
        create: effective.contacts?.create ?? (u.role === 'user'),
        edit: effective.contacts?.edit ?? (u.role === 'user'),
        delete: effective.contacts?.delete ?? (u.role === 'user')
      },
      companies: {
        view: effective.companies?.view ?? true,
        create: effective.companies?.create ?? (u.role === 'user'),
        edit: effective.companies?.edit ?? (u.role === 'user'),
        delete: effective.companies?.delete ?? (u.role === 'user')
      },
      deals: {
        view: effective.deals?.view ?? true,
        create: effective.deals?.create ?? (u.role === 'user'),
        edit: effective.deals?.edit ?? (u.role === 'user'),
        delete: effective.deals?.delete ?? (u.role === 'user')
      },
      activity: {
        view: effective.activity?.view ?? true
      },
      logs: {
        view: effective.logs?.view ?? true
      },
      retry: {
        view: effective.retry?.view ?? true
      }
    });
    setPermissionsModalUser(u);
    setPermsActiveTab('access');
    setPermsCategory('crm_objects');
    setExpandedModules({ contacts: true, companies: false, deals: false, activity: false, logs: false });
    setExpandAll(false);
    setError('');
    setSuccessMsg('');
  };

  const handleToggleModule = (modKey) => {
    setUserPermsDraft((prev) => {
      if (!prev) return prev;
      const current = prev[modKey] || {};
      const nextView = !current.view;
      const isUserRole = permissionsModalUser?.role === 'user';
      return {
        ...prev,
        [modKey]: {
          ...current,
          view: nextView,
          ...(current.create !== undefined ? { create: nextView ? isUserRole : false } : {}),
          ...(current.edit !== undefined ? { edit: nextView ? isUserRole : false } : {}),
          ...(current.delete !== undefined ? { delete: nextView ? isUserRole : false } : {})
        }
      };
    });
  };

  const handleToggleAction = (modKey, actionKey) => {
    setUserPermsDraft((prev) => {
      if (!prev) return prev;
      const current = prev[modKey] || {};
      const nextVal = !current[actionKey];
      return {
        ...prev,
        [modKey]: {
          ...current,
          [actionKey]: nextVal,
          view: nextVal ? true : current.view
        }
      };
    });
  };

  const handleApplyPreset = (presetType) => {
    setUserPermsDraft((prev) => {
      if (!prev) return prev;
      if (presetType === 'full') {
        return {
          contacts: { view: true, create: true, edit: true, delete: true },
          companies: { view: true, create: true, edit: true, delete: true },
          deals: { view: true, create: true, edit: true, delete: true },
          activity: { view: true },
          logs: { view: true },
          retry: { view: true }
        };
      }
      if (presetType === 'view_only') {
        return {
          contacts: { view: true, create: false, edit: false, delete: false },
          companies: { view: true, create: false, edit: false, delete: false },
          deals: { view: true, create: false, edit: false, delete: false },
          activity: { view: true },
          logs: { view: true },
          retry: { view: false }
        };
      }
      if (presetType === 'sales_only') {
        return {
          contacts: { view: true, create: true, edit: true, delete: true },
          companies: { view: false, create: false, edit: false, delete: false },
          deals: { view: true, create: true, edit: true, delete: true },
          activity: { view: true },
          logs: { view: false },
          retry: { view: false }
        };
      }
      if (presetType === 'reset_defaults') {
        const eff = getUserEffectivePermissions({ role: permissionsModalUser?.role || 'user', permissions: null });
        return eff;
      }
      return prev;
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionsModalUser) return;
    setSubmittingPerms(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: permissionsModalUser.id,
          permissions: userPermsDraft
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save permissions.');
      }

      setSuccessMsg(`Permissions updated successfully for ${permissionsModalUser.name}.`);
      setPermissionsModalUser(null);
      setUserPermsDraft(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to save permissions.');
    } finally {
      setSubmittingPerms(false);
    }
  };

  const renderAccessBadges = (u) => {
    if (u.role === 'super_admin' || u.role === 'super admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/90 text-[11px] font-extrabold shadow-2xs">
          <Crown className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Full System Access (All Modules)</span>
        </span>
      );
    }

    const eff = getUserEffectivePermissions(u);
    const modules = [];
    if (eff?.contacts?.view) {
      modules.push({ label: 'Contacts', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200/80' });
    }
    if (eff?.companies?.view) {
      modules.push({ label: 'Companies', icon: Building2, color: 'bg-orange-50 text-orange-700 border-orange-200/80' });
    }
    if (eff?.deals?.view) {
      modules.push({ label: 'Deals', icon: Briefcase, color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' });
    }
    if (eff?.activity?.view) {
      modules.push({ label: 'Activity', icon: Activity, color: 'bg-purple-50 text-purple-700 border-purple-200/80' });
    }

    if (modules.length === 0) {
      return (
        <span className="text-[11px] font-medium text-slate-400 italic">
          Restricted (No CRM Access)
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {modules.map((m) => {
          const ModIcon = m.icon;
          return (
            <span
              key={m.label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold shadow-2xs ${m.color}`}
            >
              <ModIcon className="w-3 h-3 shrink-0" />
              <span>{m.label}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const getRoleBadge = (role) => {
    if (role === 'super_admin' || role === 'super admin') {
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white shadow-sm shadow-purple-600/25 inline-flex items-center gap-1.5 border border-purple-400/30">
          <Crown className="w-3.5 h-3.5 text-purple-200" />
          <span>Super Admin</span>
        </span>
      );
    }

    return (
      <span className="px-3 py-1 text-[11px] font-extrabold rounded-xl bg-slate-100 text-slate-700 border border-slate-200/90 inline-flex items-center gap-1.5 shadow-2xs">
        <User className="w-3.5 h-3.5 text-slate-500" />
        <span>Team Member</span>
      </span>
    );
  };

  // Filter users by search query and role filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isSuper = u.role === 'super_admin' || u.role === 'super admin';
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'super_admin' ? isSuper : !isSuper);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-3.5 animate-fade-in font-sans flex flex-col h-full min-h-0">
      {/* Executive Header Card */}
      <div className="bg-white rounded-2xl p-3.5 sm:px-5 sm:py-3 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
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
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleSyncNotes}
              disabled={isSyncingNotes}
              className="px-4 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Sync all updated creator names to HubSpot CRM record notes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNotes ? 'animate-spin' : ''}`} />
              <span>{isSyncingNotes ? 'Syncing HubSpot Notes...' : 'Sync Creator Notes to HubSpot'}</span>
            </button>

            <button
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setAddFormData({ name: '', email: '', password: '', role: 'viewer' });
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white text-xs font-extrabold transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>
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
            <option value="all">All Members</option>
            <option value="super_admin">Super Admins</option>
            <option value="user">Team Members</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left text-xs font-medium text-slate-700">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Access</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2 text-xs font-bold">
                      <div className="w-5 h-5 border-2 border-[#EE3124] border-t-transparent rounded-full animate-spin" />
                      Loading team members...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500 font-bold text-xs">
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
                            {isSuperAdmin && u.role !== 'super_admin' && (
                              <button
                                onClick={() => openPermissionsModal(u)}
                                className="mt-1 px-2 py-0.5 text-[10px] font-extrabold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#EE3124] hover:border-orange-200 shadow-2xs inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Edit CRM object permissions for this user"
                              >
                                <SlidersHorizontal className="w-2.5 h-2.5 text-[#EE3124]" />
                                <span>Permissions</span>
                              </button>
                            )}
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
                        {renderAccessBadges(u)}
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
                          {/* EDIT PERMISSIONS BUTTON */}
                          {isSuperAdmin && u.role !== 'super_admin' && (
                            <button
                              onClick={() => openPermissionsModal(u)}
                              title="Manage CRM Object Permissions"
                              className="p-2 rounded-xl text-slate-600 hover:text-[#EE3124] hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all cursor-pointer"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          )}

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
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 space-y-5 relative my-auto max-h-[90vh] overflow-y-auto animate-modal-pop">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#EE3124]" />
                Add New Team Member
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddModalError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* INLINE ERROR NOTICE DIRECTLY IN MODAL */}
            {addModalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addModalError}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAddModalError('')}
                  className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}

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
                  onChange={(e) => {
                    setAddFormData({ ...addFormData, email: e.target.value });
                    if (addModalError) setAddModalError('');
                  }}
                  placeholder="sarah@starkedge.com"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-inner ${
                    addModalError && addModalError.toLowerCase().includes('email')
                      ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-200/80 focus:ring-[#EE3124]/20 focus:border-[#EE3124] focus:bg-white'
                  }`}
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

              {/* Account Type Selection: Team Member vs Super Admin */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddFormData({ ...addFormData, role: 'user' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      addFormData.role !== 'super_admin'
                        ? 'border-[#EE3124] bg-orange-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#EE3124]" />
                        Team Member
                      </span>
                      {addFormData.role !== 'super_admin' && <Check className="w-3.5 h-3.5 text-[#EE3124]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Standard member with module access set below</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddFormData({ ...addFormData, role: 'super_admin' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      addFormData.role === 'super_admin'
                        ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-purple-600" />
                        Super Admin
                      </span>
                      {addFormData.role === 'super_admin' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Unrestricted system & team management access</p>
                  </button>
                </div>
              </div>

              {/* Direct CRM Permissions Configuration if not Super Admin */}
              {addFormData.role !== 'super_admin' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#EE3124]" />
                      <span>CRM Access Permissions</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setAddFormData(prev => ({ ...prev, accessLevel: 'full' }))}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                          addFormData.accessLevel === 'full'
                            ? 'bg-[#EE3124] text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Full Access
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddFormData(prev => ({ ...prev, accessLevel: 'view_only' }))}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                          addFormData.accessLevel === 'view_only'
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        View Only
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={addFormData.canAccessContacts}
                        onChange={(e) => setAddFormData({ ...addFormData, canAccessContacts: e.target.checked })}
                        className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 cursor-pointer"
                      />
                      <span>Contacts</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={addFormData.canAccessCompanies}
                        onChange={(e) => setAddFormData({ ...addFormData, canAccessCompanies: e.target.checked })}
                        className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 cursor-pointer"
                      />
                      <span>Companies</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={addFormData.canAccessDeals}
                        onChange={(e) => setAddFormData({ ...addFormData, canAccessDeals: e.target.checked })}
                        className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 cursor-pointer"
                      />
                      <span>Deals & Pipeline</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={addFormData.canAccessActivity}
                        onChange={(e) => setAddFormData({ ...addFormData, canAccessActivity: e.target.checked })}
                        className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 cursor-pointer"
                      />
                      <span>Activity Feed</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">You can further refine granular action rights (Create, Edit, Delete) anytime using "Edit Permissions".</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddModalError('');
                  }}
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
        </div>,
        document.body
      )}

      {/* 2. EDIT USER MODAL */}
      {editUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-5 relative my-auto max-h-[90vh] overflow-y-auto animate-modal-pop">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-purple-600" />
                Edit Team Member Details
              </h3>
              <button
                onClick={() => {
                  setEditUser(null);
                  setEditModalError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* INLINE ERROR NOTICE DIRECTLY IN EDIT MODAL */}
            {editModalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editModalError}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditModalError('')}
                  className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}

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
                  Account Type
                </label>
                {currentUser?.id === editUser.id ? (
                  <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Super Admin (You cannot modify your own role to prevent lockout)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, role: 'user' })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        editFormData.role !== 'super_admin'
                          ? 'border-[#EE3124] bg-orange-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#EE3124]" />
                          Team Member
                        </span>
                        {editFormData.role !== 'super_admin' && <Check className="w-3.5 h-3.5 text-[#EE3124]" />}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Standard member with permissions</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, role: 'super_admin' })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        editFormData.role === 'super_admin'
                          ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-purple-600" />
                          Super Admin
                        </span>
                        {editFormData.role === 'super_admin' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Full system power</p>
                    </button>
                  </div>
                )}
              </div>

              {editFormData.role !== 'super_admin' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">CRM Permissions</div>
                    <div className="text-[11px] text-slate-500 font-medium">Manage Contacts, Companies & Deals access</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = editUser;
                      setEditUser(null);
                      openPermissionsModal(target);
                    }}
                    className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-white border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-[#EE3124] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#EE3124]" />
                    <span>Edit Permissions</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditUser(null);
                    setEditModalError('');
                  }}
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
        </div>,
        document.body
      )}

      {/* 3. RESET PASSWORD MODAL */}
      {passwordUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-5 relative my-auto max-h-[90vh] overflow-y-auto animate-modal-pop">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Change Password for {passwordUser.name}
              </h3>
              <button
                onClick={() => {
                  setPasswordUser(null);
                  setPasswordModalError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* INLINE ERROR NOTICE DIRECTLY IN PASSWORD MODAL */}
            {passwordModalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordModalError}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPasswordModalError('')}
                  className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}

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
        </div>,
        document.body
      )}

      {/* 4. DELETE USER CONFIRMATION MODAL */}
      {deleteTargetUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-rose-100 shadow-2xl p-6 sm:p-8 space-y-5 relative my-auto max-h-[90vh] overflow-y-auto animate-modal-pop">
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
        </div>,
        document.body
      )}

      {/* 5. MANAGE USER ACCESS (PERMISSIONS) MODAL - HUBSPOT STYLED */}
      {permissionsModalUser && userPermsDraft && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto font-sans">
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-modal-pop">
            {/* HubSpot Dark Top Banner */}
            <div className="bg-[#181d25] px-6 py-3.5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-slate-400">Editing access for</span>
                <strong className="text-white font-extrabold">{permissionsModalUser.name}</strong>
                <span className="text-slate-400 font-mono text-xs hidden sm:inline">({permissionsModalUser.email})</span>
              </div>
              <button
                onClick={() => setPermissionsModalUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subheader & Tabs */}
            <div className="px-6 sm:px-8 pt-5 pb-3 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center justify-between border-b border-slate-200 mb-4">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => setPermsActiveTab('access')}
                    className={`pb-2.5 text-xs sm:text-sm font-extrabold cursor-pointer transition-all border-b-2 ${
                      permsActiveTab === 'access'
                        ? 'border-[#EE3124] text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermsActiveTab('review')}
                    className={`pb-2.5 text-xs sm:text-sm font-extrabold cursor-pointer transition-all border-b-2 ${
                      permsActiveTab === 'review'
                        ? 'border-[#EE3124] text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Review
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-400 pb-2">
                  Account: <strong className="text-slate-700 font-extrabold">{formatRole(permissionsModalUser.role)}</strong>
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">Manage user access</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Assign a seat to give users access to features. Narrow that access with permissions.
                </p>
              </div>

              {/* Accordion summary rows */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2 font-bold">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assign a seat</span>
                  </div>
                  <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                    Core Seat
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2 font-bold">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>Choose how to set access</span>
                  </div>
                  <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                    Manually assign permissions
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-extrabold pt-1">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-3.5 h-3.5 text-[#EE3124]" />
                    <span>Choose permissions</span>
                  </div>
                  {permsActiveTab === 'access' && (
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expandAll}
                        onChange={() => {
                          const next = !expandAll;
                          setExpandAll(next);
                          setExpandedModules({
                            contacts: next,
                            companies: next,
                            deals: next,
                            activity: next,
                            logs: next
                          });
                        }}
                        className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 cursor-pointer"
                      />
                      <span>Expand all permissions</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Main Body */}
            {permsActiveTab === 'access' ? (
              <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-0 bg-white">
                {/* Left Navigation & Presets */}
                <div className="w-full md:w-64 p-4 sm:p-5 shrink-0 bg-slate-50/50 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    {/* Search inside permissions */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={permsSearch}
                        onChange={(e) => setPermsSearch(e.target.value)}
                        placeholder="Search permissions..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EE3124]"
                      />
                    </div>

                    {/* Categories */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                        CRM Modules
                      </div>
                      <button
                        type="button"
                        onClick={() => setPermsCategory('crm_objects')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          permsCategory === 'crm_objects'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                            : 'text-slate-600 hover:bg-slate-100/60'
                        }`}
                      >
                        <span>CRM objects</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          3
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermsCategory('audit_logs')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          permsCategory === 'audit_logs'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                            : 'text-slate-600 hover:bg-slate-100/60'
                        }`}
                      >
                        <span>Audit & Logs</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          2
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-4 border-t border-slate-200/70 space-y-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                      Quick Presets
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('full')}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Full CRM Access</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('view_only')}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>View Only Access</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('sales_only')}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Sales Pipeline Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('reset_defaults')}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Reset to Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Right Content Cards */}
                <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
                  {permsCategory === 'crm_objects' && (
                    <div className="space-y-4">
                      {/* 1. CONTACTS CARD */}
                      {(!permsSearch || 'contacts'.includes(permsSearch.toLowerCase())) && (
                        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all bg-white hover:border-slate-300 shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => setExpandedModules(prev => ({ ...prev, contacts: !prev.contacts }))}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer mt-0.5"
                              >
                                {expandedModules.contacts || expandAll ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900">Contacts</h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  Save important info about your customers as a contact, so your team can connect with them.
                                </p>
                                <div className="mt-2 text-[11px] font-semibold text-slate-600">
                                  {userPermsDraft.contacts?.view ? (
                                    <span>
                                      View ({userPermsDraft.contacts.view ? 'All contacts' : 'None'}), 
                                      Create ({userPermsDraft.contacts.create ? 'Allowed' : 'Disallowed'}), 
                                      Edit ({userPermsDraft.contacts.edit ? 'All contacts' : 'None'}), 
                                      Delete ({userPermsDraft.contacts.delete ? 'All contacts' : 'None'})
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-bold">Access Disabled</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleModule('contacts')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                userPermsDraft.contacts?.view
                                  ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <span>{userPermsDraft.contacts?.view ? 'ON' : 'OFF'}</span>
                              {userPermsDraft.contacts?.view && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                          </div>

                          {/* Granular Checkboxes when expanded */}
                          {(expandedModules.contacts || expandAll) && userPermsDraft.contacts?.view && (
                            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.contacts?.view}
                                  onChange={() => handleToggleAction('contacts', 'view')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">View Contacts</strong>
                                  <span className="text-[11px] text-slate-500">Access directory, search & contact profiles</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.contacts?.create}
                                  onChange={() => handleToggleAction('contacts', 'create')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Create Contacts</strong>
                                  <span className="text-[11px] text-slate-500">Add new contacts and sync to HubSpot CRM</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.contacts?.edit}
                                  onChange={() => handleToggleAction('contacts', 'edit')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Edit Contacts</strong>
                                  <span className="text-[11px] text-slate-500">Update properties, owner, and lifecycle stage</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.contacts?.delete}
                                  onChange={() => handleToggleAction('contacts', 'delete')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Delete Contacts</strong>
                                  <span className="text-[11px] text-slate-500">Archive or delete contact records</span>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. COMPANIES CARD */}
                      {(!permsSearch || 'companies'.includes(permsSearch.toLowerCase())) && (
                        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all bg-white hover:border-slate-300 shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => setExpandedModules(prev => ({ ...prev, companies: !prev.companies }))}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer mt-0.5"
                              >
                                {expandedModules.companies || expandAll ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900">Companies</h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  Save useful info about companies in your database, so your team stays organized.
                                </p>
                                <div className="mt-2 text-[11px] font-semibold text-slate-600">
                                  {userPermsDraft.companies?.view ? (
                                    <span>
                                      View ({userPermsDraft.companies.view ? 'All companies' : 'None'}), 
                                      Create ({userPermsDraft.companies.create ? 'Allowed' : 'Disallowed'}), 
                                      Edit ({userPermsDraft.companies.edit ? 'All companies' : 'None'}), 
                                      Delete ({userPermsDraft.companies.delete ? 'All companies' : 'None'})
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-bold">Access Disabled</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleModule('companies')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                userPermsDraft.companies?.view
                                  ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <span>{userPermsDraft.companies?.view ? 'ON' : 'OFF'}</span>
                              {userPermsDraft.companies?.view && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                          </div>

                          {/* Granular Checkboxes when expanded */}
                          {(expandedModules.companies || expandAll) && userPermsDraft.companies?.view && (
                            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.companies?.view}
                                  onChange={() => handleToggleAction('companies', 'view')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">View Companies</strong>
                                  <span className="text-[11px] text-slate-500">Browse company directories and details</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.companies?.create}
                                  onChange={() => handleToggleAction('companies', 'create')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Create Companies</strong>
                                  <span className="text-[11px] text-slate-500">Create new company records</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.companies?.edit}
                                  onChange={() => handleToggleAction('companies', 'edit')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Edit Companies</strong>
                                  <span className="text-[11px] text-slate-500">Update company domain, industry, size</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.companies?.delete}
                                  onChange={() => handleToggleAction('companies', 'delete')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Delete Companies</strong>
                                  <span className="text-[11px] text-slate-500">Archive or delete company records</span>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. DEALS CARD */}
                      {(!permsSearch || 'deals'.includes(permsSearch.toLowerCase())) && (
                        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all bg-white hover:border-slate-300 shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => setExpandedModules(prev => ({ ...prev, deals: !prev.deals }))}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer mt-0.5"
                              >
                                {expandedModules.deals || expandAll ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900">Deals</h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  Store, track, and manage the deals your team is working on. Manage access to deal pipelines.
                                </p>
                                <div className="mt-2 text-[11px] font-semibold text-slate-600">
                                  {userPermsDraft.deals?.view ? (
                                    <span>
                                      View ({userPermsDraft.deals.view ? 'All deals' : 'None'}), 
                                      Create ({userPermsDraft.deals.create ? 'Allowed' : 'Disallowed'}), 
                                      Edit ({userPermsDraft.deals.edit ? 'All deals' : 'None'}), 
                                      Delete ({userPermsDraft.deals.delete ? 'All deals' : 'None'})
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-bold">Access Disabled</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleModule('deals')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                userPermsDraft.deals?.view
                                  ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <span>{userPermsDraft.deals?.view ? 'ON' : 'OFF'}</span>
                              {userPermsDraft.deals?.view && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                          </div>

                          {/* Granular Checkboxes when expanded */}
                          {(expandedModules.deals || expandAll) && userPermsDraft.deals?.view && (
                            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.deals?.view}
                                  onChange={() => handleToggleAction('deals', 'view')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">View Deals</strong>
                                  <span className="text-[11px] text-slate-500">Access pipeline view and deal amounts</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.deals?.create}
                                  onChange={() => handleToggleAction('deals', 'create')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Create Deals</strong>
                                  <span className="text-[11px] text-slate-500">Create new pipeline opportunities</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.deals?.edit}
                                  onChange={() => handleToggleAction('deals', 'edit')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Edit Deals</strong>
                                  <span className="text-[11px] text-slate-500">Update stage, amount, probability & close date</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userPermsDraft.deals?.delete}
                                  onChange={() => handleToggleAction('deals', 'delete')}
                                  className="w-4 h-4 rounded text-[#EE3124] focus:ring-[#EE3124] border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <strong className="block text-slate-900 font-bold">Delete Deals</strong>
                                  <span className="text-[11px] text-slate-500">Remove deals from pipelines</span>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {permsCategory === 'audit_logs' && (
                    <div className="space-y-4">
                      {/* 4. ACTIVITY FEED */}
                      <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all bg-white hover:border-slate-300 shadow-2xs">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">Activity Feed</h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Audit live form submissions, lead routing, and synchronization trails.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModule('activity')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              userPermsDraft.activity?.view
                                ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span>{userPermsDraft.activity?.view ? 'ON' : 'OFF'}</span>
                            {userPermsDraft.activity?.view && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>
                        </div>
                      </div>

                      {/* 5. SYNC ERROR LOGS & RETRY QUEUE */}
                      <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all bg-white hover:border-slate-300 shadow-2xs">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">Sync Error Logs & Retry Queue</h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Monitor synchronization error logs and access the retry queue for failed webhook attempts.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleModule('logs');
                              handleToggleModule('retry');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              userPermsDraft.logs?.view
                                ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span>{userPermsDraft.logs?.view ? 'ON' : 'OFF'}</span>
                            {userPermsDraft.logs?.view && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Review Tab */
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-slate-50/50 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Access Review Summary</h4>
                      <p className="text-xs text-slate-500 font-medium">Review the configured access rights for {permissionsModalUser.name}.</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      permissionsModalUser.role === 'super_admin'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {formatRole(permissionsModalUser.role)}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {(() => {
                      const getSummary = (mod) => {
                        if (!mod?.view) return 'Disabled';
                        const actions = [];
                        if (mod.view) actions.push('View');
                        if (mod.create) actions.push('Create');
                        if (mod.edit) actions.push('Edit');
                        if (mod.delete) actions.push('Delete');
                        return `Enabled (${actions.join(', ')})`;
                      };
                      return (
                        <>
                          <div className="py-2.5 flex items-center justify-between">
                            <span className="font-bold text-slate-800">Contacts</span>
                            <span className={`font-extrabold ${userPermsDraft.contacts?.view ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {getSummary(userPermsDraft.contacts)}
                            </span>
                          </div>
                          <div className="py-2.5 flex items-center justify-between">
                            <span className="font-bold text-slate-800">Companies</span>
                            <span className={`font-extrabold ${userPermsDraft.companies?.view ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {getSummary(userPermsDraft.companies)}
                            </span>
                          </div>
                          <div className="py-2.5 flex items-center justify-between">
                            <span className="font-bold text-slate-800">Deals & Pipeline</span>
                            <span className={`font-extrabold ${userPermsDraft.deals?.view ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {getSummary(userPermsDraft.deals)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="font-bold text-slate-800">Activity Feed</span>
                      <span className={`font-extrabold ${userPermsDraft.activity?.view ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {userPermsDraft.activity?.view ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="font-bold text-slate-800">Logs & Retry Queue</span>
                      <span className={`font-extrabold ${userPermsDraft.logs?.view ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {userPermsDraft.logs?.view ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Sticky Action Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Permissions sync across active browser sessions automatically.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPermissionsModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={submittingPerms}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submittingPerms ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Permissions...</span>
                    </>
                  ) : (
                    <span>Save Permissions</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
