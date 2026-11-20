import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UpdateStudyRequest } from '@/services/studyService';
import type { SystemRole } from '@/types/database';

const KEY = 'trakyane.onboarding';

export type PendingStudy = UpdateStudyRequest;

export type EntryChoice = {
  role: SystemRole;
  study: PendingStudy | null;
};

type StoredEntry = {
  role?: unknown;
  study?: {
    department_id?: unknown;
    course_ids?: unknown;
  } | null;
};

function isRole(value: unknown): value is SystemRole {
  return value === 'student' || value === 'teacher' || value === 'admin';
}

function readStudy(value: StoredEntry['study']): PendingStudy | null {
  if (!value || typeof value.department_id !== 'string' || value.department_id.length === 0) return null;
  if (!Array.isArray(value.course_ids)) return null;
  const course_ids = [...new Set(value.course_ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (course_ids.length === 0) return null;
  return { department_id: value.department_id, course_ids };
}

export async function loadEntry(): Promise<EntryChoice | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredEntry;
    if (!isRole(parsed.role)) return null;
    return {
      role: parsed.role,
      study: parsed.role === 'student' ? readStudy(parsed.study) : null,
    };
  } catch {
    return null;
  }
}

async function writeEntry(entry: EntryChoice) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      role: entry.role,
      study: entry.role === 'student' ? entry.study : null,
    }),
  );
}

export async function saveGate(role: SystemRole) {
  const current = await loadEntry();
  await writeEntry({
    role,
    study: role === 'student' ? current?.study ?? null : null,
  });
}

export async function savePendingStudy(study: PendingStudy) {
  await writeEntry({ role: 'student', study });
}

export async function clearPendingStudy() {
  const current = await loadEntry();
  if (!current) return;
  await writeEntry({ role: current.role, study: null });
}
