import { api } from '@/lib/api';
import type { ClassroomInvitation } from '@/types/classroom';

export async function getPendingInvitations(): Promise<ClassroomInvitation[]> {
  const { data } = await api.get<ClassroomInvitation[]>('/api/invitations/pending');
  return data;
}

export async function respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
  await api.post(`/api/invitations/${invitationId}/respond`, { accept });
}
