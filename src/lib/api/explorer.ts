import { apiRequest } from '../client'; // Adjust path to your actual apiRequest utility
import type { Institution, SchoolInfo, PublicPost } from '@/lib/types/explorer';

// ============================================================================
// 1. Institution Profile & School Info
// ============================================================================

/**
 * GET /institutions/:id
 * Fetches the public-facing profile of an institution.
 * Optional accessToken allows the backend to populate `is_following` and `follower_count` accurately.
 */
export async function fetchInstitutionProfile(
  institutionId: string,
  accessToken?: string
): Promise<{ institution: Institution; schoolInfo: SchoolInfo | null }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  const data = await apiRequest<{ institution: Institution }>(
    `/institutions/${institutionId}`,
    { headers },
    accessToken // Assuming your apiRequest handles the token injection
  );
  
  return { institution: data.institution, schoolInfo: null };
}

// ============================================================================
// 2. Public Feed / Posts
// ============================================================================

/**
 * GET /institutions/:id/posts/public?status=published
 * Fetches published posts for a public institution.
 */
export async function fetchPublicPosts(
  institutionId: string,
  accessToken?: string
): Promise<PublicPost[]> {
  const data = await apiRequest<{ posts: PublicPost[] }>(
    `/institutions/${institutionId}/posts/public?status=published`,
    {},
    accessToken
  );
  return data.posts;
}

// ============================================================================
// 3. Interactions (Follow & React)
// ============================================================================

/**
 * POST /institutions/:id/follow
 * Toggles the follow state for the authenticated user.
 */
export async function toggleInstitutionFollow(
  institutionId: string,
  accessToken: string
): Promise<{ is_following: boolean; follower_count: number }> {
  return apiRequest(
    `/institutions/${institutionId}/follow`,
    { method: 'POST' },
    accessToken
  );
}

/**
 * POST /posts/:id/reaction
 * Toggles a reaction (like) on a specific post.
 */
export async function togglePostReaction(
  postId: string,
  accessToken: string
): Promise<{ is_reacted: boolean; reactions_count: number }> {
  return apiRequest(
    `/posts/${postId}/reaction`,
    { method: 'POST', body: JSON.stringify({ type: 'like' }) },
    accessToken
  );
}

/**
 * POST /posts/:id/comments
 * Adds a comment to a post (if the user has permission).
 */
export async function addPostComment(
  postId: string,
  body: string,
  accessToken: string
): Promise<any> { // Replace `any` with your Comment type when ready
  return apiRequest(
    `/posts/${postId}/comments`,
    { method: 'POST', body: JSON.stringify({ body }) },
    accessToken
  );
}