import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
export const TOKEN_KEY = 'findback_token';

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Expired or invalid session: sign the user out everywhere
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('findback:logout'));
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong. Try again.';
export const imgUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${API_BASE}${p}`);

export default api;
