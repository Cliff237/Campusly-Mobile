import { Stack } from 'expo-router';

export default function AttendanceStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="configure" />
      <Stack.Screen name="session" />
    </Stack>
  );
}
