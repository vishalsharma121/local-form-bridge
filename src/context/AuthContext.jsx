import React, { createContext, useContext, useState, useEffect } from 'react';
import { can as checkCan } from '../../lib/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('app_auth_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Verify token on mount if token exists
  useEffect(() => {
    let isMounted = true;
    async function verifyExistingToken() {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      console.log('🔑 [AuthContext] Verifying stored token on mount...');
      try {
        const res = await fetch('/api/auth', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // CRITICAL FIX FOR REACT STRICTMODE:
        // If effect was cleaned up / unmounted while fetch was in flight,
        // DO NOT mutate state or trigger logout().
        if (!isMounted) {
          console.log('⚠️ [AuthContext] Effect instance unmounted while fetch was in flight; skipping state mutation.');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          if (data && data.user) {
            console.log('✅ [AuthContext] Token verified successfully for:', data.user.email);
            setUser(data.user);
          } else {
            console.log('❌ [AuthContext] Call branch 1 (res.ok but invalid data) -> logout()');
            logout();
          }
        } else if (res.status === 401 || res.status === 403) {
          console.log(`❌ [AuthContext] Call branch 2 (res.status = ${res.status}) -> logout()`);
          logout();
        } else {
          console.warn(`⚠️ [AuthContext] Server returned status ${res.status}; preserving token.`);
        }
      } catch (err) {
        console.error('🔥 [AuthContext] Call branch 3 (Fetch exception/network error):', err);
        // Note: Do not call logout() on network failure to avoid wiping valid offline tokens
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifyExistingToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email, password) => {
    setAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        const msg = data.error || 'Login failed. Please check your credentials.';
        setAuthError(msg);
        return { success: false, error: msg };
      }

      localStorage.setItem('app_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Network error during login.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = (reason = 'user_action') => {
    console.log(`🚪 [AuthContext] logout() called! Reason: ${reason}`);
    localStorage.removeItem('app_auth_token');
    setToken(null);
    setUser(null);
    setAuthError('');
  };

  const can = (action) => {
    return checkCan(user?.role, action);
  };

  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Backward compatibility fallback for dev/testing
    const envAdminKey = import.meta.env.VITE_ADMIN_KEY;
    if (envAdminKey) {
      headers['x-admin-key'] = envAdminKey;
    }
    return headers;
  };

  const updateToken = (newToken) => {
    if (newToken) {
      localStorage.setItem('app_auth_token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('app_auth_token');
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        login,
        logout,
        updateToken,
        can,
        getAuthHeaders,
        isSuperAdmin: user?.role === 'super_admin',
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
        isViewer: user?.role === 'viewer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
