import { apiRequest } from '@/lib/client';
import { API_URL } from '@/lib/config';
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import type {
  AchievementBadge,
  CourseGradeCardData,
  CreatePostInput,
  PostComment,
  PostMedia,
  PostScope,
  StudentFeedFilter,
  StudentFeedPost,
  StudentPostCategory,
  StudentAttendanceRecord,
  StudentCourse,
  StudentStats,
} from '@/lib/types/student';

export interface StudentDashboard {
  courses: StudentCourse[];
  schedule: { id: string; startHour: number; endHour: number; title: string; subtitle: string; color: string }[];
  attendance: StudentAttendanceRecord[];
  grades: (CourseGradeCardData & { course_id: string })[];
  stats: StudentStats;
  badges: AchievementBadge[];
}

export async function fetchStudentDashboard(institutionId: string, accessToken: string): Promise<StudentDashboard> {
  return apiRequest<StudentDashboard>(`/student/dashboard?institution_id=${encodeURIComponent(institutionId)}`, {}, accessToken);
}

export async function createStudentReportCard(institutionId: string, accessToken: string): Promise<{ url: string; generated_at: string }> {
  return apiRequest<{ url: string; generated_at: string }>(`/student/report-card?institution_id=${encodeURIComponent(institutionId)}`, {}, accessToken);
}

interface InstitutionPostRecord {
  id: string;
  title?: string;
  body: string;
  media?: PostMedia[];
  category?: StudentPostCategory;
  scope?: PostScope;
  course_id?: string | null;
  course_code?: string;
  course_name?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  author_name?: string;
  author_user_id?: string;
  author_actor?: StudentFeedPost['author_actor'];
  author_avatar?: string;
  published_at?: string | null;
  created_at?: string;
  reactions_count?: number;
  comments_count?: number;
  is_reacted?: boolean;
  pinned?: boolean;
  allow_reactions?: boolean;
  allow_comments?: boolean;
}

function mapPost(
  post: InstitutionPostRecord,
  institutionId: string,
  institutionName?: string,
): StudentFeedPost {
  const resolveMediaUrl = (url: string) => {
    if (url.startsWith('/')) return `${API_URL}${url}`;
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads/')) return `${API_URL}${parsed.pathname}`;
    } catch {
      // Keep non-URL media values unchanged.
    }
    return url;
  };
  return {
    id: post.id,
    institution_id: institutionId,
    institution_name: institutionName,
    title: post.title ?? '',
    body: post.body,
    media: Array.isArray(post.media) ? post.media.map((item) => ({ ...item, url: resolveMediaUrl(item.url) })) : [],
    category: post.category ?? 'general',
    scope: post.scope ?? 'institution_wide',
    course_id: post.course_id ?? undefined,
    course_code: post.course_code,
    course_name: post.course_name,
    tags: post.tags ?? [],
    metadata: post.metadata ?? {},
    author_name: post.author_name ?? 'Campusly',
    author_user_id: post.author_user_id,
    author_actor: post.author_actor ?? 'unknown',
    author_avatar: post.author_avatar,
    published_at: post.published_at ?? post.created_at ?? null,
    created_at: post.created_at ?? post.published_at ?? new Date().toISOString(),
    reactions_count: post.reactions_count ?? 0,
    comments_count: post.comments_count ?? 0,
    is_reacted: post.is_reacted ?? false,
    pinned: post.pinned ?? false,
    allow_reactions: post.allow_reactions ?? true,
    allow_comments: post.allow_comments ?? true,
  };
}

export async function fetchInstitutionMemberPosts(
  institutionId: string,
  accessToken: string,
  filters?: { scope?: PostScope; course_id?: string },
): Promise<StudentFeedPost[]> {
  const params = new URLSearchParams({ status: 'published' });
  if (filters?.scope) params.set('scope', filters.scope);
  if (filters?.course_id) params.set('course_id', filters.course_id);

  const data = await apiRequest<{ posts: InstitutionPostRecord[] }>(
    `/institutions/${institutionId}/posts?${params.toString()}`,
    {},
    accessToken,
  );

  return (data.posts ?? []).map((post) => mapPost(post, institutionId));
}

export async function fetchStudentHomeFeed(options: {
  institutionId: string;
  institutionName: string;
  accessToken: string;
  filter: StudentFeedFilter;
}): Promise<StudentFeedPost[]> {
  const { institutionId, institutionName, accessToken } = options;
  const posts = await fetchInstitutionMemberPosts(institutionId, accessToken, {
    scope: 'institution_wide',
  });
  return posts.map((post) => ({ ...post, institution_name: institutionName }));
}

export async function createInstitutionPost(
  institutionId: string,
  input: CreatePostInput,
  accessToken: string,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/institutions/${institutionId}/posts`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        category: input.category,
        scope: input.scope,
        course_id: input.course_id,
        tags: input.tags ?? [],
        media: input.media ?? [],
        metadata: input.metadata ?? {},
        allow_reactions: input.allow_reactions ?? true,
        allow_comments: input.allow_comments ?? true,
        visibility: input.visibility ?? 'institution',
        comment_audience: input.comment_audience ?? 'institution',
        reaction_audience: input.reaction_audience ?? 'institution',
        pinned: input.pinned ?? false,
        language: input.language ?? 'en',
      }),
    },
    accessToken,
  );
}

export async function deleteInstitutionPost(postId: string, accessToken: string): Promise<void> {
  await apiRequest(`/institutions/posts/${postId}`, { method: 'DELETE' }, accessToken);
}

export async function togglePostReaction(
  postId: string,
  accessToken: string,
): Promise<{ is_reacted: boolean; reactions_count: number }> {
  return apiRequest<{ is_reacted: boolean; reactions_count: number }>(
    `/posts/${postId}/reaction`,
    { method: 'POST', body: JSON.stringify({ type: 'like' }) },
    accessToken,
  );
}

export async function fetchPostComments(postId: string, accessToken: string): Promise<PostComment[]> {
  const data = await apiRequest<{ comments: PostComment[] }>(
    `/posts/${postId}/comments`,
    {},
    accessToken,
  );
  return data.comments ?? [];
}

export async function addPostComment(
  postId: string,
  body: string,
  accessToken: string,
): Promise<PostComment> {
  return apiRequest<PostComment>(
    `/posts/${postId}/comments`,
    { method: 'POST', body: JSON.stringify({ body }) },
    accessToken,
  );
}

export async function uploadPostMedia(media: PostMedia, accessToken: string): Promise<PostMedia> {
  const isLocalUri = /^(file|content|ph|asset|blob):/i.test(media.url);
  console.log('[PostMediaUpload] preparing', {
    type: media.type,
    uriScheme: media.url.split(':')[0],
    fileName: media.file_name || media.label,
    mimeType: media.mime_type,
    fileSize: media.file_size,
    isLocalUri,
    apiUrl: API_URL,
  });
  if (!isLocalUri) {
    console.log('[PostMediaUpload] remote URL kept without upload');
    return media;
  }
  const form = new FormData();
  const extension = media.file_name?.split('.').pop()?.toLowerCase();
  const fallbackType = media.type === 'video'
    ? 'video/mp4'
    : media.type === 'document'
      ? 'application/pdf'
      : 'image/jpeg';
  const fileName = media.file_name || media.label || `${media.type}-${Date.now()}.${extension || (media.type === 'video' ? 'mp4' : media.type === 'document' ? 'pdf' : 'jpg')}`;
  let filePart: Blob | ExpoFile;
  if (Platform.OS !== 'web') {
    filePart = new ExpoFile(media.url);
    console.log('[PostMediaUpload] using Expo File multipart part', { uriScheme: media.url.split(':')[0], fileName, type: media.mime_type || fallbackType });
  } else if (media.file) {
    filePart = media.file;
    console.log('[PostMediaUpload] using browser File/Blob', { size: media.file.size, type: media.file.type });
  } else {
    try {
      const localResponse = await fetch(media.url);
      if (!localResponse.ok) throw new Error(`Could not read local media (${localResponse.status})`);
      filePart = await localResponse.blob();
      console.log('[PostMediaUpload] local URI converted to Blob', { size: filePart.size, type: filePart.type });
    } catch (error) {
      console.error('[PostMediaUpload] could not read web local media', error);
      throw error;
    }
  }
  if (Platform.OS === 'web') {
    form.append('file', filePart as Blob, fileName);
  } else {
    form.append('file', filePart as never);
  }
  console.log('[PostMediaUpload] sending multipart request', { fileName, contentType: media.mime_type || fallbackType });
  const response = await fetch(`${API_URL}/upload/content`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form });
  const responseText = await response.text();
  let responseBody: unknown = responseText;
  try { responseBody = responseText ? JSON.parse(responseText) : null; } catch { /* keep text response */ }
  console.log('[PostMediaUpload] response', { status: response.status, ok: response.ok, body: responseBody });
  if (!response.ok) {
    const message = responseBody && typeof responseBody === 'object' && 'message' in responseBody ? String(responseBody.message) : 'Media upload failed';
    throw new Error(message);
  }
  const uploaded = responseBody as { url: string; type: PostMedia['type']; label: string };
  const { file: _file, ...mediaWithoutFile } = media;
  const uploadedMedia = { ...mediaWithoutFile, url: uploaded.url.startsWith('/') ? `${API_URL}${uploaded.url}` : uploaded.url, type: uploaded.type, label: uploaded.label };
  console.log('[PostMediaUpload] completed', { type: uploadedMedia.type, url: uploadedMedia.url, label: uploadedMedia.label });
  return uploadedMedia;
}

export async function updateInstitutionPost(institutionId: string, postId: string, input: CreatePostInput, accessToken: string): Promise<void> {
  await apiRequest(`/institutions/${institutionId}/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ ...input, media: input.media ?? [], allow_reactions: input.allow_reactions ?? true, allow_comments: input.allow_comments ?? true }) }, accessToken);
}
