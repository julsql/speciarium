import { api } from './client';

export interface FilterQuery {
  field: 'continent' | 'country' | 'region' | 'year' | 'kingdom' | 'class' | 'order' | 'family';
  continent?: string;
  country?: string;
  region?: string;
  year?: number;
  kingdom?: string;
  class?: string;
  order?: string;
}

export const Filters = {
  options: (q: FilterQuery) => api.get<{ options: string[] }>('/api/filter-options', q),
};
