import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';

const AuthContext = createContext({
  user: null,
  loading: false,
  loginWithGoogle: async () => { },
  loginAsGuest: async () => { },
  logout: async () => { }
});

const googleProvider = new GoogleAuthProvider();

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || {};
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ipl_user');
      if (stored) return JSON.parse(stored);
    } catch { /* ok */ }
    return {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      displayName: 'Manager',
      isAnonymous: true
    };
  });

  useEffect(() => {
    if (!auth) return;
    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          try { localStorage.setItem('ipl_user', JSON.stringify(firebaseUser)); } catch { /* ok */ }
        }
      });
      return unsubscribe;
    } catch (err) {
      console.warn("Auth state listener:", err);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) return user;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      try { localStorage.setItem('ipl_user', JSON.stringify(result.user)); } catch { /* ok */ }
      return result.user;
    } catch (err) {
      console.warn("Google login unavailable:", err);
      return user;
    }
  };

  const loginAsGuest = async (displayName) => {
    if (!auth) {
      const guestUser = {
        uid: user?.uid || 'guest_' + Math.random().toString(36).substring(2, 9),
        displayName: displayName || 'Manager',
        isAnonymous: true
      };
      setUser(guestUser);
      try { localStorage.setItem('ipl_user', JSON.stringify(guestUser)); } catch { /* ok */ }
      return guestUser;
    }
    try {
      const result = await signInAnonymously(auth);
      await updateProfile(result.user, { displayName });
      const guestUser = { ...result.user, displayName: displayName || 'Manager' };
      setUser(guestUser);
      try { localStorage.setItem('ipl_user', JSON.stringify(guestUser)); } catch { /* ok */ }
      return guestUser;
    } catch (err) {
      const guestUser = {
        uid: user?.uid || 'guest_' + Math.random().toString(36).substring(2, 9),
        displayName: displayName || 'Manager',
        isAnonymous: true
      };
      setUser(guestUser);
      try { localStorage.setItem('ipl_user', JSON.stringify(guestUser)); } catch { /* ok */ }
      return guestUser;
    }
  };

  const logout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch { /* ok */ }
    }
    setUser(null);
    try { localStorage.removeItem('ipl_user'); } catch { /* ok */ }
  };

  const value = {
    user,
    loading: false,
    loginWithGoogle,
    loginAsGuest,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
