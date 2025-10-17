import { fetchWithAuth } from './common';
import { UserType } from '../types/user';

export const usersApi = {
  getProfile: async () => {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`);
    return res.json();
  },

  updateProfile: async (data: Partial<UserType>) => {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
