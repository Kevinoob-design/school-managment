import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Auth, signInAnonymously } from '@angular/fire/auth';
import { Router } from '@angular/router';

type AuthView = 'login' | 'register';
type UserRole = 'familia' | 'administrativo';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [NgIf, NgClass, NgFor],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.sass',
})
export class AuthComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly activeView = signal<AuthView>('login');
  protected readonly isBusy = signal(false);
  protected readonly authError = signal<string | null>(null);
  protected readonly authMessage = signal<string | null>(null);
  protected readonly loginRole = signal<UserRole>('familia');
  protected readonly availableRoles: Array<{ value: UserRole; label: string; icon: string }> = [
    { value: 'familia', label: 'Familia / Tutor', icon: 'family_restroom' },
    { value: 'administrativo', label: 'Personal administrativo', icon: 'shield_person' },
  ];

  protected setActiveView(view: AuthView) {
    this.activeView.set(view);
  }

  protected setLoginRole(role: UserRole) {
    this.loginRole.set(role);
  }

  protected async loginAnonymously() {
    if (this.isBusy()) {
      return;
    }

    this.authError.set(null);
    this.authMessage.set(null);
    this.isBusy.set(true);

    try {
      const credential = await signInAnonymously(this.auth);
      const uid = credential.user?.uid ?? '';
      const shortUid = uid ? `${uid.slice(0, 6)}...` : 'sin ID';
      const role = this.loginRole();
      const targetRoute = role === 'administrativo' ? '/admin-dashboard' : '/parent-portal';
      const targetLabel = role === 'administrativo' ? 'portal administrativo' : 'portal familiar';
      this.authMessage.set(
        `Acceso temporal concedido (${shortUid}). Redirigiendo al ${targetLabel}...`,
      );
      setTimeout(() => {
        void this.router.navigate([targetRoute]);
      }, 900);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesion anonima. Intenta nuevamente.';
      this.authError.set(message);
      console.error('Anonymous login failed', err);
    } finally {
      this.isBusy.set(false);
    }
  }
}
