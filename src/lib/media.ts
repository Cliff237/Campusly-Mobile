// src/lib/media.ts
import { API_URL } from './config';

/**
 * Resolves an institution logo or media URL into a fully-qualified URL that loads
 * reliably on physical devices, emulators, and web.
 *
 * Handles:
 * - Local backend uploads: `/uploads/...` -> `${API_URL}/uploads/...`
 * - Localhost references: `http://localhost:5000/...` -> `${API_URL}/...`
 * - Online URLs: `https://...` -> unchanged
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Online / Absolute URLs
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      // Translate loopback hosts to the actual LAN device IP
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        const apiParsed = new URL(API_URL);
        parsed.protocol = apiParsed.protocol;
        parsed.hostname = apiParsed.hostname;
        parsed.port = apiParsed.port;
        return parsed.toString();
      }
    } catch {
      // Keep untouched if cannot parse
    }
    return trimmed;
  }

  // Relative local path stored in DB (e.g. /uploads/institutions/logos/...)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = API_URL.replace(/\/$/, '');
  return `${base}${cleanPath}`;
}
