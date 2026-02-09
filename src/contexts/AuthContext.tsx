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
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  const determineUserRole = useCallback(async (currentUser: User): Promise<'admin' | 'user' | null> => {
    try {
      if (currentUser.email === 'owner@gmail.com') {
        return 'admin';
      }
      const memberRef = ref(database, `members/${currentUser.uid}`);
      const snapshot = await get(memberRef);
      return snapshot.exists() ? 'user' : null;
    } catch (error) {
      console.error('Error determining user role:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // INITIAL load – waits for Firebase to restore auth from persistence,
    // then reads currentUser and resolves the role BEFORE setting loading to false.
    const initializeAuth = async () => {
      try {
        const readyPromise =
          typeof (auth as any).authStateReady === 'function'
            ? (auth as any).authStateReady()
            : new Promise<void>((resolve) => setTimeout(resolve, 1500));

        // Safety timeout so the app never gets stuck loading
        await Promise.race([
          readyPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 12000)),
        ]);

        if (!isMounted) return;

        // auth.currentUser is guaranteed to be populated after authStateReady
        const currentUser = auth.currentUser;
        setUser(currentUser);

        if (currentUser) {
          const role = await determineUserRole(currentUser);
          if (isMounted) setUserRole(role);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error during initial auth setup:', error);
        if (isMounted) {
          setUser(null);
          setUserRole(null);
        }
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // ONGOING listener – fires on sign-in / sign-out / token refresh AFTER init.
    // Does NOT control isLoading.
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      if (!isMounted || !initializedRef.current) return;
      console.log('Auth state changed:', currentUser?.email || 'No user');
      setUser(currentUser);

      if (currentUser) {
        determineUserRole(currentUser).then((role) => {
          if (isMounted) setUserRole(role);
        });
      } else {
        setUserRole(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [determineUserRole]);

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
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
    loading: isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
