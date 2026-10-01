import { Linking, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, type NativeModule } from 'react-native';
import * as BLEAdvertiser from 'react-native-ble-advertiser';

export const ATTENDANCE_SERVICE_UUID = '7f3a0001-7a4f-4a2d-9b7e-6d8a1f2c3b4d';
const BLE_COMPANY_ID = 0x0006;
const nativeModule = NativeModules.BLEAdvertiser as object | undefined;


function ensureNativeBle() {
  if (Platform.OS === 'web' || !nativeModule) throw new Error('Bluetooth attendance requires an EAS development build.');
}

export async function startAttendanceBeacon(sessionCode: string): Promise<void> {
  ensureNativeBle();
  BLEAdvertiser.setCompanyId(BLE_COMPANY_ID);
  await BLEAdvertiser.broadcast(
    ATTENDANCE_SERVICE_UUID,
    Array.from(sessionCode).map((character) => character.charCodeAt(0)),
    { connectable: false, includeDeviceName: false },
  );
}

export async function requestBluetoothAccess(): Promise<void> {
  ensureNativeBle();

  if (Platform.OS === 'android') {
    const permissions = Platform.Version >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    if (Object.values(results).some((result) => result !== PermissionsAndroid.RESULTS.GRANTED)) {
      throw new Error('Nearby devices permission is required for Bluetooth attendance.');
    }
  }

  const state = await BLEAdvertiser.getAdapterState();
  if (state === 'STATE_ON' || state === 'PoweredOn') return;
  if (Platform.OS === 'android') await Linking.sendIntent('android.bluetooth.adapter.action.REQUEST_ENABLE');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const updatedState = await BLEAdvertiser.getAdapterState();
    if (updatedState === 'STATE_ON' || updatedState === 'PoweredOn') return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Bluetooth must be turned on for attendance.');
}

export async function stopAttendanceBeacon(): Promise<void> {
  if (Platform.OS === 'web' || !nativeModule) return;
  await BLEAdvertiser.stopBroadcast();
}

export async function startAttendanceScan(onDeviceFound: (device: unknown) => void): Promise<() => void> {
  ensureNativeBle();
  
  try {
    const emitter = new NativeEventEmitter(nativeModule as NativeModule);
    const subscription = emitter.addListener('onDeviceFound', onDeviceFound);
    await BLEAdvertiser.scanByService(ATTENDANCE_SERVICE_UUID, {});
    return () => {
      subscription.remove();
      void BLEAdvertiser.stopScan();
    };
  } catch (error) {
    console.error('[nativeBle] Failed to start scan:', error);
    throw new Error('BLE scan failed. Please ensure Bluetooth is enabled and the app has the necessary permissions.');
  }
}

export async function stopAttendanceScan(): Promise<void> {
  if (Platform.OS === 'web' || !nativeModule) return;
  await BLEAdvertiser.stopScan();
}
