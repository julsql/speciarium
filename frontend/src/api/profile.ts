import { api } from './client';
import type { UploadHistoryDto } from '../types/api';

export const Profile = {
  uploads: () => api.get<UploadHistoryDto[]>('/api/profile/uploads'),
  updateUsername: (username: string) =>
    api.patch<{ username: string }>('/api/profile/username', { username }),
  updateEmail: (email: string) =>
    api.patch<{ email: string }>('/api/profile/email', { email }),
  updatePassword: (oldPassword: string, newPassword: string) =>
    api.patch<void>('/api/profile/password', { oldPassword, newPassword }),
  deleteAccount: (password: string) =>
    api.post<void>('/api/profile/delete', { password }),
};
