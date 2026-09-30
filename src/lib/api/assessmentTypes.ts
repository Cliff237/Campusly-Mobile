import { API_URL } from '../config';

export interface AssessmentType {
  id: string;
  institution_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export async function fetchAssessmentTypes(
  institutionId: string,
  accessToken: string,
): Promise<AssessmentType[]> {
  const response = await fetch(`${API_URL}/assessment-types/${institutionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to fetch assessment types');
  }

  return response.json();
}

export async function createAssessmentType(
  institutionId: string,
  data: { name: string; description?: string; icon?: string; color?: string },
  accessToken: string,
): Promise<AssessmentType> {
  const response = await fetch(`${API_URL}/assessment-types/${institutionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to create assessment type');
  }

  return response.json();
}

export async function deleteAssessmentType(
  id: string,
  accessToken: string,
): Promise<{ id: string; deleted: boolean }> {
  const response = await fetch(`${API_URL}/assessment-types/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to delete assessment type');
  }

  return response.json();
}
