import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => { setUser(null); setUnread(0); };
    window.addEventListener('findback:logout', onLogout);
    return () => window.removeEventListener('findback:logout', onLogout);
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const r = await api.get('/notifications/unread-count');
      setUnread(r.data.count);
    } catch { /* ignore */ }
  }, []);

  // Poll for in-app notifications every 30 seconds while signed in
  useEffect(() => {
    if (!user) return undefined;
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [user, refreshUnread]);

  const saveSession = ({ token, user: u }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  };

  const login = async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data);
  const register = async (data) => saveSession((await api.post('/auth/register', data)).data);
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setUnread(0);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, unread, refreshUnread }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
