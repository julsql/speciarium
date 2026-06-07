import { api } from './client';
export const Photos = {
    list: (q = {}) => api.get('/api/photos', q),
    hashes: () => api.get('/api/photos/hash'),
};
