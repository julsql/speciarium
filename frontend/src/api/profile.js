import { api } from './client';
export const Profile = {
    uploads: () => api.get('/api/profile/uploads'),
    updateUsername: (username) => api.patch('/api/profile/username', { username }),
    updateEmail: (email) => api.patch('/api/profile/email', { email }),
    updatePassword: (oldPassword, newPassword) => api.patch('/api/profile/password', { oldPassword, newPassword }),
    deleteAccount: (password) => api.post('/api/profile/delete', { password }),
};
