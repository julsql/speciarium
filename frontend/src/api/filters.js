import { api } from './client';
export const Filters = {
    options: (q) => api.get('/api/filter-options', q),
};
