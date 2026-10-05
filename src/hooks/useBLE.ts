import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { checkInToSession } from '@/lib/api/attendance';
import { flushPendingCheckins, getDeviceIdentifier } from '@/lib/api/ble';
import { useAuth } from '@/lib/auth/AuthContext';
import { requestBluetoothPermissions, requestBluetoothAdvertisingPermissions, ensureBluetoothEnabled, BleScannerService, ATTENDANCE_SERVICE_UUID } from '@/lib/bleScanner';
import { startAttendanceBeacon, stopAttendanceBeacon } from '@/lib/nativeBle';

export function useBLE() {
  const { accessToken } = useAuth();
  const bleScannerServiceRef = useRef<BleScannerService | null>(null);

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

  const prepareBluetooth = useCallback(async () => {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions are required to verify attendance.');
    }
    const isEnabled = await ensureBluetoothEnabled();
    if (!isEnabled) {
      throw new Error('Bluetooth is turned off. Please turn on Bluetooth to verify attendance.');
    }
  }, []);

  const prepareBluetoothForAdvertising = useCallback(async () => {
    const hasPermissions = await requestBluetoothAdvertisingPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth advertising permissions are required to start the attendance session.');
    }
    const isEnabled = await ensureBluetoothEnabled();
    if (!isEnabled) {
      throw new Error('Bluetooth is turned off. Please enable Bluetooth on your device to broadcast the attendance session.');
    }
  }, []);

  const startBeacon = useCallback((sessionCode: string) => {
    if (Platform.OS === 'web') {
      console.warn('[useBLE] Beacon broadcasting is not supported on web');
      return Promise.resolve();
    }
    return startAttendanceBeacon(sessionCode);
  }, []);

  const stopBeacon = useCallback(() => {
    if (Platform.OS === 'web') {
      console.warn('[useBLE] Beacon broadcasting is not supported on web');
      return Promise.resolve();
    }
    return stopAttendanceBeacon();
  }, []);

  const scanForAttendance = useCallback(
    (onDeviceFound: (device: Device) => void): Promise<() => void> => {
      return new Promise((resolve, reject) => {
        if (!bleScannerServiceRef.current) {
          bleScannerServiceRef.current = new BleScannerService();
        }

        const service = bleScannerServiceRef.current;

        service.startScan(
          onDeviceFound,
          (error) => reject(error),
          ATTENDANCE_SERVICE_UUID,
          12000 // 12 seconds scan
        ).then(() => {
          resolve(() => service.stopScan());
        }).catch(reject);
      });
    },
    []
  );

  const stopScan = useCallback(() => {
    bleScannerServiceRef.current?.stopScan();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bleScannerServiceRef.current?.destroy();
    };
  }, []);

  return { markPresent, flush, prepareBluetooth, prepareBluetoothForAdvertising, startBeacon, stopBeacon, scanForAttendance, stopScan };
}
