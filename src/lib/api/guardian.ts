import { apiRequest } from '@/lib/client';
import type {
  AchievementBadge,
  CourseGradeCardData,
  StudentAttendanceRecord,
  StudentCourse,
  StudentStats,
} from '@/lib/types/student';
import type { StudentDashboard } from '@/lib/api/student';

export interface LinkedStudent {
  membership_id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  enrolled_courses_count: number;
  classes: {
    class_id: string;
    course_name: string;
    course_code: string;
    section?: string;
  }[];
}

export interface GuardianDashboardData {
  has_linked_student: boolean;
  student: LinkedStudent | null;
  linked_students: LinkedStudent[];
  dashboard: StudentDashboard | null;
  active_sessions: {
    session_id: string;
    class_id: string;
    course_name: string;
    course_code: string;
    session_code: string;
    started_at: string;
    ends_at: string;
    remaining_seconds: number;
    is_checked_in: boolean;
  }[];
  message?: string;
}

export interface GuardianAttendanceData {
  student: LinkedStudent | null;
  linked_students: LinkedStudent[];
  stats: {
    total: number;
    present: number;
    absent: number;
    attendance_percent: number;
  };
  attendance: StudentAttendanceRecord[];
  courses: StudentCourse[];
}

export interface GuardianPerformanceData {
  student: LinkedStudent | null;
  linked_students: LinkedStudent[];
  grades: (CourseGradeCardData & { course_id: string })[];
  stats: StudentStats;
  badges: AchievementBadge[];
}

export async function fetchGuardianStudents(
  institutionId: string,
  accessToken: string,
): Promise<LinkedStudent[]> {
  return apiRequest<LinkedStudent[]>(
    `/guardian/students?institution_id=${encodeURIComponent(institutionId)}`,
    {},
    accessToken,
  );
}

export async function fetchGuardianDashboard(
  institutionId: string,
  accessToken: string,
  studentMembershipId?: string,
): Promise<GuardianDashboardData> {
  let url = `/guardian/dashboard?institution_id=${encodeURIComponent(institutionId)}`;
  if (studentMembershipId) {
    url += `&student_membership_id=${encodeURIComponent(studentMembershipId)}`;
  }
  return apiRequest<GuardianDashboardData>(url, {}, accessToken);
}

export async function fetchGuardianAttendance(
  institutionId: string,
  accessToken: string,
  studentMembershipId?: string,
): Promise<GuardianAttendanceData> {
  let url = `/guardian/attendance?institution_id=${encodeURIComponent(institutionId)}`;
  if (studentMembershipId) {
    url += `&student_membership_id=${encodeURIComponent(studentMembershipId)}`;
  }
  return apiRequest<GuardianAttendanceData>(url, {}, accessToken);
}

export async function fetchGuardianPerformance(
  institutionId: string,
  accessToken: string,
  studentMembershipId?: string,
): Promise<GuardianPerformanceData> {
  let url = `/guardian/performance?institution_id=${encodeURIComponent(institutionId)}`;
  if (studentMembershipId) {
    url += `&student_membership_id=${encodeURIComponent(studentMembershipId)}`;
  }
  return apiRequest<GuardianPerformanceData>(url, {}, accessToken);
}

export async function createGuardianReportCard(
  institutionId: string,
  accessToken: string,
  studentMembershipId?: string,
): Promise<{ url: string; generated_at: string }> {
  let url = `/guardian/report-card?institution_id=${encodeURIComponent(institutionId)}`;
  if (studentMembershipId) {
    url += `&student_membership_id=${encodeURIComponent(studentMembershipId)}`;
  }
  return apiRequest<{ url: string; generated_at: string }>(url, {}, accessToken);
}
