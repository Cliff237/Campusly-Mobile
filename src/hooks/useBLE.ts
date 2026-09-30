import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { checkInToSession } from '@/lib/api/attendance';
import { flushPendingCheckins, getDeviceIdentifier } from '@/lib/api/ble';
import { useAuth } from '@/lib/auth/AuthContext';
import { requestBluetoothAccess, startAttendanceBeacon, startAttendanceScan, stopAttendanceBeacon, stopAttendanceScan } from '@/lib/nativeBle';

export function useBLE() {
  const { accessToken } = useAuth();

  const flush = useCallback(async () => {
    if (!accessToken) return 0;
    return flushPendingCheckins(accessToken);
  }, [accessToken]);

  useEffect(() => {
    void flush();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });
    return () => sub.remove();
  }, [flush]);

  const markPresent = useCallback(
    async (sessionId: string, signalStrength?: number) => {
      if (!accessToken) throw new Error('Connect to the internet to verify your attendance.');
      const device_identifier = await getDeviceIdentifier();
      const payload = {
        session_id: sessionId,
        device_identifier,
        signal_strength: signalStrength,
        timestamp: new Date().toISOString(),
      };
      const result = await checkInToSession(payload, accessToken);
      return { queued: false as const, result };
    },
    [accessToken],
  );

  const prepareBluetooth = useCallback(() => requestBluetoothAccess(), []);
  const startBeacon = useCallback((sessionCode: string) => startAttendanceBeacon(sessionCode), []);
  const stopBeacon = useCallback(() => stopAttendanceBeacon(), []);
  const scanForAttendance = useCallback((onDeviceFound: (device: unknown) => void) => startAttendanceScan(onDeviceFound), []);
  const stopScan = useCallback(() => stopAttendanceScan(), []);

  return { markPresent, flush, prepareBluetooth, startBeacon, stopBeacon, scanForAttendance, stopScan };
}
