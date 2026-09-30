import { apiRequest } from '@/lib/client';
import type { CreateMarkSubmissionInput, TeacherClass, TeacherMarkSubmission, UpdateMarkSubmissionInput } from '@/lib/types/teacherMarks';

export async function fetchTeacherClasses(accessToken: string): Promise<TeacherClass[]> {
  console.log('[Marks] Loading teacher classes');
  return apiRequest<TeacherClass[]>('/teacher/classes', {}, accessToken);
}

export async function fetchClassMarkSubmissions(classId: string, accessToken: string): Promise<TeacherMarkSubmission[]> {
  console.log('[Marks] Loading submissions', { classId });
  return apiRequest<TeacherMarkSubmission[]>(`/teacher/marks/class/${classId}`, {}, accessToken);
}

export async function createMarkSubmission(input: CreateMarkSubmissionInput, accessToken: string): Promise<{ submission_id: string; status: string; total_students: number }> {
  console.log('[Marks] Creating submission', { classId: input.class_id, assessment: input.assessment_name, entries: input.entries.length });
  return apiRequest('/teacher/marks/submit', { method: 'POST', body: JSON.stringify(input) }, accessToken);
}

export async function updateMarkSubmission(submissionId: string, input: UpdateMarkSubmissionInput, accessToken: string): Promise<TeacherMarkSubmission> {
  return apiRequest<TeacherMarkSubmission>(`/teacher/marks/${submissionId}`, { method: 'PATCH', body: JSON.stringify(input) }, accessToken);
}

export async function deleteMarkSubmission(submissionId: string, accessToken: string): Promise<{ submission_id: string; deleted: true }> {
  return apiRequest(`/teacher/marks/${submissionId}`, { method: 'DELETE' }, accessToken);
}
