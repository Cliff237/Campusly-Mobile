import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Legacy institution explorer route.
 * Automatically forwards to the unified Explorer Home page with institutionId.
 */
export default function LegacyInstitutionExplorerRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/explorer/home?institutionId=${id}` as any} />;
}