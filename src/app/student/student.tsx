import { Redirect } from 'expo-router';
import { href } from '@/lib/href';

export default function LegacyStudentScreen() {
  return <Redirect href={href('/(student)/home')} />;
}
