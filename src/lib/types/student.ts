export type StudentFeedFilter = 'all' | 'courses' | 'institution' | 'following';

export type StudentPostCategory =
  | 'general'
  | 'event'
  | 'opportunity'
  | 'achievement'
  | 'official_announcement'
  | 'partnership'
  | 'academic';

export type PostScope = 'institution_wide' | 'course_specific';

export type BaseActor =
  | 'student'
  | 'guardian'
  | 'teacher'
  | 'staff'
  | 'school_admin'
  | 'explorer';

export interface PostMedia {
  id?: string;
  type: 'image' | 'video' | 'document';
  url: string;
  label?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  file?: Blob;
}

export interface StudentFeedPost {
  id: string;
  institution_id: string;
  institution_name?: string;
  title: string;
  body: string;
  media: PostMedia[];
  category: StudentPostCategory;
  scope: PostScope;
  course_id?: string;
  course_code?: string;
  course_name?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  author_name: string;
  author_user_id?: string;
  author_actor: BaseActor | 'unknown';
  author_avatar?: string;
  published_at: string | null;
  created_at: string;
  reactions_count: number;
  comments_count: number;
  is_reacted?: boolean;
  pinned: boolean;
  allow_reactions: boolean;
  allow_comments: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_name: string;
  author_actor: string;
  author_avatar?: string;
  body: string;
  created_at: string;
}

export interface CreatePostInput {
  title: string;
  body: string;
  category: StudentPostCategory;
  scope: PostScope;
  course_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  media?: PostMedia[];
  allow_reactions?: boolean;
  allow_comments?: boolean;
  visibility?: 'institution' | 'students' | 'public';
  comment_audience?: 'institution' | 'students';
  reaction_audience?: 'institution' | 'students';
  pinned?: boolean;
  language?: 'en' | 'fr' | 'bilingual';
}

export interface StudentCourse {
  class_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  section: string;
  teacher_name: string;
  schedule?: string;
  room?: string;
  attendance_rate?: number;
  unread_count?: number;
}

export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';

export interface CourseMaterial {
  id: string;
  name: string;
  size_label: string;
  date: string;
}

export interface CourseAssignment {
  id: string;
  title: string;
  due_date: string;
  status: AssignmentStatus;
  score?: number;
  max_score?: number;
}

export interface CourseGradeItem {
  id: string;
  assessment_name: string;
  assessment_type?: string;
  raw_score?: number;
  deduction?: number;
  deduction_reason?: string;
  score: number;
  max_score: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface StudentAttendanceRecord {
  id: string;
  class_id?: string;
  course_name: string;
  course_code?: string;
  date: string;
  time?: string;
  status: AttendanceStatus;
  penalty?: number;
  reason?: string;
}

export interface StudentStats {
  gpa?: number;
  gpa_max?: number;
  attendance_percent?: number;
  rank?: number;
  rank_total?: number;
  credits?: number;
  credits_total?: number;
}

export interface CourseGradeCardData {
  class_id: string;
  course_name: string;
  teacher_name?: string;
  letter_grade?: string;
  total_percent?: number;
  items: CourseGradeItem[];
  total_deduction?: number;
  attendance_penalty?: number;
  absence_count?: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export type StudentNotificationType =
  | 'attendance'
  | 'post'
  | 'assignment'
  | 'grade'
  | 'system';

export interface StudentNotification {
  id: string;
  type: StudentNotificationType;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

export interface TodayGlanceItem {
  id: string;
  label: string;
}

export interface StoryItem {
  id: string;
  label: string;
  image_url?: string | null;
  kind: 'institution' | 'course';
}
