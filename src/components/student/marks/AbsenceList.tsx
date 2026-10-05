import { Alert, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import type { StudentAttendanceRecord } from '@/lib/types/student';

interface AbsenceListProps {
  records: StudentAttendanceRecord[];
}

export function AbsenceList({ records }: AbsenceListProps) {
  const { colors, isDark } = useAppTheme();
  const absences = records.filter((record) => record.status === 'absent' || record.status === 'excused');

  if (absences.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View
          style={{
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Ionicons name="checkmark-done" size={24} color="#10B981" />
          </View>
          <AppText variant="subheading" weight="bold">
            Zero Unexcused Absences
          </AppText>
          <AppText variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 4 }}>
            Great attendance record! Unexcused absences and excuse requests will show here.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <AppText variant="subheading" weight="bold">
          Absence Log ({absences.length})
        </AppText>
        <AppText variant="caption" tone="muted">
          Tap to request excuse
        </AppText>
      </View>

      <View style={{ gap: 10 }}>
        {absences.map((record) => {
          const isAbsent = record.status === 'absent';
          return (
            <TouchableOpacity
              key={record.id}
              accessibilityRole="button"
              accessibilityLabel={`${record.course_name} absence`}
              onPress={() => {
                if (!isAbsent) return;
                haptics.light();
                Alert.alert('Request excuse', `Submit an official excuse for ${record.course_name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Submit excuse',
                    onPress: () => {
                      haptics.success();
                      Alert.alert('Excuse submitted', 'Your request has been sent to the institution administrator.');
                    },
                  },
                ]);
              }}
              activeOpacity={0.8}
              style={{
                borderRadius: 18,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: isAbsent ? 'rgba(244, 63, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={isAbsent ? 'close-circle' : 'document-text'}
                    size={20}
                    color={isAbsent ? '#F43F5E' : '#38BDF8'}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="bold" numberOfLines={1}>
                    {record.course_name}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {new Date(record.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                    {record.time ? ` · ${record.time}` : ''}
                  </AppText>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: isAbsent ? 'rgba(244, 63, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                  }}
                >
                  <AppText
                    variant="caption"
                    weight="bold"
                    style={{ color: isAbsent ? '#F43F5E' : '#38BDF8', textTransform: 'capitalize' }}
                  >
                    {record.status}
                  </AppText>
                </View>

                {record.penalty ? (
                  <AppText variant="caption" weight="semibold" style={{ color: '#F43F5E' }}>
                    -{record.penalty} pts
                  </AppText>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
