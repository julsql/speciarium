import { api } from './client';
import type { CollectionDto } from '../types/api';

export const Collections = {
  list: () => api.get<CollectionDto[]>('/api/collections'),
  create: (title: string) => api.post<CollectionDto>('/api/collections', { title }),
  select: (id: number) => api.post<void>(`/api/collections/${id}/select`),
  rename: (id: number, title: string) =>
    api.patch<CollectionDto>(`/api/collections/${id}`, { title }),
  remove: (id: number) => api.del(`/api/collections/${id}`),
  share: (collectionId: number, username: string) =>
    api.post<void>('/api/collections/share', { collectionId, username }),
};
