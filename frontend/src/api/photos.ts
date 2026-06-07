import { api } from './client';
import type { Paginated, PhotoDto } from '../types/api';

export interface PhotoQuery {
  kingdom?: string;
  class_field?: string;
  order_field?: string;
  family?: string;
  continent?: string;
  country?: string;
  region?: string;
  year?: number;
  species_id?: number;
  page?: number;
  per_page?: number;
}

export const Photos = {
  list: (q: PhotoQuery = {}) => api.get<Paginated<PhotoDto>>('/api/photos', q),
  hashes: () => api.get<{ keys: string[] }>('/api/photos/hash'),
};
