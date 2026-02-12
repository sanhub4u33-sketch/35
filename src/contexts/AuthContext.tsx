import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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
  const currentUidRef = useRef<string | null>(null);

  const determineUserRole = useCallback(async (currentUser: User): Promise<'admin' | 'user' | null> => {
    try {
      if (currentUser.email === 'owner@gmail.com') {
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

    // Phase 1: Wait for Firebase to restore persisted session BEFORE setting loading=false
    const initializeAuth = async () => {
      try {
        // Wait for Firebase to be ready (restores persisted session)
        const readyPromise =
          typeof (auth as any).authStateReady === 'function'
            ? (auth as any).authStateReady()
            : new Promise<void>((resolve) => setTimeout(resolve, 1500));

        await Promise.race([
          readyPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 12000)),
        ]);

        if (!isMounted) return;

        const currentUser = auth.currentUser;
        currentUidRef.current = currentUser?.uid ?? null;
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
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Phase 2: Listen for ACTUAL sign-in/sign-out changes (not token refreshes)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;

      // Skip if same user - prevents re-renders from duplicate callbacks
      if (currentUser?.uid === currentUidRef.current && !currentUser === !currentUidRef.current) {
        return;
      }

      currentUidRef.current = currentUser?.uid ?? null;
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
    currentUidRef.current = null;
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
