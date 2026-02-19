import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (name, email, password) => 
    api.post('/auth/register', { name, email, password }),
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
};

export const sessionsAPI = {
  getAll: () => api.get('/sessions'),
  getOne: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  getStats: () => api.get('/sessions/stats'),
};

export default api;