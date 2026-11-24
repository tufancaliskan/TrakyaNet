import { api } from '@/lib/api';
import type { ClassroomMaterial, MaterialType } from '@/types/classroom';

export async function getMaterials(classroomId: string, type: MaterialType): Promise<ClassroomMaterial[]> {
  const { data } = await api.get<ClassroomMaterial[]>(`/api/classrooms/${classroomId}/materials`, {
    params: { type },
  });
  return data;
}

export async function createMaterial(
  classroomId: string,
  input: {
    title: string;
    content: string;
    type: MaterialType;
    file?: { uri: string; name: string; mimeType?: string | null };
  },
): Promise<ClassroomMaterial> {
  const body = new FormData();
  body.append('title', input.title.trim());
  body.append('content', input.content.trim());
  body.append('type', input.type);
  if (input.file) {
    body.append('file', {
      uri: input.file.uri,
      name: input.file.name,
      type: input.file.mimeType ?? guessType(input.file.name) ?? 'application/octet-stream',
    } as unknown as Blob);
  }
  const { data } = await api.post<ClassroomMaterial>(`/api/classrooms/${classroomId}/materials`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

function guessType(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.txt')) return 'text/plain';
  return null;
}
