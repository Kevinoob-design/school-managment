import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export function roleGuard(allowed: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.currentRole();
    const user = auth.currentUser();
    if (!user) return router.parseUrl('/auth');
    if (allowed.includes(role)) return true;
    return router.parseUrl('/');
  };
}
