/**
 * auth.js — Minimal JWT auth helpers
 * Stores token in localStorage, exposes useAuth hook.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "meetly_jwt";
const USER_KEY  = "meetly_user";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });

  const login = useCallback((tok, usr) => {
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(USER_KEY, JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Returns Authorization header object if token exists, else empty object */
export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
