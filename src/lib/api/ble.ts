import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkInToSession } from '@/lib/api/attendance';
import type { BleCheckinPayload } from '@/lib/types/attendance';

const DEVICE_KEY = 'campusly_device_identifier';
const QUEUE_KEY = 'campusly_pending_checkins';

function createIdentifier(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function getDeviceIdentifier(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const next = createIdentifier();
  await AsyncStorage.setItem(DEVICE_KEY, next);
  return next;
}

export async function queueCheckin(payload: BleCheckinPayload): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queued: BleCheckinPayload[] = raw ? (JSON.parse(raw) as BleCheckinPayload[]) : [];
  queued.push(payload);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queued));
}

export async function flushPendingCheckins(accessToken: string): Promise<number> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return 0;
  const queued: BleCheckinPayload[] = JSON.parse(raw) as BleCheckinPayload[];
  if (queued.length === 0) return 0;

  const remaining: BleCheckinPayload[] = [];
  let synced = 0;
  for (const item of queued) {
    try {
      await checkInToSession(item, accessToken);
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return synced;
}
