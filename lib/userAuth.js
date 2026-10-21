import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { syncHubSpotNotesForUser } from './hubspotOwners.js';

function getSql() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn('⚠️ [UserAuth] DATABASE_URL environment variable is missing.');
        throw new Error('DATABASE_URL environment variable is missing.');
    }
    return neon(connectionString);
}

// Ensures app_users table exists
export async function ensureUsersTable() {
    try {
        const sql = getSql();
        await sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('super_admin','admin','user','viewer')) DEFAULT 'viewer',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
        // Ensure constraint allows 'user', add permissions column, and migrate any existing 'admin' roles to 'user'
        try {
            await sql`ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check`;
            await sql`ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('super_admin','admin','user','viewer'))`;
            await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL`;
            await sql`UPDATE app_users SET role = 'user' WHERE role = 'admin'`;
        } catch {
            // Constraint check migration fallback
        }
        return true;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to ensure app_users table:', err);
        return false;
    }
}

// Finds a user by email (used for login)
export async function getUserByEmail(email) {
    try {
        const sql = getSql();
        await ensureUsersTable();

        const rows = await sql`
      SELECT id, name, email, password_hash, role, permissions, is_active
      FROM app_users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

        return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to fetch user by email:', err);
        return null;
    }
}

// Verifies a plain-text password against the stored bcrypt hash
export async function verifyPassword(plainPassword, passwordHash) {
    try {
        return await bcrypt.compare(plainPassword, passwordHash);
    } catch (err) {
        console.error('🔥 [UserAuth] Password verification error:', err);
        return false;
    }
}

// Generates a signed JWT containing userId, name, and role
export function generateToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is missing.');
    }
    return jwt.sign(
        { userId: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions || null },
        secret,
        { expiresIn: '12h' }
    );
}

// Verifies a JWT and returns its decoded payload, or null if invalid/expired
export function verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret || !token) return null;
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        console.warn('⚠️ [UserAuth] Token verification failed:', err.message);
        return null;
    }
}

// In-memory user cache to ensure instant live role evaluation without DB bottleneck
const userCache = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds TTL

export async function getLiveUser(userId, email) {
    const numId = userId ? Number(userId) : null;
    const cleanEmail = email ? email.toLowerCase().trim() : null;

    if (numId && userCache.has(numId)) {
        const cached = userCache.get(numId);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.user;
        }
    } else if (cleanEmail && userCache.has(cleanEmail)) {
        const cached = userCache.get(cleanEmail);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.user;
        }
    }

    try {
        const sql = getSql();
        let rows = [];
        if (numId) {
            rows = await sql`SELECT id, name, email, role, permissions, is_active FROM app_users WHERE id = ${numId} LIMIT 1`;
        } else if (cleanEmail) {
            rows = await sql`SELECT id, name, email, role, permissions, is_active FROM app_users WHERE email = ${cleanEmail} LIMIT 1`;
        }
        if (rows && rows.length > 0) {
            const user = rows[0];
            const entry = { user, timestamp: Date.now() };
            userCache.set(user.id, entry);
            if (user.email) userCache.set(user.email.toLowerCase().trim(), entry);
            return user;
        }
        // User not found in database (deleted!)
        return null;
    } catch (err) {
        console.warn('⚠️ [UserAuth] Failed to fetch live user from DB:', err.message);
        throw err;
    }
}

export function invalidateUserCache(userId, email) {
    if (userId !== undefined && userId !== null) {
        userCache.delete(Number(userId));
        userCache.delete(String(userId));
    }
    if (email) {
        userCache.delete(email.toLowerCase().trim());
    }
}

// Authenticates an incoming HTTP request using JWT or fallback admin key header, resolving live role
export async function authenticateRequest(req) {
    const authHeader = req.headers['authorization'];
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    }

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            try {
                const liveUser = await getLiveUser(decoded.userId, decoded.email);
                if (!liveUser) {
                    console.warn(`⛔ [UserAuth] Access denied: User "${decoded.email}" (ID: ${decoded.userId}) was deleted or no longer exists.`);
                    return { authenticated: false, user: null, reason: 'deleted' };
                }
                if (liveUser.is_active === false) {
                    console.warn(`⛔ [UserAuth] Access denied: User "${decoded.email}" is deactivated.`);
                    return { authenticated: false, user: null, reason: 'deactivated' };
                }
                return {
                    authenticated: true,
                    user: {
                        ...decoded,
                        id: liveUser.id,
                        userId: liveUser.id,
                        name: liveUser.name,
                        email: liveUser.email,
                        role: liveUser.role,
                        permissions: liveUser.permissions || null
                    }
                };
            } catch (err) {
                console.error('🔥 [UserAuth] Database error verifying token:', err.message);
                return { authenticated: false, user: null, reason: 'db_error' };
            }
        }
    }

    // Fallback: system ADMIN_KEY header
    const adminKey = req.headers['x-admin-key'];
    if (adminKey && process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY) {
        return {
            authenticated: true,
            user: { userId: 0, name: 'System Admin', email: 'admin@system', role: 'super_admin' }
        };
    }

    return { authenticated: false, user: null };
}


// Creates a new team member (Super Admin only — called from the Team Members screen)
export async function createUser({ name, email, password, role = 'viewer', permissions = null }) {
    try {
        const sql = getSql();
        await ensureUsersTable();

        const passwordHash = await bcrypt.hash(password, 10);
        const normalizedRole = role === 'admin' ? 'user' : (role || 'viewer');

        const rows = await sql`
      INSERT INTO app_users (name, email, password_hash, role, permissions)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${normalizedRole}, ${permissions ? JSON.stringify(permissions) : null})
      RETURNING id, name, email, role, permissions, is_active, created_at
    `;
        console.log(`📌 [UserAuth] Created user "${email}" with role "${normalizedRole}"`);
        invalidateUserCache(rows[0].id, rows[0].email);
        return { success: true, user: rows[0] };
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to create user:', err);
        if (err.message?.includes('duplicate key')) {
            return { success: false, error: 'A user with this email already exists.' };
        }
        return { success: false, error: err.message || 'Failed to create user.' };
    }
}

// Lists all team members (excluding password hashes)
export async function listUsers() {
    try {
        const sql = getSql();
        await ensureUsersTable();

        const rows = await sql`
      SELECT id, name, email, role, permissions, is_active, created_at
      FROM app_users
      ORDER BY created_at ASC
    `;
        return rows || [];
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to list users:', err);
        return [];
    }
}

// Updates a user's role (Super Admin only)
export async function updateUserRole(userId, newRole) {
    try {
        const sql = getSql();
        const roleToSet = newRole === 'admin' ? 'user' : newRole;
        await sql`
      UPDATE app_users SET role = ${roleToSet} WHERE id = ${userId}
    `;
        invalidateUserCache(userId);
        return true;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to update user role:', err);
        return false;
    }
}

// Updates a user's granular permissions (Super Admin only)
export async function updateUserPermissions(userId, permissions) {
    try {
        const sql = getSql();
        const rows = await sql`
            UPDATE app_users 
            SET permissions = ${permissions ? JSON.stringify(permissions) : null}
            WHERE id = ${userId}
            RETURNING id, name, email, role, permissions, is_active
        `;
        invalidateUserCache(userId, rows?.[0]?.email);
        return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to update user permissions:', err);
        return null;
    }
}

// Updates a user's name, email, role, and optional permissions (Super Admin only)
export async function updateUserDetails(userId, { name, email, role, permissions }) {
    try {
        const sql = getSql();
        const oldUsers = await sql`SELECT name, email FROM app_users WHERE id = ${userId} LIMIT 1`;
        const oldName = oldUsers?.[0]?.name;
        const normalizedRole = role === 'admin' ? 'user' : role;

        if (permissions !== undefined) {
            await sql`
              UPDATE app_users 
              SET name = ${name.trim()}, 
                  email = ${email.toLowerCase().trim()}, 
                  role = ${normalizedRole},
                  permissions = ${permissions ? JSON.stringify(permissions) : null}
              WHERE id = ${userId}
            `;
        } else {
            await sql`
              UPDATE app_users 
              SET name = ${name.trim()}, 
                  email = ${email.toLowerCase().trim()}, 
                  role = ${normalizedRole}
              WHERE id = ${userId}
            `;
        }

        invalidateUserCache(userId, email);

        if (oldName && oldName.trim() !== name.trim()) {
            try {
                await sql`
                  UPDATE record_lead_sources 
                  SET created_by = ${name.trim()} 
                  WHERE LOWER(created_by) = ${oldName.toLowerCase().trim()};
                `;
                console.log(`📌 [UserAuth] Updated record_lead_sources created_by from "${oldName}" to "${name.trim()}"`);
            } catch (cascadeErr) {
                console.warn('⚠️ [UserAuth] Failed to cascade name update to record_lead_sources:', cascadeErr.message);
            }

            try {
                await sql`
                  UPDATE sync_activity 
                  SET message = REPLACE(message, '[' || ${oldName.trim()} || ']', '[' || ${name.trim()} || ']')
                  WHERE message LIKE ${'%[' + oldName.trim() + ']%'};
                `;
                await sql`
                  UPDATE sync_activity 
                  SET message = REPLACE(message, 'created by ' || ${oldName.trim()}, 'created by ' || ${name.trim()})
                  WHERE message LIKE ${'%created by ' + oldName.trim() + '%'};
                `;
                await sql`
                  UPDATE sync_activity 
                  SET message = REPLACE(message, 'updated by ' || ${oldName.trim()}, 'updated by ' || ${name.trim()})
                  WHERE message LIKE ${'%updated by ' + oldName.trim() + '%'};
                `;
                await sql`
                  UPDATE sync_activity 
                  SET message = REPLACE(message, 'deleted by ' || ${oldName.trim()}, 'deleted by ' || ${name.trim()})
                  WHERE message LIKE ${'%deleted by ' + oldName.trim() + '%'};
                `;
                console.log(`📌 [UserAuth] Updated sync_activity messages from "${oldName}" to "${name.trim()}"`);
            } catch (syncCascadeErr) {
                console.warn('⚠️ [UserAuth] Failed to cascade name update to sync_activity:', syncCascadeErr.message);
            }

            // Sync creator notes in HubSpot CRM asynchronously
            syncHubSpotNotesForUser(email, name.trim(), oldName.trim()).catch(err => {
              console.warn('⚠️ [UserAuth] Background HubSpot notes sync failed:', err.message);
            });
        }

        return true;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to update user details:', err);
        if (err.message?.includes('duplicate key')) {
            throw new Error('A user with this email already exists.');
        }
        throw new Error(err.message || 'Failed to update user details.');
    }
}

// Updates a user's password (Super Admin only)
export async function updateUserPassword(userId, newPassword) {
    try {
        const sql = getSql();
        const existing = await sql`SELECT id, email FROM app_users WHERE id = ${userId} LIMIT 1`;
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await sql`
      UPDATE app_users 
      SET password_hash = ${passwordHash} 
      WHERE id = ${userId}
    `;
        if (existing && existing.length > 0) {
            invalidateUserCache(existing[0].id, existing[0].email);
        } else {
            invalidateUserCache(userId);
        }
        return true;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to update user password:', err);
        return false;
    }
}

// Deletes a user (Super Admin only)
export async function deleteUser(userId) {
    try {
        const sql = getSql();
        const existing = await sql`SELECT id, email FROM app_users WHERE id = ${userId} LIMIT 1`;
        await sql`
      DELETE FROM app_users WHERE id = ${userId}
    `;
        if (existing && existing.length > 0) {
            invalidateUserCache(existing[0].id, existing[0].email);
            console.log(`🗑️ [UserAuth] Deleted user ID ${userId} (${existing[0].email}) and purged auth cache.`);
        } else {
            invalidateUserCache(userId);
        }
        return true;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to delete user:', err);
        return false;
    }
}

// Deactivates a user (soft delete — Super Admin only)
export async function setUserActive(userId, isActive) {
    try {
        const sql = getSql();
        const existing = await sql`SELECT id, email FROM app_users WHERE id = ${userId} LIMIT 1`;
        await sql`
      UPDATE app_users SET is_active = ${isActive} WHERE id = ${userId}
    `;
        if (existing && existing.length > 0) {
            invalidateUserCache(existing[0].id, existing[0].email);
            console.log(`🔒 [UserAuth] Set user ID ${userId} (${existing[0].email}) active=${isActive} and purged auth cache.`);
        } else {
            invalidateUserCache(userId);
        }
        return true;
    } catch (err) {
        console.error('🔥 [UserAuth] Failed to update user active status:', err);
        return false;
    }
}