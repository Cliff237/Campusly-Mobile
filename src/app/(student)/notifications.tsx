import { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { BrandMark } from '@/ui/brand/BrandMark';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { relativeTime } from '@/lib/format';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import type { StudentNotification, StudentNotificationType } from '@/lib/types/student';

const FILTERS = [
  { value: 'all', label: 'All Alerts' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'post', label: 'Posts' },
  { value: 'grade', label: 'Grades' },
  { value: 'system', label: 'System' },
] as const;

const TYPE_META: Record<
  StudentNotificationType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  attendance: { icon: 'radio', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  post: { icon: 'newspaper-outline', color: '#5B3FD1', bg: 'rgba(91, 63, 209, 0.12)' },
  assignment: { icon: 'time-outline', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  grade: { icon: 'trophy-outline', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  system: { icon: 'notifications-outline', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
};

export default function StudentNotificationsScreen() {
  const { colors } = useAppTheme();
  const bottomOffset = useBottomTabOffset(28);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [items, setItems] = useState<StudentNotification[]>([]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return items;
    return items.filter((item) => item.type === selectedFilter);
  }, [items, selectedFilter]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomOffset, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title & Brand Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="display" weight="extrabold">
              Alerts
            </AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
              Campus alerts, live attendance & grade notices
            </AppText>
          </View>
          <BrandMark size={40} variant="solid" />
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 16 }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={selectedFilter === f.value}
            onPress={() => {
              haptics.light();
              setSelectedFilter(f.value);
            }}
          />
        ))}
      </ScrollView>

      {/* Notifications List */}
      {filteredItems.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            message="Attendance check-ins, campus broadcasts, and grade alerts will land here."
          />
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {filteredItems.map((item) => {
            const meta = TYPE_META[item.type] || TYPE_META.system;
            const isAttendance = item.type === 'attendance';

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  gap: 14,
                  alignItems: 'flex-start',
                  elevation: 2,
                  shadowColor: '#1B1730',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                }}
              >
                {/* Logo Icon Badge */}
                {isAttendance ? (
                  <View style={{ position: 'relative' }}>
                    <BrandMark size={42} variant="solid" />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: '#10B981',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: colors.surface,
                      }}
                    >
                      <Ionicons name="radio" size={9} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: meta.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="label" weight="extrabold" numberOfLines={1} style={{ flex: 1 }}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={{ fontSize: 11, marginLeft: 8 }}>
                      {relativeTime(item.created_at)}
                    </AppText>
                  </View>

                  <AppText variant="body" tone="secondary" style={{ marginTop: 4, lineHeight: 20 }}>
                    {item.body}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
