export type UserRole = 'explorer' | 'student' | 'guardian' | 'teacher' | 'staff' | 'school_admin';

export type InstitutionCategory = 'university' | 'training_school' | 'secondary_school' | 'technical_institute';

export interface InstitutionMembership {
  institution_id: string;
  role: UserRole;
  role_label?: string; // e.g., "Communications Officer" for staff bundles
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description: string;
  category: InstitutionCategory;
  region: string;
  city: string;
  student_count: number;
  follower_count: number;
  public_post_count: number;
  is_following: boolean;
  brand_color?: string;
  is_locked: boolean;
}

export interface SchoolInfo {
  institution_id: string;
  about: string;
  registration_requirements: string;
  admission_process: string;
  programs_offered: string[];
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  founded_year?: number;
  accreditation?: string;
}

export type PublicPostCategory = 'general' | 'event' | 'academic' | 'achievement' | 'opportunity';

export interface PublicPost {
  id: string;
  institution_id: string;
  title?: string;
  body: string;
  category: PublicPostCategory;
  tags: string[];
  metadata?: Record<string, string>;
  author_name: string;
  published_at: string;
  reactions_count: number;
  is_reacted: boolean;
}

export interface ExplorerStats {
  total_institutions: number;
  followed_count: number;
  bound_institutions: number;
}

export const CATEGORY_LABELS: Record<InstitutionCategory, string> = {
  university: 'University',
  training_school: 'Training School',
  secondary_school: 'Secondary School',
  technical_institute: 'Technical Institute',
};

export const CAMEROON_REGIONS = [
  'Adamaoua', 'Centre', 'East', 'Far North', 'Littoral',
  'North', 'North West', 'South', 'South West', 'West',
];