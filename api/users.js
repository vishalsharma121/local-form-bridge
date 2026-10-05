import { 
    authenticateRequest, 
    createUser, 
    listUsers, 
    updateUserRole, 
    setUserActive, 
    updateUserDetails, 
    updateUserPassword, 
    deleteUser 
} from '../lib/userAuth.js';
import { can } from '../lib/permissions.js';

export default async function handler(req, res) {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const { user } = auth;

    // Only super_admin can manage team members
    if (!can(user.role, 'manageUsers')) {
        return res.status(403).json({ error: 'Access denied. Only Super Admin can manage team members.' });
    }

    if (req.method === 'GET') {
        try {
            const users = await listUsers();
            return res.status(200).json({ users });
        } catch (err) {
            console.error('🔥 [API/Users] Failed to fetch users:', err);
            return res.status(500).json({ error: 'Failed to fetch team members.' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, email, password, role } = req.body || {};
            if (!name?.trim() || !email?.trim() || !password) {
                return res.status(400).json({ error: 'Name, email, and password are required.' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }

            if (!['super_admin', 'admin', 'viewer'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role specified.' });
            }

            const result = await createUser({ name, email, password, role });
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            return res.status(201).json({ success: true, user: result.user });
        } catch (err) {
            console.error('🔥 [API/Users] Failed to create user:', err);
            return res.status(500).json({ error: 'Failed to create user.' });
        }
    }

    if (req.method === 'PATCH') {
        try {
            const { userId, name, email, role, is_active, newPassword } = req.body || {};
            if (!userId) {
                return res.status(400).json({ error: 'userId is required.' });
            }

            // Prevent self-deactivation or changing own role to avoid lockouts
            if (Number(userId) === Number(user.userId)) {
                if (is_active === false) {
                    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
                }
                if (role && role !== user.role) {
                    return res.status(400).json({ error: 'You cannot change your own role.' });
                }
            }

            let updated = false;

            // 1. Password reset
            if (newPassword) {
                if (newPassword.length < 6) {
                    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
                }
                updated = await updateUserPassword(userId, newPassword);
            }

            // 2. Details update (name, email, role)
            if (name || email || role) {
                if (role && !['super_admin', 'admin', 'viewer'].includes(role)) {
                    return res.status(400).json({ error: 'Invalid role specified.' });
                }
                updated = await updateUserDetails(userId, {
                    name: name || '',
                    email: email || '',
                    role: role || 'viewer'
                });
            }

            // 3. Status toggle
            if (typeof is_active === 'boolean') {
                updated = await setUserActive(userId, is_active);
            }

            if (!updated) {
                return res.status(400).json({ error: 'Failed to update user.' });
            }

            const users = await listUsers();
            return res.status(200).json({ success: true, users });
        } catch (err) {
            console.error('🔥 [API/Users] Failed to update user:', err);
            return res.status(500).json({ error: err.message || 'Failed to update user.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const userId = req.query.userId || req.body?.userId;
            if (!userId) {
                return res.status(400).json({ error: 'userId is required.' });
            }

            if (Number(userId) === Number(user.userId)) {
                return res.status(400).json({ error: 'You cannot delete your own account.' });
            }

            const deleted = await deleteUser(userId);
            if (!deleted) {
                return res.status(400).json({ error: 'Failed to delete user.' });
            }

            const users = await listUsers();
            return res.status(200).json({ success: true, users });
        } catch (err) {
            console.error('🔥 [API/Users] Failed to delete user:', err);
            return res.status(500).json({ error: err.message || 'Failed to delete user.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
