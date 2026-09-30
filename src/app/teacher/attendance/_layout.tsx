import { Stack } from 'expo-router';

/** Attendance opened from a teacher workspace stays outside student tabs. */
export default function TeacherAttendanceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
