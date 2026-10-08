import { apiRequest } from "@/lib/client";
import { resolveMediaUrl } from "@/lib/media";

export interface Membership {
  membership_id: string;
  base_actor: 'student' | 'guardian' | 'teacher' | 'staff' | 'school_admin' | 'explorer';
  status: 'active' | 'pending' | 'revoked';
  created_at: string;
  institution_id: string;
  institution_name: string;
  institution_type: string;
  institution_city: string;
  institution_country: string;
  institution_logo_url: string | null;
  institution_brand_color: string | null;
  is_institution_visible: boolean;
  permission_bundles: string[];
  permissions: string[]; 
}

/**
 * GET /memberships/me
 * Fetches all institution memberships for the authenticated user.
 */
export async function fetchMyMemberships(accessToken: string): Promise<Membership[]> {
  const data = await apiRequest<{ count: number; memberships: Membership[] }>(
    '/memberships/me',
    {},
    accessToken
  );
  return (data.memberships || []).map((m) => ({
    ...m,
    institution_logo_url: resolveMediaUrl(m.institution_logo_url),
  }));
}

export type MembershipOtpRole = 'student' | 'guardian' | 'teacher' | 'staff';

export interface MembershipOtpInput {
  institution_id: string;
  student_id?: string;
  role: MembershipOtpRole;
  expires_in_days: number;
}

export interface MembershipOtpResult {
  code: string;
  expires_at: string;
}

export interface MembershipOtpPreview {
  student_name: string | null;
  institution_name: string;
  role: MembershipOtpRole;
  expires_at: string;
}

export async function generateMembershipOtp(
  input: MembershipOtpInput,
  accessToken: string,
): Promise<MembershipOtpResult> {
  return apiRequest('/memberships/otp/generate', { method: 'POST', body: JSON.stringify(input) }, accessToken);
}

export async function previewMembershipOtp(code: string, accessToken: string): Promise<MembershipOtpPreview> {
  return apiRequest('/memberships/otp/preview', { method: 'POST', body: JSON.stringify({ code }) }, accessToken);
}

export async function redeemMembershipOtp(code: string, accessToken: string) {
  return apiRequest('/memberships/otp/redeem', { method: 'POST', body: JSON.stringify({ code }) }, accessToken);
}

export async function resendMembershipOtp(
  input: MembershipOtpInput,
  accessToken: string,
): Promise<MembershipOtpResult> {
  return apiRequest('/memberships/otp/resend', { method: 'POST', body: JSON.stringify(input) }, accessToken);
}