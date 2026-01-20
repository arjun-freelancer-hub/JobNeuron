'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireAnyRole?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  requireAnyRole = false 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasRole, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (requiredRoles.length > 0) {
        const hasRequiredRole = requireAnyRole
          ? hasAnyRole(requiredRoles)
          : requiredRoles.every((role) => hasRole(role));

        if (!hasRequiredRole) {
          router.push('/dashboard');
        }
      }
    }
  }, [loading, isAuthenticated, user, requiredRoles, requireAnyRole, router, hasRole, hasAnyRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requireAnyRole
      ? hasAnyRole(requiredRoles)
      : requiredRoles.every((role) => hasRole(role));

    if (!hasRequiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
