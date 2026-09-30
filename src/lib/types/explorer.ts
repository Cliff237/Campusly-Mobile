// ============================================================================
// Institution Types
// ============================================================================

export type InstitutionCategory = 'university' | 'training_school' | 'secondary_school' | 'technical_institute';

export interface Institution {
  website: any;
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

// ============================================================================
// Post & Media Types
// ============================================================================

export type PublicPostCategory = 'general' | 'event' | 'academic' | 'achievement' | 'opportunity';
export type PostMediaType = 'image' | 'video' | 'document';

export interface PostMedia {
  id: string;
  type: PostMediaType;
  url: string;
  label?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

// Enhanced for mobile: includes media and comments_count
export interface PublicPost {
  id: string;
  institution_id: string;
  title?: string;
  body: string;
  media: PostMedia[]; 
  category: PublicPostCategory;
  tags: string[];
  metadata?: Record<string, string>;
  author_name: string;
  published_at: string;
  reactions_count: number;
  comments_count: number; 
  is_reacted: boolean;
}

// Unified Feed Types (from your original dump)
export type FeedScope = 'institution' | 'following' | 'discover';

export interface FeedPost {
  id: string;
  institution_id: string;
  institution_name: string;
  institution_color?: string;
  title?: string;
  body: string;
  media: PostMedia[];
  category: PublicPostCategory;
  tags: string[];
  metadata?: Record<string, string>;
  author_name: string;
  published_at: string;
  reactions_count: number;
  comments_count: number;
  is_reacted: boolean;
}

export interface InstitutionOption {
  id: string;
  name: string;
  color?: string;
}

export interface FeedFilters {
  institution_id?: string;
  category?: string;
  search?: string;
}

export interface PostsHubProps {
  availableScopes: FeedScope[];
  defaultScope: FeedScope;
  canComment: boolean;
  activeInstitutionId?: string;
  institutions: InstitutionOption[];
}

// ============================================================================
// Structured Metadata by Post Type
// ============================================================================

export interface EventMetadata {
  start_date: string;
  end_date?: string;
  location?: string;
  show_countdown?: boolean;
}

export interface OpportunityMetadata {
  application_deadline: string;
  eligibility?: string;
  external_link?: string;
  amount?: string;
}

export interface AchievementMetadata {
  achievement_date: string;
  recognized_by?: string;
}

export interface AnnouncementMetadata {
  effective_date?: string;
  deadline?: string;
}

export type PostMetadata = EventMetadata | OpportunityMetadata | AchievementMetadata | AnnouncementMetadata | Record<string, string>;

// ============================================================================
// Explorer Stats & Filters
// ============================================================================

export interface ExplorerStats {
  total_institutions: number;
  followed_count: number;
  bound_institutions: number;
}

export interface ExplorerFilters {
  category?: InstitutionCategory;
  region?: string;
  search?: string;
}

// ============================================================================
// Constants & Labels
// ============================================================================

export const CATEGORY_LABELS: Record<InstitutionCategory, string> = {
  university: 'University',
  training_school: 'Training School',
  secondary_school: 'Secondary School',
  technical_institute: 'Technical Institute',
};

export const POST_CATEGORY_LABELS: Record<PublicPostCategory, string> = {
  general: 'General',
  event: 'Event',
  academic: 'Academic',
  achievement: 'Achievement',
  opportunity: 'Opportunity',
};

export const POST_CATEGORY_ICONS: Record<PublicPostCategory, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  general: 'information-circle-outline',
  event: 'calendar-outline',
  academic: 'school-outline',
  achievement: 'trophy-outline',
  opportunity: 'briefcase-outline',
};

export const POST_CATEGORY_COLORS: Record<PublicPostCategory, string> = {
  general: '#64748b',
  event: '#f59e0b',
  academic: '#3b82f6',
  achievement: '#10b981',
  opportunity: '#8b5cf6',
};

export const CAMEROON_REGIONS = [
  'Adamaoua', 'Centre', 'East', 'Far North', 'Littoral',
  'North', 'North West', 'South', 'South West', 'West',
];