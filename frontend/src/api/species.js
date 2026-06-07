import { api } from './client';
export const Species = {
    list: (q = {}) => api.get('/api/species', q),
    get: (id) => api.get(`/api/species/${id}`),
    photos: (id) => api.get(`/api/species/${id}/photos`),
    grouped: (by, compareWith = [], q = {}) => api.get('/api/species/grouped', {
        by,
        compare_with: compareWith.length > 0 ? compareWith.join(',') : undefined,
        ...q,
    }),
};
