import { api } from './client';
import type { MapTilesDto, ThemeDto } from '../types/api';

export const Themes = {
  list: () => api.get<ThemeDto[]>('/api/themes'),
  select: (id: number) => api.post<void>(`/api/themes/${id}/select`),
};

export const MapTiles = {
  list: () => api.get<MapTilesDto[]>('/api/map-tiles'),
  select: (id: number) => api.post<void>(`/api/map-tiles/${id}/select`),
};
