import { NgClass, NgIf } from '@angular/common';
import { Component, signal } from '@angular/core';

type AuthView = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [NgIf, NgClass],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.sass',
})
export class AuthComponent {
  protected readonly activeView = signal<AuthView>('login');

  protected setActiveView(view: AuthView) {
    this.activeView.set(view);
  }
}
