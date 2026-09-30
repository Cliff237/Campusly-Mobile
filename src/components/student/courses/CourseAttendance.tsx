import { View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { ActiveSessionBanner } from '@/components/student/schedule/ActiveSessionBanner';
import { AttendanceHistory } from '@/components/student/schedule/AttendanceHistory';
import type { ActiveAttendanceSession } from '@/lib/types/attendance';
import type { StudentAttendanceRecord } from '@/lib/types/student';

interface CourseAttendanceProps {
  session: ActiveAttendanceSession | null;
  records: StudentAttendanceRecord[];
  onMarkPresent: () => void;
}

export function CourseAttendance({ session, records, onMarkPresent }: CourseAttendanceProps) {
  return (
    <View className="flex-1">
      {session ? <ActiveSessionBanner session={session} onMarkPresent={onMarkPresent} /> : null}
      {records.length === 0 && !session ? (
        <EmptyStateAnimation
          icon="checkmark-circle-outline"
          title="No attendance yet"
          subtitle="Your presence history for this class will appear here"
        />
      ) : (
        <AttendanceHistory records={records} />
      )}
    </View>
  );
}
