import { NgClass, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Auth, signInAnonymously } from '@angular/fire/auth';
import { Router } from '@angular/router';

type AuthView = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [NgIf, NgClass],
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

  protected setActiveView(view: AuthView) {
    this.activeView.set(view);
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
      this.authMessage.set(
        `Acceso temporal concedido (${shortUid}). Redirigiendo al portal familiar...`,
      );
      setTimeout(() => {
        void this.router.navigate(['/parent-portal']);
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
