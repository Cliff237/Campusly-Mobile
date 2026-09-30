import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { WeekSelector } from '@/components/student/schedule/WeekSelector';
import { DayTimeline } from '@/components/student/schedule/DayTimeline';
import { AttendanceHistory } from '@/components/student/schedule/AttendanceHistory';
import { ActiveSessionBanner } from '@/components/student/schedule/ActiveSessionBanner';
import { ThemedText } from '@/ui/ThemedText';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { fetchActiveAttendanceSessions } from '@/lib/api/attendance';
import { fetchStudentDashboard } from '@/lib/api/student';
import { useBLE } from '@/hooks/useBLE';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';
import type { StudentAttendanceRecord } from '@/lib/types/student';
import type { TimelineEvent } from '@/components/student/schedule/DayTimeline';
import type { ActiveAttendanceSession } from '@/lib/types/attendance';

export default function ScheduleScreen() {
  const [selected, setSelected] = useState(new Date());
  const { accessToken, currentMembership } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveAttendanceSession[]>([]);
  const [checkinStates, setCheckinStates] = useState<Record<string, { state: 'idle' | 'permission' | 'searching' | 'verifying' | 'not-found' | 'success' | 'expired' | 'error'; message?: string }>>({});
  const { markPresent, prepareBluetooth, scanForAttendance } = useBLE();
  const scanCleanup = useRef<(() => void) | null>(null);
  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || !currentMembership) return;
    setRefreshing(isRefresh);
    try {
      const [dashboard, active] = await Promise.all([
        fetchStudentDashboard(currentMembership.institution_id, accessToken),
        fetchActiveAttendanceSessions(currentMembership.institution_id, accessToken),
      ]);
      setEvents(dashboard.schedule);
      setRecords(dashboard.attendance);
      setActiveSessions(active);
    } catch (error) {
      showToast.error('Schedule', error instanceof Error ? error.message : 'Could not load schedule');
    } finally { setRefreshing(false); }
  }, [accessToken, currentMembership]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  useEffect(() => () => { scanCleanup.current?.(); }, []);
  useEffect(() => {
    if (!activeSessions.length) return;
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [activeSessions.length, load]);
  const setCheckinState = (sessionId: string, state: 'idle' | 'permission' | 'searching' | 'verifying' | 'not-found' | 'success' | 'expired' | 'error', message?: string) => {
    setCheckinStates((all) => ({ ...all, [sessionId]: { state, message } }));
  };
  const markSessionPresent = async (session: ActiveAttendanceSession) => {
    if (session.remaining_seconds !== undefined && session.remaining_seconds <= 0) {
      setCheckinState(session.session_id, 'expired');
      return;
    }
    scanCleanup.current?.();
    scanCleanup.current = null;
    try {
      setCheckinState(session.session_id, 'permission');
      await prepareBluetooth();
      setCheckinState(session.session_id, 'searching');
      let completed = false;
      let cleanup: (() => void) | null = null;
      const finish = async (signalStrength?: number) => {
        if (completed) return;
        completed = true;
        cleanup?.();
        if (scanCleanup.current === cleanup) scanCleanup.current = null;
        setCheckinState(session.session_id, 'verifying');
        try {
          await markPresent(session.session_id, signalStrength);
          setActiveSessions((sessions) => sessions.map((item) => item.session_id === session.session_id ? { ...item, is_checked_in: true } : item));
          setCheckinState(session.session_id, 'success');
          showToast.success('Attendance confirmed', `${session.course_name}: you are marked present.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not verify your attendance';
          setCheckinState(session.session_id, /not active|expired|ended/i.test(message) ? 'expired' : 'error', message);
        }
      };
      cleanup = await scanForAttendance((device) => {
        const candidate = device as { rssi?: number; RSSI?: number };
        void finish(candidate.rssi ?? candidate.RSSI);
      });
      scanCleanup.current = cleanup;
      setTimeout(() => {
        if (completed) return;
        completed = true;
        cleanup?.();
        if (scanCleanup.current === cleanup) scanCleanup.current = null;
        setCheckinState(session.session_id, 'not-found');
      }, 12000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bluetooth is required to verify your attendance';
      setCheckinState(session.session_id, 'permission', message);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg dark:bg-bg-dark"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#4f46e5" />}
    >
      <WeekSelector selected={selected} onSelect={setSelected} />
      <DayTimeline events={events} />
      {activeSessions.map((session) => <ActiveSessionBanner key={session.session_id} session={session} onMarkPresent={() => void markSessionPresent(session)} {...checkinStates[session.session_id]} />)}
      <PermissionGate permission="view_attendance_history">
        <ThemedText variant="subheading" className="px-5 mb-2">Attendance history</ThemedText>
        <AttendanceHistory records={records} />
      </PermissionGate>
    </ScrollView>
  );
}
