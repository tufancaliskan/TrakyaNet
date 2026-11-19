import axios from 'axios';

export function errorMessage(error: unknown, fallback = 'İşlem tamamlanamadı.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message) {
      return data.message;
    }
    if (!error.response) return 'Sunucuya ulaşılamadı. API adresini ve aynı Wi-Fi ağını kontrol et.';
    if (error.response.status === 401) return 'E-posta veya şifre hatalı.';
    if (error.response.status === 403) return 'Bu işlem için yetkin yok.';
  }

  const raw =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  if (!raw || raw === 'An unexpected error occurred invoking \'SendMessage\' on the server.') {
    return fallback;
  }
  return raw;
}
