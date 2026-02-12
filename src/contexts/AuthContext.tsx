import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut,
  onIdTokenChanged
} from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  userRole: 'admin' | 'user' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const initializingRef = useRef(true);
  const authReadyRef = useRef(false);

  const determineUserRole = useCallback(async (currentUser: User) => {
    try {
      // Check if user is an admin by looking up admins node in Firebase
      const adminRef = ref(database, `admins/${currentUser.uid}`);
      const adminSnapshot = await get(adminRef);
      if (adminSnapshot.exists()) {
        setUserRole('admin');
        return;
      }

      // Check if user exists in members
      const memberRef = ref(database, `members/${currentUser.uid}`);
      const snapshot = await get(memberRef);
      if (snapshot.exists()) {
        setUserRole('user');
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error determining user role:', error);
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    console.log('AuthProvider: Initializing auth listener');
    
    // Fires on token changes AND when auth state is restored from persistence.
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      // NOTE: On some PWA cold starts Firebase can emit an initial `null` before restore.
      // We do NOT finalize readiness here; we wait for authStateReady() below.
      console.log('Auth state changed:', currentUser?.email || 'No user');
      setUser(currentUser);
      if (!currentUser) setUserRole(null);
    });

    // Wait until Firebase finishes restoring auth from storage (IndexedDB/localStorage).
    // This is the most reliable way to avoid “logged out on reopen” in PWAs.
    const readyPromise =
      typeof (auth as any).authStateReady === 'function'
        ? (auth as any).authStateReady()
        : new Promise<void>((resolve) => setTimeout(resolve, 1500));

    const timeout = setTimeout(() => {
      if (!authReadyRef.current) {
        console.log('Auth state ready timeout; continuing');
        authReadyRef.current = true;
        initializingRef.current = false;
        setAuthReady(true);
      }
    }, 12000);

    readyPromise
      .then(() => {
        if (authReadyRef.current) return;
        authReadyRef.current = true;
        initializingRef.current = false;
        setAuthReady(true);
      })
      .catch((e: any) => {
        console.error('authStateReady failed:', e);
        if (!authReadyRef.current) {
          authReadyRef.current = true;
          initializingRef.current = false;
          setAuthReady(true);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [determineUserRole]);

  // Resolve role after auth is ready and we have a user.
  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setRoleLoading(false);
      setUserRole(null);
      return;
    }

    setRoleLoading(true);
    determineUserRole(user)
      .catch(() => {
        // determineUserRole already logs and sets null role
      })
      .finally(() => {
        setRoleLoading(false);
      });
  }, [authReady, user, determineUserRole]);

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Force token refresh to ensure persistence
    await result.user.getIdToken(true);
    console.log('Login successful, token refreshed');
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
  };

  const value = {
    user,
    userRole,
    loading: !authReady || roleLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
