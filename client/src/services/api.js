import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send session cookie on every request
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired — redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Returns the currently logged-in user from the session
  me: () => api.get('/auth/me'),
  // Logout destroys the server session
  logout: () => api.post('/auth/logout'),
  // Google OAuth is initiated by navigating the browser to this URL
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
  getAdvice: () => api.get('/api/coaching'),
  getHistory: (page = 1) => api.get(`/api/coaching/history?page=${page}`),
};

export default api;
