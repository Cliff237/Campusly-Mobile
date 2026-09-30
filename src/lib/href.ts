import type { Href } from 'expo-router';

/** Expo typed routes lag behind new (student) files; keep a single cast site. */
export function href(path: string): Href {
  return path as Href;
}
