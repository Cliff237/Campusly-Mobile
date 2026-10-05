import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WeekSelector } from '@/components/student/schedule/WeekSelector';
import { DayTimeline } from '@/components/student/schedule/DayTimeline';
import { AttendanceHistory } from '@/components/student/schedule/AttendanceHistory';
import { ActiveSessionBanner } from '@/components/student/schedule/ActiveSessionBanner';
import { AttendanceCheckinModal } from '@/components/student/schedule/AttendanceCheckinModal';
import { ThemedText } from '@/ui/ThemedText';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { fetchActiveAttendanceSessions } from '@/lib/api/attendance';
import { fetchStudentDashboard } from '@/lib/api/student';
import { useBLE } from '@/hooks/useBLE';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import type { StudentAttendanceRecord } from '@/lib/types/student';
import type { TimelineEvent } from '@/components/student/schedule/DayTimeline';
import type { ActiveAttendanceSession } from '@/lib/types/attendance';

export default function ScheduleScreen() {
  const { sessionId: urlSessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState(new Date());
  const { accessToken, currentMembership } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveAttendanceSession[]>([]);
  const [checkinStates, setCheckinStates] = useState<Record<string, { state: 'idle' | 'permission' | 'searching' | 'verifying' | 'not-found' | 'success' | 'expired' | 'error'; message?: string }>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSession, setModalSession] = useState<ActiveAttendanceSession | null>(null);
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
    const task = setTimeout(() => void load(Boolean(urlSessionId)), 0);
    return () => clearTimeout(task);
  }, [load, urlSessionId]);
  useEffect(() => () => { scanCleanup.current?.(); }, []);
  useEffect(() => {
    if (!activeSessions.length) return;
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [activeSessions.length, load]);

  // Auto-trigger BLE check-in when sessionId is passed via notification
  useEffect(() => {
    if (urlSessionId && activeSessions.length > 0) {
      const session = activeSessions.find(s => s.session_id === urlSessionId);
      if (session) {
        if (!session.is_checked_in) {
          console.log('[Schedule] Auto-opening check-in modal for session:', urlSessionId);
          openCheckinModal(session);
        }
        // Clear the URL param to prevent re-triggering
        router.setParams({ sessionId: undefined });
      }
    }
  }, [urlSessionId, activeSessions, router]);
  const setCheckinState = (sessionId: string, state: 'idle' | 'permission' | 'searching' | 'verifying' | 'not-found' | 'success' | 'expired' | 'error', message?: string) => {
    setCheckinStates((all) => ({ ...all, [sessionId]: { state, message } }));
  };
  const markSessionPresent = async (session: ActiveAttendanceSession, manual = false) => {
    console.log('[Schedule] markSessionPresent called for session:', session.session_id, 'manual:', manual);
    
    if (session.remaining_seconds !== undefined && session.remaining_seconds <= 0) {
      console.log('[Schedule] Session expired');
      setCheckinState(session.session_id, 'expired');
      return;
    }
    
    // Manual check-in - skip BLE and directly call API
    if (manual) {
      console.log('[Schedule] Manual check-in - skipping BLE');
      setCheckinState(session.session_id, 'verifying');
      try {
        await markPresent(session.session_id, undefined);
        setActiveSessions((sessions) => sessions.map((item) => item.session_id === session.session_id ? { ...item, is_checked_in: true } : item));
        setCheckinState(session.session_id, 'success');
        showToast.success('Attendance confirmed', `${session.course_name}: you are marked present.`);
      } catch (error) {
        console.error('[Schedule] Manual check-in failed:', error);
        const message = error instanceof Error ? error.message : 'Could not verify your attendance';
        setCheckinState(session.session_id, /not active|expired|ended/i.test(message) ? 'expired' : 'error', message);
      }
      return;
    }
    
    // BLE check-in
    console.log('[Schedule] Stopping any existing scan');
    scanCleanup.current?.();
    scanCleanup.current = null;
    
    try {
      console.log('[Schedule] Requesting Bluetooth permission');
      setCheckinState(session.session_id, 'permission');
      await prepareBluetooth();
      
      console.log('[Schedule] Starting BLE scan');
      setCheckinState(session.session_id, 'searching');
      let completed = false;
      let cleanup: (() => void) | null = null;
      
      const finish = async (signalStrength?: number) => {
        if (completed) return;
        completed = true;
        console.log('[Schedule] Device found, finishing check-in with signal strength:', signalStrength);
        cleanup?.();
        if (scanCleanup.current === cleanup) scanCleanup.current = null;
        setCheckinState(session.session_id, 'verifying');
        try {
          console.log('[Schedule] Calling markPresent API');
          await markPresent(session.session_id, signalStrength);
          setActiveSessions((sessions) => sessions.map((item) => item.session_id === session.session_id ? { ...item, is_checked_in: true } : item));
          setCheckinState(session.session_id, 'success');
          showToast.success('Attendance confirmed', `${session.course_name}: you are marked present.`);
        } catch (error) {
          console.error('[Schedule] markPresent API failed:', error);
          const message = error instanceof Error ? error.message : 'Could not verify your attendance';
          setCheckinState(session.session_id, /not active|expired|ended/i.test(message) ? 'expired' : 'error', message);
        }
      };
      
      console.log('[Schedule] Starting scanForAttendance');
      cleanup = await scanForAttendance((device) => {
        console.log('[Schedule] Device detected in scan');
        void finish(device.rssi ?? undefined);
      });
      scanCleanup.current = cleanup;
      
      setTimeout(() => {
        if (completed) return;
        completed = true;
        console.log('[Schedule] Scan timeout - no device found');
        cleanup?.();
        if (scanCleanup.current === cleanup) scanCleanup.current = null;
        setCheckinState(session.session_id, 'not-found');
      }, 12000);
    } catch (error) {
      console.error('[Schedule] markSessionPresent error:', error);
      const message = error instanceof Error ? error.message : 'Bluetooth is required to verify your attendance';
      setCheckinState(session.session_id, 'error', message);
    }
  };

  const openCheckinModal = (session: ActiveAttendanceSession) => {
    setModalSession(session);
    setModalVisible(true);
    setCheckinState(session.session_id, 'idle');
  };

  const handleModalCheckIn = async (session: ActiveAttendanceSession) => {
    console.log('[Schedule] Modal check-in requested for session:', session.session_id);
    await markSessionPresent(session, false);
  };

  const bottomOffset = useBottomTabOffset(36);

  const handleManualCheckIn = async (session: ActiveAttendanceSession) => {
    console.log('[Schedule] Manual check-in requested for session:', session.session_id);
    await markSessionPresent(session, true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalSession(null);
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-bg dark:bg-bg-dark"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomOffset, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#4f46e5" />}
      >
        <WeekSelector selected={selected} onSelect={setSelected} />
        <DayTimeline events={events} />
        {activeSessions.map((session) => (
          <ActiveSessionBanner 
            key={session.session_id} 
            session={session} 
            onMarkPresent={() => openCheckinModal(session)} 
            {...checkinStates[session.session_id]} 
          />
        ))}
        <PermissionGate permission="view_attendance_history">
          <ThemedText variant="subheading" className="px-5 mb-2">Attendance history</ThemedText>
          <AttendanceHistory records={records} />
        </PermissionGate>
      </ScrollView>
      
      <AttendanceCheckinModal
        visible={modalVisible}
        session={modalSession}
        onClose={closeModal}
        onCheckIn={handleModalCheckIn}
        onManualCheckIn={handleManualCheckIn}
        state={modalSession ? checkinStates[modalSession.session_id]?.state : 'idle'}
        message={modalSession ? checkinStates[modalSession.session_id]?.message : undefined}
      />
    </>
  );
}
