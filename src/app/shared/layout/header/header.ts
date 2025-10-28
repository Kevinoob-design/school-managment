import { Component, signal, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth, user, signOut } from '@angular/fire/auth';
import { Button } from '../../ui/button/button';

type UserRole = 'school' | 'parent' | 'teacher' | 'admin';

interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole | null;
}

@Component({
  selector: 'app-header',
  imports: [Button, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.sass',
})
export class Header {
  protected readonly mobileMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly isAuthenticated = signal(false);
  protected readonly userProfile = signal<UserProfile | null>(null);

  protected readonly dashboardRoute = computed(() => {
    const role = this.userProfile()?.role;
    if (!role) return '/';

    const roleRoutes: Record<UserRole, string> = {
      school: '/school/dashboard',
      parent: '/parent/dashboard',
      teacher: '/teacher/dashboard',
      admin: '/admin/dashboard',
    };

    return roleRoutes[role];
  });

  protected readonly userInitials = computed(() => {
    const profile = this.userProfile();
    if (!profile) return '';

    if (profile.displayName) {
      return profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    if (profile.email) {
      return profile.email[0].toUpperCase();
    }

    return 'U';
  });

  auth = inject(Auth);

  constructor() {
    effect(() => {
      user(this.auth).subscribe((currentUser) => {
        this.isAuthenticated.set(!!currentUser);

        if (currentUser) {
          // Get role from custom claims or user metadata
          // For now, we'll use a placeholder - in production, fetch from Firestore or custom claims
          const role = (currentUser as { role?: UserRole }).role || 'parent';

          this.userProfile.set({
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            role: role as UserRole,
          });
        } else {
          this.userProfile.set(null);
        }
      });
    });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((value) => !value);
  }

  protected async handleSignOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.userMenuOpen.set(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}
