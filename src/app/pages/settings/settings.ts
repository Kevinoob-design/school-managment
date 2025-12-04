import { Component, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Section } from '../../shared/ui/section/section';
import { Input } from '../../shared/ui/input/input';
import { AuthService } from '../../shared/services/auth.service';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '@angular/fire/auth';
import { Firestore, doc, deleteDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-settings',
  imports: [Button, Section, Input],
  templateUrl: './settings.html',
  styleUrl: './settings.sass',
})
export class SettingsPage {
  private readonly authService = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  protected readonly userRole = this.authService.currentRole;
  protected readonly currentUser = this.authService.currentUser;

  // Password change
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly passwordLoading = signal(false);
  protected readonly passwordError = signal('');
  protected readonly passwordSuccess = signal('');

  // Delete account
  protected readonly deletePassword = signal('');
  protected readonly deleteLoading = signal(false);
  protected readonly deleteError = signal('');
  protected readonly showDeleteModal = signal(false);

  private readonly passwordPolicy = {
    minLength: 8,
    requireUpper: true,
    requireLower: true,
    requireDigit: true,
    requireSpecial: true,
  } as const;

  protected passwordErrors = computed(() => {
    const pwd = this.newPassword().trim();
    const errors: string[] = [];
    if (pwd.length < this.passwordPolicy.minLength)
      errors.push(`Al menos ${this.passwordPolicy.minLength} caracteres`);
    if (this.passwordPolicy.requireUpper && !/[A-Z]/.test(pwd)) errors.push('Una letra mayúscula');
    if (this.passwordPolicy.requireLower && !/[a-z]/.test(pwd)) errors.push('Una letra minúscula');
    if (this.passwordPolicy.requireDigit && !/\d/.test(pwd)) errors.push('Un número');
    if (this.passwordPolicy.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd))
      errors.push('Un carácter especial');
    return errors;
  });

  protected canChangePassword = (): boolean => {
    if (this.passwordLoading()) return false;
    return (
      this.currentPassword().trim().length >= 8 &&
      this.passwordErrors().length === 0 &&
      this.newPassword() === this.confirmPassword()
    );
  };

  protected async changePassword(): Promise<void> {
    if (!this.canChangePassword()) {
      this.passwordError.set('Por favor completa todos los campos correctamente');
      return;
    }

    const user = this.authService.currentUser();
    if (!user || !user.email) {
      this.passwordError.set('No se pudo obtener la información del usuario');
      return;
    }

    this.passwordLoading.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, this.currentPassword().trim());
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, this.newPassword().trim());

      this.passwordSuccess.set('Contraseña actualizada exitosamente');
      // Clear form
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const err = error as { code?: string };
      if (err.code === 'auth/wrong-password') {
        this.passwordError.set('La contraseña actual es incorrecta');
      } else if (err.code === 'auth/weak-password') {
        this.passwordError.set('La nueva contraseña es demasiado débil');
      } else {
        this.passwordError.set('Ocurrió un error al cambiar la contraseña');
      }
    } finally {
      this.passwordLoading.set(false);
    }
  }

  protected isPasswordProvider(): boolean {
    // Check if user signed in with email/password (not Google or other providers)
    const user = this.currentUser();
    if (!user) return false;

    // Check if the user has a password provider
    const hasPasswordProvider = user.providerData.some(
      (provider) => provider.providerId === 'password',
    );
    return hasPasswordProvider;
  }

  protected canShowDeleteOption(): boolean {
    // Teachers cannot delete their own accounts - managed by admins
    return this.userRole() !== 'teacher';
  }

  protected openDeleteModal(): void {
    this.showDeleteModal.set(true);
    this.deletePassword.set('');
    this.deleteError.set('');
  }

  protected closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletePassword.set('');
    this.deleteError.set('');
  }

  protected canDeleteAccount = (): boolean => {
    return !this.deleteLoading() && this.deletePassword().trim().length >= 8;
  };

  protected async deleteAccount(): Promise<void> {
    if (!this.canDeleteAccount()) {
      this.deleteError.set('Debes ingresar tu contraseña para continuar');
      return;
    }

    const user = this.authService.currentUser();
    if (!user || !user.email) {
      this.deleteError.set('No se pudo obtener la información del usuario');
      return;
    }

    this.deleteLoading.set(true);
    this.deleteError.set('');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, this.deletePassword().trim());
      await reauthenticateWithCredential(user, credential);

      // Delete Firestore document
      const userDoc = doc(this.firestore, 'users', user.uid);
      await deleteDoc(userDoc);

      // Delete Firebase Auth account
      await user.delete();

      // Redirect to home
      await this.router.navigate(['/']);
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      const err = error as { code?: string };
      if (err.code === 'auth/wrong-password') {
        this.deleteError.set('Contraseña incorrecta');
      } else {
        this.deleteError.set('Ocurrió un error al eliminar la cuenta');
      }
    } finally {
      this.deleteLoading.set(false);
    }
  }
}
