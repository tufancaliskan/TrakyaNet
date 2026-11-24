import axios from 'axios';

import { api } from '@/lib/api';
import type { ClassroomInvitation } from '@/types/classroom';

export async function getPendingInvitations(): Promise<ClassroomInvitation[]> {
  try {
    const { data } = await api.get<ClassroomInvitation[]>('/api/invitations/pending');
    return data;
  } catch (error) {
    // Uç henüz yoksa öğrenci ekranında hata gösterme.
    if (axios.isAxiosError(error) && error.response?.status === 404) return [];
    throw error;
  }
}

export async function respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
  await api.post(`/api/invitations/${invitationId}/respond`, { accept });
}
