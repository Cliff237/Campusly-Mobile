import { apiRequest } from '@/lib/client';
import { PublicPost } from '@/lib/types/discover';
import { resolveMediaUrl } from '@/lib/media';

// Shape returned by GET /institutions/directory
export interface DirectoryInstitution {
  id: string;
  name: string;
  type: 'university' | 'training_school' | 'secondary';
  country: string;
  city: string;
  logo_url: string | null;
  school_info_content: string | null;
  brand_accent_color: string | null;
  student_tier: 'small' | 'medium' | 'large';
  website_url: string | null;
  created_at: string;
  is_following: boolean;
  follower_count: number;
  post_count?: number;
  public_post_count?: number;
  accreditation_number?: string | null;
  accreditation_document_url?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export interface DirectoryFilters {
  search?: string;
  type?: string;
  country?: string;
}

/** GET /institutions/directory — public, no token needed */
export async function fetchInstitutionDirectory(
  filters?: DirectoryFilters,
  accessToken?: string
): Promise<DirectoryInstitution[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.country) params.append('country', filters.country);
  const query = params.toString() ? `?${params.toString()}` : '';

  const data = await apiRequest<{ count: number; institutions: DirectoryInstitution[] }>(
    `/institutions/directory${query}`,
    {},
    accessToken,
  );
  return data.institutions.map((institution) => ({
    ...institution,
    logo_url: resolveMediaUrl(institution.logo_url),
    post_count: institution.post_count ?? institution.public_post_count ?? 0,
  }));
}

/** GET /institutions/:id — single institution detail (public if visible) */
export async function fetchInstitutionById(id: string, accessToken?: string): Promise<DirectoryInstitution> {
  const data = await apiRequest<{ institution: DirectoryInstitution }>(`/institutions/${id}`, {}, accessToken);
  return {
    ...data.institution,
    logo_url: resolveMediaUrl(data.institution.logo_url),
  };
}

export async function fetchPublicPosts(institutionId: string): Promise<PublicPost[]> {
  const data = await apiRequest<{ posts: PublicPost[] }>(`/institutions/${institutionId}/posts?status=published`);
  return data.posts;
}

export async function toggleReaction(postId: string): Promise<void> {
  await apiRequest(`/posts/${postId}/reaction`, { method: 'POST', body: JSON.stringify({ type: 'like' }) });
}

export async function toggleFollow(institutionId: string, accessToken?: string): Promise<{ is_following: boolean; follower_count: number }> {
  return apiRequest(`/institutions/${institutionId}/follow`, { method: 'POST' }, accessToken);
}

// Display-label helpers (backend enum → readable text)
export const TYPE_LABELS: Record<string, string> = {
  university: 'University',
  training_school: 'Training School',
  secondary: 'Secondary School',
};

export interface UpdateInstitutionInput {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
  website_url?: string;
  school_info_content?: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  contact_phone?: string;
  latitude?: number;
  longitude?: number;
  brand_accent_color?: string;
  is_visible?: boolean;
}

/** PATCH /institutions/:id — update institution details (school_admin or platform_admin) */
export async function updateInstitution(
  institutionId: string,
  input: UpdateInstitutionInput,
  accessToken: string,
): Promise<DirectoryInstitution> {
  const data = await apiRequest<{ message: string; institution: DirectoryInstitution }>(
    `/institutions/${institutionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    accessToken,
  );
  return data.institution;
}