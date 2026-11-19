import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';

import { TOKEN_KEY, api } from '@/lib/api';

export async function pickPdf() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export async function createAssignment(input: {
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  file: { uri: string; name: string } | null;
}) {
  const body = new FormData();
  body.append('ClassId', input.classId);
  body.append('Title', input.title);
  body.append('Description', input.description);
  body.append('DueDate', input.dueDate);
  if (input.file) {
    body.append('File', {
      uri: input.file.uri,
      name: input.file.name.toLowerCase().endsWith('.pdf') ? input.file.name : `${input.file.name}.pdf`,
      type: 'application/pdf',
    } as unknown as Blob);
  }

  await api.post('/api/assignments', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function openAssignmentFile(assignmentId: string) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const root = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!root || !token) {
    throw new Error('Dosya bağlantısı oluşturulamadı.');
  }
  const url = `${root}/api/assignments/${assignmentId}/file?access_token=${encodeURIComponent(token)}`;
  await WebBrowser.openBrowserAsync(url);
}
