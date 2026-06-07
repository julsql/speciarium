import { api } from './client';
export const Auth = {
    me: () => api.get('/api/auth/me'),
    login: (username, password) => api.post('/api/auth/login', { username, password }),
    demo: () => api.post('/api/auth/demo'),
    signup: (username, email, password) => api.post('/api/auth/signup', { username, email, password }),
    logout: () => api.post('/api/auth/logout'),
};
