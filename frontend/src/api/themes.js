import { api } from './client';
export const Themes = {
    list: () => api.get('/api/themes'),
    select: (id) => api.post(`/api/themes/${id}/select`),
};
export const MapTiles = {
    list: () => api.get('/api/map-tiles'),
    select: (id) => api.post(`/api/map-tiles/${id}/select`),
};
