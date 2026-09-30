import { useAuth } from '@/lib/auth/AuthContext';

export function usePermissions() {
  const { currentMembership, isReady, hasPermission, hasAny } = useAuth();
  const permissions: string[] = currentMembership?.permissions ?? [];

  const hasAll = (keys: string[]): boolean => {
    if (keys.length === 0) return true;
    return keys.every((key) => hasPermission(key));
  };

  return {
    isReady,
    permissions,
    hasPermission,
    hasAny,
    hasAll,
    can: hasPermission,
    loading: !isReady,
  };
}
