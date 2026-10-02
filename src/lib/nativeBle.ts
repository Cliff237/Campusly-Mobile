import { Linking, Platform, NativeModules, type NativeModule } from 'react-native';
import * as BLEAdvertiser from 'react-native-ble-advertiser';

export const ATTENDANCE_SERVICE_UUID = '7f3a0001-7a4f-4a2d-9b7e-6d8a1f2c3b4d';
const BLE_COMPANY_ID = 0x0006;

function getNativeModule() {
  return NativeModules.BLEAdvertiser as object | undefined;
}

function ensureNativeBle() {
  const nativeModule = getNativeModule();
  if (Platform.OS === 'web' || !nativeModule) throw new Error('Bluetooth beacon broadcasting requires an EAS development build.');
}

/**
 * Start broadcasting attendance beacon (for teachers)
 * NOTE: This uses react-native-ble-advertiser for broadcasting.
 * For scanning, use bleScanner.ts with react-native-ble-plx.
 */
export async function startAttendanceBeacon(sessionCode: string): Promise<void> {
  ensureNativeBle();
  BLEAdvertiser.setCompanyId(BLE_COMPANY_ID);
  await BLEAdvertiser.broadcast(
    ATTENDANCE_SERVICE_UUID,
    Array.from(sessionCode).map((character) => character.charCodeAt(0)),
    { connectable: false, includeDeviceName: false },
  );
}

/**
 * Stop broadcasting attendance beacon
 */
export async function stopAttendanceBeacon(): Promise<void> {
  const nativeModule = getNativeModule();
  if (Platform.OS === 'web' || !nativeModule) return;
  await BLEAdvertiser.stopBroadcast();
}
