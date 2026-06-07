import { api } from './client';
import type { UserDto } from '../types/api';

export const Auth = {
  me: () => api.get<UserDto>('/api/auth/me'),
  login: (username: string, password: string) =>
    api.post<UserDto>('/api/auth/login', { username, password }),
  demo: () => api.post<UserDto>('/api/auth/demo'),
  signup: (username: string, email: string, password: string) =>
    api.post<UserDto>('/api/auth/signup', { username, email, password }),
  logout: () => api.post<void>('/api/auth/logout'),
};
