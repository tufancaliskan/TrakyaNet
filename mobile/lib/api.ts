import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const TOKEN_KEY = 'trakyane.token';

const baseURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const isApiConfigured = Boolean(baseURL && baseURL.startsWith('http'));

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
