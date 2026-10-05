import { useEffect, useRef } from 'react';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

export const ATTENDANCE_SERVICE_UUID = '7f3a0001-7a4f-4a2d-9b7e-6d8a1f2c3b4d';

/**
 * Request Bluetooth permissions for Android 12+ and older versions
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS handles permissions via Info.plist
    return true;
  }

  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      // Android 12+ (API 31+) - scanning permissions
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Permission Required',
          'Bluetooth permissions are required for attendance. Please grant them in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
    } else {
      // Android 11 and below
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Permission Required',
          'Location permission is required for Bluetooth scanning. Please grant it in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
    }
  }

  return true;
}

/**
 * Request Bluetooth advertising permissions (for beacon broadcasting)
 */
export async function requestBluetoothAdvertisingPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS handles permissions via Info.plist
    return true;
  }

  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      // Android 12+ (API 31+) - advertising permissions
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Permission Required',
          'Bluetooth advertising permission is required for beacon broadcasting. Please grant it in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
    } else {
      // Android 11 and below - advertising doesn't require special permissions
      return true;
    }
  }

  return true;
}

let sharedBleManager: BleManager | null = null;
function getSharedBleManager(): BleManager {
  if (!sharedBleManager) {
    sharedBleManager = new BleManager();
  }
  return sharedBleManager;
}

/**
 * Check if Bluetooth is powered on
 */
export async function isBluetoothEnabled(manager?: BleManager): Promise<boolean> {
  const m = manager ?? getSharedBleManager();
  const state = await m.state();
  return state === State.PoweredOn;
}

/**
 * Prompt user to enable Bluetooth if it's off
 */
export async function ensureBluetoothEnabled(manager?: BleManager): Promise<boolean> {
  const m = manager ?? getSharedBleManager();
  const state = await m.state();

  if (state === State.PoweredOn) {
    return true;
  }

  if (state === State.PoweredOff) {
    Alert.alert(
      'Bluetooth Required',
      'Please enable Bluetooth to continue with classroom attendance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            if (Platform.OS === 'android') {
              try {
                await Linking.sendIntent('android.bluetooth.adapter.action.REQUEST_ENABLE');
              } catch {
                await Linking.openSettings();
              }
            } else {
              await Linking.openURL('App-Prefs:Bluetooth');
            }
          },
        },
      ]
    );
    return false;
  }

  if (state === State.Unauthorized) {
    Alert.alert(
      'Bluetooth Unauthorized',
      'The app does not have permission to use Bluetooth. Please check your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  return false;
}

/**
 * BLE Scanner Hook
 * Handles BLE scanning with proper cleanup and error handling
 */
export interface UseBleScannerOptions {
  onDeviceFound?: (device: Device) => void;
  onError?: (error: Error) => void;
  serviceUuid?: string;
  scanDuration?: number; // in milliseconds, 0 for continuous scan
}

export interface UseBleScannerReturn {
  startScan: () => Promise<void>;
  stopScan: () => void;
  isScanning: boolean;
  bluetoothEnabled: boolean;
}

export function useBleScanner({
  onDeviceFound,
  onError,
  serviceUuid = ATTENDANCE_SERVICE_UUID,
  scanDuration = 10000, // Default 10 seconds
}: UseBleScannerOptions = {}): UseBleScannerReturn {
  const managerRef = useRef<BleManager | null>(null);
  const isScanningRef = useRef(false);
  const stopScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const bluetoothEnabledRef = useRef(false);

  // Initialize BleManager
  useEffect(() => {
    managerRef.current = new BleManager();

    // Listen to Bluetooth state changes
    const stateSubscription = managerRef.current.onStateChange((state) => {
      bluetoothEnabledRef.current = state === State.PoweredOn;
    }, true);

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
      stateSubscription.remove();
    };
  }, []);

  const stopScan = () => {
    if (isScanningRef.current && managerRef.current) {
      managerRef.current.stopDeviceScan();
      isScanningRef.current = false;
    }

    if (stopScanTimeoutRef.current) {
      clearTimeout(stopScanTimeoutRef.current);
      stopScanTimeoutRef.current = null;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
  };

  const startScan = async () => {
    if (!managerRef.current) {
      onError?.(new Error('BLE Manager not initialized'));
      return;
    }

    // Stop any existing scan
    stopScan();

    // Request permissions
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      onError?.(new Error('Bluetooth permissions not granted'));
      return;
    }

    // Ensure Bluetooth is enabled
    const isEnabled = await ensureBluetoothEnabled(managerRef.current);
    if (!isEnabled) {
      onError?.(new Error('Bluetooth is not enabled'));
      return;
    }

    bluetoothEnabledRef.current = true;

    try {
      isScanningRef.current = true;

      managerRef.current.startDeviceScan(
        [serviceUuid],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('[BleScanner] Scan error:', error);
            stopScan();
            onError?.(error);
            return;
          }

          if (device) {
            console.log('[BleScanner] Device found:', device.id, device.name);
            onDeviceFound?.(device);
          }
        }
      );

      // Auto-stop after scanDuration (if not 0)
      if (scanDuration > 0) {
        stopScanTimeoutRef.current = setTimeout(() => {
          console.log('[BleScanner] Scan duration elapsed, stopping scan');
          stopScan();
        }, scanDuration);
      }
    } catch (error) {
      console.error('[BleScanner] Failed to start scan:', error);
      stopScan();
      onError?.(error instanceof Error ? error : new Error('Failed to start BLE scan'));
    }
  };

  return {
    startScan,
    stopScan,
    isScanning: isScanningRef.current,
    bluetoothEnabled: bluetoothEnabledRef.current,
  };
}

/**
 * BLE Service Class (Alternative to hook for non-React contexts)
 */
export class BleScannerService {
  private manager: BleManager;
  private isScanning = false;
  private stopScanTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscription: (() => void) | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Request Bluetooth permissions
   */
  async requestPermissions(): Promise<boolean> {
    return requestBluetoothPermissions();
  }

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    return isBluetoothEnabled(this.manager);
  }

  /**
   * Ensure Bluetooth is enabled
   */
  async ensureBluetoothEnabled(): Promise<boolean> {
    return ensureBluetoothEnabled(this.manager);
  }

  /**
   * Start scanning for devices
   */
  async startScan(
    onDeviceFound: (device: Device) => void,
    onError?: (error: Error) => void,
    serviceUuid: string = ATTENDANCE_SERVICE_UUID,
    scanDuration: number = 10000
  ): Promise<void> {
    // Stop any existing scan
    this.stopScan();

    // Request permissions
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      onError?.(new Error('Bluetooth permissions not granted'));
      return;
    }

    // Ensure Bluetooth is enabled
    const isEnabled = await this.ensureBluetoothEnabled();
    if (!isEnabled) {
      onError?.(new Error('Bluetooth is not enabled'));
      return;
    }

    try {
      this.isScanning = true;

      this.manager.startDeviceScan(
        [serviceUuid],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('[BleScannerService] Scan error:', error);
            this.stopScan();
            onError?.(error);
            return;
          }

          if (device) {
            console.log('[BleScannerService] Device found:', device.id, device.name);
            onDeviceFound(device);
          }
        }
      );

      // Auto-stop after scanDuration (if not 0)
      if (scanDuration > 0) {
        this.stopScanTimeout = setTimeout(() => {
          console.log('[BleScannerService] Scan duration elapsed, stopping scan');
          this.stopScan();
        }, scanDuration);
      }
    } catch (error) {
      console.error('[BleScannerService] Failed to start scan:', error);
      this.stopScan();
      onError?.(error instanceof Error ? error : new Error('Failed to start BLE scan'));
    }
  }

  /**
   * Stop scanning
   */
  stopScan(): void {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
    }

    if (this.stopScanTimeout) {
      clearTimeout(this.stopScanTimeout);
      this.stopScanTimeout = null;
    }

    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopScan();
    this.manager.destroy();
  }
}
