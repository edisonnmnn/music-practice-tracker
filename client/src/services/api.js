import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send session cookie on every request
});

// Only redirect on 401 for non-auth endpoints
// (auth endpoints like /auth/me are expected to return 401 when not logged in)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config.url.startsWith('/auth/')
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  me: () => api.get('/auth/me'),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  googleLoginUrl: `${API_URL}/auth/google`,
};

export const sessionsAPI = {
  getAll: () => api.get('/api/sessions'),
  getOne: (id) => api.get(`/api/sessions/${id}`),
  create: (data) => api.post('/api/sessions', data),
  update: (id, data) => api.put(`/api/sessions/${id}`, data),
  delete: (id) => api.delete(`/api/sessions/${id}`),
  getStats: () => api.get('/api/sessions/stats'),
};

export const coachingAPI = {
  getAdvice: (prompt = '') => api.post('/api/coaching', { prompt }),
  getHistory: (page = 1) => api.get(`/api/coaching/history?page=${page}`),
};

export default api;
