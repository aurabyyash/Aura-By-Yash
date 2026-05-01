import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredSession,
  getStoredSession,
  getUser,
  isAdminEmail,
  readSessionFromUrl,
  refreshSession,
  resendSignupConfirmation,
  signInWithPassword,
  signInWithOAuthProvider,
  signOut,
  signUpCustomer,
  storeSession,
} from '../lib/supabase';

const AuthContext = createContext(null);

const toAppUser = (authUser) => {
  if (!authUser) {
    return null;
  }

  const metadata = authUser.user_metadata || {};
  const role = isAdminEmail(authUser.email) ? 'admin' : 'customer';

  return {
    id: authUser.id,
    email: authUser.email,
    name: metadata.username || authUser.email,
    phone: metadata.phone || '',
    username: metadata.username || '',
    role,
    emailConfirmed: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
  };
};

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const sessionFromUrl = readSessionFromUrl();
      const savedSession = sessionFromUrl || getStoredSession();

      if (!savedSession) {
        setLoading(false);
        return;
      }

      try {
        const authUser = await getUser(savedSession);

        if (!isMounted) return;

        storeSession(savedSession);
        setSession(savedSession);
        setUser(toAppUser(authUser));
      } catch {
        try {
          const refreshedSession = await refreshSession(savedSession);
          const authUser = await getUser(refreshedSession);

          if (!isMounted) return;

          setSession(refreshedSession);
          setUser(toAppUser(authUser));
        } catch {
          clearStoredSession();

          if (!isMounted) return;

          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const nextSession = await signInWithPassword({ email, password });
    setSession(nextSession);
    setUser(toAppUser(nextSession.user));
    return toAppUser(nextSession.user);
  }, []);

  const signup = useCallback(async ({ email, password, phone, username }) => {
    const result = await signUpCustomer({ email, password, phone, username });

    if (result.session) {
      storeSession(result.session);
      setSession(result.session);
      setUser(toAppUser(result.user));
    }

    return result;
  }, []);

  const loginWithProvider = useCallback((provider) => {
    signInWithOAuthProvider(provider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(session);
    setSession(null);
    setUser(null);
  }, [session]);

  const resendConfirmation = useCallback(async (email = user?.email) => {
    if (!email) {
      throw new Error('Enter your email first.');
    }

    return resendSignupConfirmation(email);
  }, [user?.email]);

  const value = useMemo(() => ({
    session,
    user,
    loading,
    login,
    loginWithProvider,
    signup,
    logout,
    resendConfirmation,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    isEmailConfirmed: Boolean(user?.emailConfirmed),
  }), [session, user, loading, login, loginWithProvider, signup, logout, resendConfirmation]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
