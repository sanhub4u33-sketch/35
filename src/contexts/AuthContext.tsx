import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut,
  onIdTokenChanged
} from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';

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
      if (currentUser.email === 'wisebrary@gmail.com') {
        return 'admin';
      }
      const membersSnap = await getDocs(
        query(collection(firestore, 'members'), where('email', '==', currentUser.email))
      );
      return membersSnap.size > 0 ? 'user' : null;
    } catch (error) {
      console.error('Error determining user role:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // INITIAL load — controls isLoading, runs once
    const initializeAuth = async () => {
      try {
        const readyPromise =
          typeof (auth as any).authStateReady === 'function'
            ? (auth as any).authStateReady()
            : new Promise<void>((resolve) => setTimeout(resolve, 500));

        // Reduced timeout to 5s to avoid long white screen in PWA
        await Promise.race([
          readyPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);

        if (!isMounted) return;

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

    // ONGOING auth changes — does NOT control isLoading
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      if (!isMounted || !initializedRef.current) return;

      setUser(currentUser);

      if (currentUser) {
        // Use setTimeout to avoid deadlocks inside the auth callback
        setTimeout(() => {
          determineUserRole(currentUser).then((role) => {
            if (isMounted) setUserRole(role);
          });
        }, 0);
      } else {
        // Explicitly reset role on logout so reopening PWA shows home page
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
