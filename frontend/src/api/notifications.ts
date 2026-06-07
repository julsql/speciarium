import { api } from './client';
import type { NotificationDto } from '../types/api';

export const Notifications = {
  list: () => api.get<NotificationDto[]>('/api/notifications'),
  markSeen: (id: string) => api.post<void>(`/api/notifications/${id}/seen`),
};
