import { api } from './client';
export const Collections = {
    list: () => api.get('/api/collections'),
    create: (title) => api.post('/api/collections', { title }),
    select: (id) => api.post(`/api/collections/${id}/select`),
    rename: (id, title) => api.patch(`/api/collections/${id}`, { title }),
    remove: (id) => api.del(`/api/collections/${id}`),
    share: (collectionId, username) => api.post('/api/collections/share', { collectionId, username }),
};
