import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission?: string;
  anyOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  anyOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAny } = usePermissions();

  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAny(anyOf)
      : false;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
