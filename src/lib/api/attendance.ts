import { apiRequest } from '@/lib/client';
import type {
  BleCheckinPayload,
  BleCheckinResult,
  StartAttendancePayload,
  StartAttendanceResult,
  AttendanceRosterStudent,
  CloseAttendanceResult,
  AttendanceSessionSummary,
  ActiveAttendanceSession,
} from '@/lib/types/attendance';

export async function fetchActiveAttendanceSessions(institutionId: string, accessToken: string): Promise<ActiveAttendanceSession[]> {
  return apiRequest<ActiveAttendanceSession[]>(`/student/attendance/active?institution_id=${encodeURIComponent(institutionId)}`, {}, accessToken);
}

export async function startAttendanceSession(
  payload: StartAttendancePayload,
  accessToken: string,
): Promise<StartAttendanceResult> {
  console.log('[Attendance] Starting session', { classId: payload.class_id, sessionDate: payload.session_date, period: payload.period });
  const result = await apiRequest<StartAttendanceResult>(
    '/teacher/attendance/sessions',
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
  console.log('[Attendance] Session created', { sessionId: result.session_id, expiresAt: result.expires_at });
  return result;
}

export async function fetchAttendanceRoster(classId: string, accessToken: string): Promise<AttendanceRosterStudent[]> {
  console.log('[Attendance] Loading class roster', { classId });
  return apiRequest<AttendanceRosterStudent[]>(`/teacher/classes/${classId}/roster`, {}, accessToken);
}

export async function fetchAttendanceSessions(classId: string, accessToken: string): Promise<AttendanceSessionSummary[]> {
  return apiRequest<AttendanceSessionSummary[]>(`/teacher/classes/${classId}/attendance/sessions`, {}, accessToken);
}

export async function deleteAttendanceSession(sessionId: string, accessToken: string): Promise<{ session_id: string; deleted: true }> {
  return apiRequest(`/teacher/attendance/sessions/${sessionId}`, { method: 'DELETE' }, accessToken);
}

export interface AttendanceRecordSummary {
  membership_id: string;
  student: string;
  status: 'present' | 'absent' | 'suspicious';
  checkin_time?: string | null;
}

export async function fetchAttendanceRecords(sessionId: string, accessToken: string): Promise<AttendanceRecordSummary[]> {
  return apiRequest<AttendanceRecordSummary[]>(`/teacher/attendance/sessions/${sessionId}/records`, {}, accessToken);
}

export async function closeAttendanceSession(sessionId: string, accessToken: string): Promise<CloseAttendanceResult> {
  console.log('[Attendance] Closing session', { sessionId });
  const result = await apiRequest<CloseAttendanceResult>(`/teacher/attendance/sessions/${sessionId}/close`, { method: 'PATCH' }, accessToken);
  console.log('[Attendance] Session closed', result);
  return result;
}

export async function checkInToSession(
  payload: BleCheckinPayload,
  accessToken: string,
): Promise<BleCheckinResult> {
  return apiRequest<BleCheckinResult>(
    '/attendance/checkin',
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
}

export async function manualMarkAttendance(
  sessionId: string,
  studentMembershipId: string,
  status: 'present' | 'absent',
  accessToken: string,
): Promise<{ membership_id: string; status: string }> {
  console.log('[Attendance] Manual mark', { sessionId, studentMembershipId, status });
  return apiRequest(
    `/teacher/attendance/sessions/${sessionId}/records/${studentMembershipId}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    accessToken,
  );
}
