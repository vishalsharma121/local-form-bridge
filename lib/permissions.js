export const PERMISSIONS = {
    super_admin: { view: true, create: true, edit: true, delete: true, manageUsers: true, settings: true },
    admin: { view: true, create: true, edit: true, delete: true, manageUsers: false, settings: false },
    viewer: { view: true, create: false, edit: false, delete: false, manageUsers: false, settings: false },
};

export function can(role, action) {
    if (!role) return false;
    return PERMISSIONS[role]?.[action] === true;
}

export function formatRole(role) {
    if (!role) return 'Admin';
    const clean = String(role).toLowerCase().trim();
    if (clean === 'super_admin' || clean === 'super admin') return 'Super Admin';
    if (clean === 'admin') return 'Admin';
    if (clean === 'viewer') return 'Viewer';
    return role.charAt(0).toUpperCase() + role.slice(1);
}
