import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../../shared/services/auth.service';

/**
 * Guard to redirect authenticated users away from auth pages (signin/signup)
 * to their role-specific dashboard
 */
export const redirectAuthenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  const role = authService.currentRole();

  if (user && role !== 'unknown') {
    // User is authenticated, redirect to dashboard based on role
    const dashboardRoutes: Record<Exclude<UserRole, 'unknown'>, string> = {
      parent: '/parent',
      teacher: '/teacher',
      admin: '/admin',
    };

    const dashboardRoute = dashboardRoutes[role as Exclude<UserRole, 'unknown'>];
    if (dashboardRoute) {
      router.navigate([dashboardRoute]);
      return false;
    }
  }

  // User is not authenticated, allow access to auth pages
  return true;
};

/**
 * Guard to protect routes that require authentication
 */
export const requireAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (!user) {
    // User is not authenticated, redirect to signin
    router.navigate(['/auth']);
    return false;
  }

  // User is authenticated, allow access
  return true;
};
