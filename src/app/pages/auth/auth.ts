import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService, UserRole } from '../../shared/services/auth.service';
import { Input } from '../../shared/ui/input/input';
import { Button } from '../../shared/ui/button/button';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, RouterLink, Input, Button],
  templateUrl: './auth.html',
  styleUrl: './auth.sass',
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  role = signal<'admin' | 'parent'>('parent');

  email = signal('');
  password = signal('');

  loading = signal(false);
  error = signal<string | null>(null);

  canSubmit = computed(() => {
    if (this.loading()) return false;
    const emailOk = /.+@.+\..+/.test(this.email().trim());
    const passOk = this.password().trim().length >= 6;

    return emailOk && passOk;
  });

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.signInWithEmail(this.email(), this.password());
      await this.redirectByRole(this.auth.currentRole());
    } catch (e) {
      console.error(e);
      this.error.set('Authentication failed. Please check your details and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle();
      await this.redirectByRole(this.auth.currentRole());
    } catch (e) {
      console.error(e);
      this.error.set('Google sign-in failed.');
    } finally {
      this.loading.set(false);
    }
  }

  private async redirectByRole(role: UserRole): Promise<void> {
    switch (role) {
      case 'admin':
        await this.router.navigateByUrl('/admin');
        break;
      case 'teacher':
        await this.router.navigateByUrl('/teacher');
        break;
      case 'parent':
        await this.router.navigateByUrl('/parent');
        break;
      default:
        await this.router.navigateByUrl('/');
    }
  }
}
