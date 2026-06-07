import { api } from './client';
export const Notifications = {
    list: () => api.get('/api/notifications'),
    markSeen: (id) => api.post(`/api/notifications/${id}/seen`),
};
