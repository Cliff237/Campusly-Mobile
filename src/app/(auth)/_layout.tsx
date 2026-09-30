// src/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});