export type MarkAssessmentType = 'exam' | 'quiz' | 'assignment' | 'project' | string;

export interface TeacherClass {
  id: string;
  institution_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  section: string;
  enrolled_count: number;
}

export interface CustomAssessmentType {
  id: string;
  institution_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface TeacherMarkEntry {
  id: string;
  student_membership_id: string;
  raw_score: number;
  deduction: number;
  deduction_reason?: string | null;
  final_score: number;
  student_membership?: { user: { full_name: string } };
}

export interface TeacherMarkSubmission {
  id: string;
  class_id: string;
  assessment_name: string;
  assessment_type: MarkAssessmentType;
  max_score: number;
  status: 'pending_approval' | 'approved' | 'rejected';
  created_at: string;
  entries: TeacherMarkEntry[];
}

export interface CreateMarkSubmissionInput {
  class_id: string;
  assessment_name: string;
  assessment_type: MarkAssessmentType;
  max_score: number;
  attendance_session_id?: string;
  entries: { student_membership_id: string; raw_score: number; deduction?: number; deduction_reason?: string }[];
}

export interface UpdateMarkSubmissionInput {
  assessment_name?: string;
  assessment_type?: MarkAssessmentType;
  max_score?: number;
  attendance_session_id?: string;
  entries?: CreateMarkSubmissionInput['entries'];
}
