import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';

import { href } from '@/lib/href';

export default function StudentInstitutionRedirect() {
  const { currentMembership, selectedInstitutionId } = useAuth();
  const { colors } = useAppTheme();
  const institutionId = currentMembership?.institution_id || selectedInstitutionId;

  if (institutionId) {
    return <Redirect href={href(`/institution/${institutionId}`)} />;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}
