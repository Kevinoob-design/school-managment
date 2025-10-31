import { Component, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../ui/button/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [Button, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.sass',
})
export class Header {
  protected readonly mobileMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly isAuthenticated = computed(() => !!this.authService.currentUser());

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
    const user = this.authService.currentUser();
    if (!user) return '';

    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    if (user.email) {
      return user.email[0].toUpperCase();
    }

    return 'U';
  });

  protected readonly displayName = computed(() => {
    const user = this.authService.currentUser();
    return user?.displayName || user?.email || '';
  });

  protected readonly photoURL = computed(() => {
    const user = this.authService.currentUser();
    return user?.photoURL || null;
  });

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
    await this.router.navigate(['/auth']);
  }

  protected async goSignUp(): Promise<void> {
    await this.router.navigate(['/signup']);
  }
}
