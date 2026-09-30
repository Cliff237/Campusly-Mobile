export interface ActiveAttendanceSession {
  session_id: string;
  class_id: string;
  course_name: string;
  course_code?: string;
  started_at: string;
  ends_at?: string;
  remaining_seconds?: number;
  penalty_label?: string;
  is_checked_in: boolean;
  session_code?: string;
}

export interface StartAttendancePayload {
  class_id: string;
  session_date: string;
  period?: string;
}

export interface StartAttendanceResult {
  session_id: string;
  session_code: string;
  expires_at: string;
}

export interface AttendanceRosterStudent {
  membership_id: string;
  full_name: string;
  status: 'unmarked' | 'present' | 'absent' | 'suspicious';
}

export interface AttendanceSessionSummary {
  id: string;
  session_date: string;
  period?: string | null;
  status: string;
  pdf_url?: string | null;
}

export interface CloseAttendanceResult {
  session_id: string;
  status: 'closed';
  total_present: number;
  total_absent: number;
  pdf_url?: string;
  report?: Array<{ student: string; status: string; absence_count: number; marks_reduced: number }>;
}

export interface BleCheckinPayload {
  session_id: string;
  device_identifier: string;
  signal_strength?: number;
  timestamp?: string;
}

export interface BleCheckinResult {
  status: string;
  checkin_time: string;
  suspicious: boolean;
}

export type SessionDurationOption = 5 | 10 | 15 | 'custom';
export type PenaltyOption = 0.25 | 0.5 | 1 | 1.5 | 1.75 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 0;

export interface AttendanceConfigForm {
  class_id: string;
  duration_minutes: number;
  penalty: PenaltyOption;
  ble_enabled: boolean;
  manual_override: boolean;
  late_after_minutes: number;
}
