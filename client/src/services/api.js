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
  streamAdvice: async (prompt, onChunk, onMeta, onDone, onError) => {
    try {
      const response = await fetch(`${API_URL}/api/coaching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const err = await response.json();
        onError(err.error || 'Request failed');
        return;
      }

      // Check if it's a non-streaming JSON response (e.g. no sessions)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.advice) onChunk(data.advice);
        if (data.sessionCount != null) onMeta({ sessionCount: data.sessionCount });
        onDone();
        return;
      }

      // SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.sessionCount != null) onMeta({ sessionCount: data.sessionCount });
          if (data.chunk) onChunk(data.chunk);
          if (data.error) onError(data.error);
          if (data.done) onDone();
        }
      }
    } catch {
      onError('Failed to connect to coaching service');
    }
  },
  getHistory: (page = 1) => api.get(`/api/coaching/history?page=${page}`),
};

export default api;
