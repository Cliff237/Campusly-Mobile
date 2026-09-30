import { API_URL } from './config';
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  if (!accessToken && typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem('campusly_auth') || '{}') as { accessToken?: string };
      accessToken = saved.accessToken;
    } catch {
      accessToken = null;
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    signal: controller.signal,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}
export async function mockFetch<T>(
  data: T,
  options: { latency?: [number, number] } = {},
): Promise<T> {
  const [min, max] = options.latency || [300, 800];
  const delay = Math.random() * (max - min) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return data;
}