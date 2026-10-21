export const DEFAULT_PERMISSIONS = {
    super_admin: {
        contacts: { view: true, create: true, edit: true, delete: true },
        companies: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        activity: { view: true },
        logs: { view: true },
        retry: { view: true },
        manageUsers: true,
        settings: true
    },
    user: {
        contacts: { view: true, create: true, edit: true, delete: true },
        companies: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        activity: { view: true },
        logs: { view: true },
        retry: { view: true },
        manageUsers: false,
        settings: false
    },
    admin: {
        contacts: { view: true, create: true, edit: true, delete: true },
        companies: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        activity: { view: true },
        logs: { view: true },
        retry: { view: true },
        manageUsers: false,
        settings: false
    },
    viewer: {
        contacts: { view: true, create: false, edit: false, delete: false },
        companies: { view: true, create: false, edit: false, delete: false },
        deals: { view: true, create: false, edit: false, delete: false },
        activity: { view: true },
        logs: { view: true },
        retry: { view: false },
        manageUsers: false,
        settings: false
    }
};

export const PERMISSIONS = {
    super_admin: { view: true, create: true, edit: true, delete: true, manageUsers: true, settings: true },
    user: { view: true, create: true, edit: true, delete: true, manageUsers: false, settings: false },
    admin: { view: true, create: true, edit: true, delete: true, manageUsers: false, settings: false },
    viewer: { view: true, create: false, edit: false, delete: false, manageUsers: false, settings: false },
};

export function can(userOrRole, action, module) {
    if (!userOrRole) return false;

    const isUserObj = typeof userOrRole === 'object' && userOrRole !== null;
    const role = (isUserObj ? userOrRole.role : userOrRole || '').toLowerCase().trim();
    const permissions = isUserObj ? userOrRole.permissions : null;

    // Super Admin has full unrestricted system access
    if (role === 'super_admin' || role === 'super admin') {
        return true;
    }

    const KNOWN_MODULES = ['contacts', 'companies', 'deals', 'activity', 'logs', 'retry'];
    const KNOWN_ACTIONS = ['view', 'create', 'edit', 'delete', 'manageUsers', 'settings'];

    let act = action ? String(action).trim() : '';
    let mod = module ? String(module).toLowerCase().trim() : '';

    // Handle accidentally swapped arguments: e.g. can(user, 'contacts', 'view')
    if (KNOWN_MODULES.includes(act.toLowerCase()) && (!mod || KNOWN_ACTIONS.includes(mod))) {
        const temp = act.toLowerCase();
        act = mod || 'view';
        mod = temp;
    }

    // Top-level privileged actions
    if (act === 'manageUsers' || act === 'settings') {
        return role === 'super_admin';
    }

    // Module-level check (e.g. contacts, companies, deals, activity, logs, retry)
    if (mod) {
        // 1. Check custom permissions if set on user
        if (permissions && typeof permissions === 'object') {
            const modPerm = permissions[mod];

            // If module is completely disabled (boolean false)
            if (modPerm === false) {
                return false;
            }

            // If module is boolean true
            if (modPerm === true) {
                if (act === 'view') return true;
                return role === 'user' || role === 'admin';
            }

            // If granular object with view/create/edit/delete
            if (typeof modPerm === 'object' && modPerm !== null) {
                if (modPerm.view === false) {
                    return false;
                }
                if (modPerm[act] !== undefined) {
                    return Boolean(modPerm[act]);
                }
                if (act === 'view') return true;
                return role === 'user' || role === 'admin';
            }
        }

        // 2. Fallback to role defaults
        const defaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer;
        const modDefaults = defaults[mod];
        if (modDefaults && typeof modDefaults === 'object') {
            return Boolean(modDefaults[act]);
        }
    }

    // If no module is specified, but custom granular permissions exist:
    // Ensure we don't grant write/create/delete rights if the user is explicitly restricted
    if (!mod && permissions && typeof permissions === 'object') {
        const moduleValues = Object.values(permissions);
        const hasAnyExplicitGrant = moduleValues.some(m => {
            if (m === true) return true;
            if (typeof m === 'object' && m !== null) return Boolean(m[act]);
            return false;
        });
        if (!hasAnyExplicitGrant && (act === 'create' || act === 'edit' || act === 'delete')) {
            return false;
        }
    }

    // Generic coarse-grained action check (e.g. can(role, 'create'))
    return PERMISSIONS[role]?.[act] === true;
}

export function getUserEffectivePermissions(user) {
    if (!user) return null;
    const role = (user.role || 'viewer').toLowerCase().trim();
    if (role === 'super_admin' || role === 'super admin') {
        return {
            contacts: { view: true, create: true, edit: true, delete: true },
            companies: { view: true, create: true, edit: true, delete: true },
            deals: { view: true, create: true, edit: true, delete: true },
            activity: { view: true },
            logs: { view: true },
            retry: { view: true }
        };
    }

    const defaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer;
    const custom = user.permissions || {};

    const resolveObj = (key) => {
        const c = custom[key];
        const def = defaults[key] || { view: false, create: false, edit: false, delete: false };
        if (c === false) return { view: false, create: false, edit: false, delete: false };
        if (c === true) {
            const canWrite = role === 'user' || role === 'admin';
            return { view: true, create: canWrite, edit: canWrite, delete: canWrite };
        }
        if (typeof c === 'object' && c !== null) {
            const v = c.view !== undefined ? Boolean(c.view) : def.view;
            if (!v) return { view: false, create: false, edit: false, delete: false };
            return {
                view: true,
                create: c.create !== undefined ? Boolean(c.create) : def.create,
                edit: c.edit !== undefined ? Boolean(c.edit) : def.edit,
                delete: c.delete !== undefined ? Boolean(c.delete) : def.delete,
            };
        }
        return def;
    };

    return {
        contacts: resolveObj('contacts'),
        companies: resolveObj('companies'),
        deals: resolveObj('deals'),
        activity: { view: custom.activity?.view !== undefined ? Boolean(custom.activity.view) : Boolean(defaults.activity?.view) },
        logs: { view: custom.logs?.view !== undefined ? Boolean(custom.logs.view) : Boolean(defaults.logs?.view) },
        retry: { view: custom.retry?.view !== undefined ? Boolean(custom.retry.view) : Boolean(defaults.retry?.view) }
    };
}

export function formatRole(role) {
    if (!role) return 'Team Member';
    const clean = String(role).toLowerCase().trim();
    if (clean === 'super_admin' || clean === 'super admin') return 'Super Admin';
    return 'Team Member';
}
