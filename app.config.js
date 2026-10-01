import fs from 'fs';
import path from 'path';

// Decode google-services.json automatically during build if present in environment
if (process.env.GOOGLE_SERVICES_JSON_BASE64) {
  fs.writeFileSync(
    path.join(__dirname, 'google-services.json'),
    Buffer.from(process.env.GOOGLE_SERVICES_JSON_BASE64, 'base64')
  );
}

export default {
  expo: {
    name: "campusly-mobile",
    owner: "cliff123",
    slug: "campusly-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "campuslymobile",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
      infoPlist: {
        NSBluetoothAlwaysUsageDescription: "Campusly uses Bluetooth to announce and detect nearby attendance sessions.",
        NSBluetoothPeripheralUsageDescription: "Campusly uses Bluetooth to announce nearby attendance sessions."
      }
    },
    android: {
      permissions: [
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.POST_NOTIFICATIONS"
      ],
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services.json",
      package: "com.cliff237.campuslymobile"
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76
        }
      ],
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Campusly to attach photos to your posts."
        }
      ],
      "expo-video",
      "@react-native-community/datetimepicker",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#208AEF",
          sounds: []
        }
      ],
      "@react-native-firebase/app",
      "expo-image",
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "04c2c085-1d53-4135-bb58-238136c1fdef"
      }
    },
    runtimeVersion: {
      policy: "appVersion"
    }
  }
};