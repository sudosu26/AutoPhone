import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS, DEFAULT_BACKEND_URL } from '../utils/constants';
import type { ApiResponse } from './types';

export function getStoredBackendUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.BACKEND_URL) || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredBackendUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BACKEND_URL, url.replace(/\/+$/, ''));
    apiClient.defaults.baseURL = url.replace(/\/+$/, '');
  } catch (err) {
    console.error('Failed to save backend URL to localStorage', err);
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
  } catch (err) {
    console.error('Failed to save API key to localStorage', err);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  } catch (err) {
    console.error('Failed to remove API key from localStorage', err);
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getStoredBackendUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to attach authentication
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const apiKey = getStoredApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
      config.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response interceptor to unwrap ApiResponse format & monitor connectivity
apiClient.interceptors.response.use(
  (response) => {
    // Notify window that backend responded successfully
    window.dispatchEvent(new CustomEvent('phonepilot:online'));

    const data = response.data;
    // Check if response conforms to unified ApiResponse wrapper
    if (data && typeof data === 'object' && 'success' in data) {
      const apiResp = data as ApiResponse;
      if (!apiResp.success) {
        const errorMsg = apiResp.error?.message || 'API request failed';
        return Promise.reject(new Error(errorMsg));
      }
      return apiResp.data !== undefined ? apiResp.data : apiResp;
    }

    return data;
  },
  (error: AxiosError) => {
    if (!error.response) {
      // Network error or backend offline
      window.dispatchEvent(
        new CustomEvent('phonepilot:offline', {
          detail: { message: error.message || 'Network connection failed' },
        })
      );
    } else if (error.response.status === 401) {
      window.dispatchEvent(new CustomEvent('phonepilot:unauthorized'));
    }

    const data = error.response?.data as any;
    let message = error.message;
    if (data?.error?.message) {
      message = data.error.message;
    } else if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else if (data?.message) {
      message = data.message;
    }

    const customError = new Error(message);
    (customError as any).status = error.response?.status;
    (customError as any).originalError = error;
    return Promise.reject(customError);
  }
);
