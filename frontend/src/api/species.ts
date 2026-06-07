import { api } from './client';
import type { ComparisonResult, Paginated, PhotoDto, SpeciesRowDto } from '../types/api';

export interface SpeciesQuery {
  collection_id?: number;
  search?: string;
  latin_name?: string;
  french_name?: string;
  kingdom?: string;
  class_field?: string;
  order_field?: string;
  family?: string;
  year?: number;
  start_date?: string;
  end_date?: string;
  continent?: string;
  country?: string;
  region?: string;
  details?: string;
  latitude?: number;
  longitude?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export const Species = {
  list: (q: SpeciesQuery = {}) => api.get<Paginated<SpeciesRowDto>>('/api/species', q),
  get: (id: number) => api.get<SpeciesRowDto>(`/api/species/${id}`),
  photos: (id: number) => api.get<PhotoDto[]>(`/api/species/${id}/photos`),
  grouped: (
    by: string,
    compareWith: number[] = [],
    q: Omit<SpeciesQuery, 'sort' | 'direction' | 'page' | 'per_page'> = {},
  ) => api.get<ComparisonResult>('/api/species/grouped', {
    by,
    compare_with: compareWith.length > 0 ? compareWith.join(',') : undefined,
    ...q,
  }),
};
