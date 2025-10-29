import { Component, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../ui/button/button';
import { AuthService } from '../../services/auth.service';

type UserRole = 'parent' | 'teacher' | 'admin';

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
    const role = this.authService.currentRole();
    switch (role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'parent':
        return '/parent';
      default:
        return '/';
    }
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

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
    // Mirror auth signals into header state for avatar and labels
    const user = this.authService.currentUser();
    this.isAuthenticated.set(!!user);
    if (user) {
      const role = this.authService.currentRole();
      const mappedRole: UserRole | null = role === 'unknown' ? null : role;
      this.userProfile.set({
        displayName: user.displayName,
        email: user.email,
        photoURL: (user as unknown as { photoURL: string | null }).photoURL ?? null,
        role: mappedRole,
      });
    } else {
      this.userProfile.set(null);
    }
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((value) => !value);
  }

  protected async handleSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
      this.userMenuOpen.set(false);
      await this.router.navigate(['/']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  protected async goSignIn(): Promise<void> {
    await this.router.navigate(['/auth'], { queryParams: { mode: 'signin' } });
  }

  protected async goSignUp(): Promise<void> {
    await this.router.navigate(['/signup']);
  }
}
