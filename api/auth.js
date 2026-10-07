import { getUserByEmail, verifyPassword, generateToken, verifyToken } from '../lib/userAuth.js';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { email, password } = req.body || {};

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required.' });
            }

            const user = await getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            if (user.is_active === false) {
                return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
            }

            const isMatch = await verifyPassword(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            const token = generateToken(user);

            return res.status(200).json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (err) {
            console.error('🔥 [API/Auth] Login error:', err);
            return res.status(500).json({ error: 'Login failed due to a server error.' });
        }
    }

    if (req.method === 'GET') {
        try {
            const authHeader = req.headers['authorization'];
            let token = null;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            } else if (req.headers['x-auth-token']) {
                token = req.headers['x-auth-token'];
            }

            if (!token) {
                return res.status(401).json({ error: 'No token provided.' });
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return res.status(401).json({ error: 'Token is invalid or expired.' });
            }

            // Always fetch latest user state from database to catch role/name updates immediately
            const dbUser = decoded.email ? await getUserByEmail(decoded.email) : null;
            if (dbUser) {
                if (dbUser.is_active === false) {
                    return res.status(403).json({ error: 'Your account has been deactivated.' });
                }

                const hasChanged = dbUser.name !== decoded.name || dbUser.role !== decoded.role || dbUser.email !== decoded.email;
                let freshToken = token;
                if (hasChanged) {
                    freshToken = generateToken(dbUser);
                }

                return res.status(200).json({
                    user: {
                        id: dbUser.id,
                        name: dbUser.name,
                        email: dbUser.email,
                        role: dbUser.role,
                    },
                    token: freshToken
                });
            }

            return res.status(200).json({
                user: {
                    id: decoded.userId,
                    name: decoded.name,
                    email: decoded.email,
                    role: decoded.role,
                },
                token
            });
        } catch (err) {
            console.error('🔥 [API/Auth] Token verify error:', err);
            return res.status(500).json({ error: 'Token verification failed.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
