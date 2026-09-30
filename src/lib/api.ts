// src/lib/api.ts
import { API_URL } from './config';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    is_platform_admin: boolean;
  };
}

function redactBody(data: unknown) {
  if (!data || typeof data !== 'object') return data;
  const copy = { ...(data as Record<string, unknown>) };
  for (const key of ['password', 'current_password', 'new_password', 'otp']) {
    if (key in copy) copy[key] = '[REDACTED]';
  }
  return copy;
}

function getResponseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return fallback;
  const message = (payload as { message?: unknown }).message;
  return Array.isArray(message) ? message.join(', ') : String(message || fallback);
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    return getResponseMessage(await response.json(), fallback);
  } catch {
    return fallback;
  }
}

function toFriendlyError(error: unknown, label: string): Error {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error(
      `${label} timed out. Make sure the backend is running at ${API_URL}.`
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (
    lower.includes('connectexception') ||
    lower.includes('failed to connect') ||
    lower.includes('network request failed') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror')
  ) {
    return new Error(
      `Cannot reach the server at ${API_URL}. On a phone, localhost is the device itself.`
    );
  }

  return error instanceof Error ? error : new Error(message || `${label} failed`);
}

async function requestJson<T>(label: string, url: string, options: RequestInit = {}) {
  const requestBody = options.body ? JSON.parse(String(options.body)) : undefined;
  console.log(`[API][${label}] -> ${options.method || 'GET'} ${url}`, redactBody(requestBody));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    console.log(`[API][${label}] <- ${response.status}`, payload);
    if (!response.ok) {
      throw new Error(getResponseMessage(payload, `${label} failed`));
    }
    return payload as T;
  } catch (error) {
    const normalizedError = toFriendlyError(error, label);
    console.error(`[API][${label}] request failed`, normalizedError);
    throw normalizedError;
  } finally {
    clearTimeout(timeout);
  }
}

console.log('[API] configured base URL:', API_URL);

export const api = {
  async getCurrentUser(accessToken: string) {
    return requestJson<LoginResponse['user']>('me', `${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  async updateProfile(accessToken: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await getErrorMessage(res, 'Unable to update your profile'));
    }
    return res.json();
  },

  async signup(data: any) {
    return requestJson('signup', `${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async verifyOtp(email: string, otp: string) {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      throw new Error(await getErrorMessage(res, 'Verification failed'));
    }
    return res.json();
  },

  async resendOtp(email: string) {
    const res = await fetch(`${API_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      throw new Error(await getErrorMessage(res, 'Failed to resend code'));
    }
    return res.json();
  },

  async login(identifier: string, password: string) {
    return requestJson<LoginResponse>('login', `${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
  },
};