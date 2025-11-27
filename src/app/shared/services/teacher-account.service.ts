import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class TeacherAccountService {
  private readonly functions = inject(Functions);
  private readonly authService = inject(AuthService);

  /**
   * Generate a secure random password
   * 12 characters with uppercase, lowercase, numbers, and symbols
   */
  generateRandomPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%&*-_=+';

    const allChars = uppercase + lowercase + numbers + symbols;

    // Ensure at least one character from each category
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Create a teacher account in Firebase Auth using Cloud Functions
   * This keeps the admin session active
   */
  async createTeacherAccount(
    email: string,
    password: string,
    teacherId: string,
    teacherName: string,
    tenantId: string,
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const createAccountFn = httpsCallable<
        {
          email: string;
          password: string;
          teacherId: string;
          teacherName: string;
          tenantId: string;
        },
        { success: boolean; userId?: string }
      >(this.functions, 'createTeacherAccount');

      const result = await createAccountFn({
        email,
        password,
        teacherId,
        teacherName,
        tenantId,
      });

      return {
        success: true,
        userId: result.data.userId,
      };
    } catch (error: unknown) {
      console.error('Error creating teacher account:', error);
      const functionsError = error as { message?: string; code?: string };
      return {
        success: false,
        error: functionsError.message || 'Error al crear la cuenta',
      };
    }
  }

  /**
   * Reset teacher password using Cloud Functions
   * This keeps the admin session active
   */
  async resetTeacherPassword(
    teacherUserId: string,
    teacherId: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const resetPasswordFn = httpsCallable<
        {
          teacherUserId: string;
          teacherId: string;
          newPassword: string;
        },
        { success: boolean }
      >(this.functions, 'resetTeacherPassword');

      const result = await resetPasswordFn({
        teacherUserId,
        teacherId,
        newPassword,
      });

      return {
        success: result.data.success,
      };
    } catch (error: unknown) {
      console.error('Error resetting teacher password:', error);
      const functionsError = error as { message?: string; code?: string };
      return {
        success: false,
        error: functionsError.message || 'Error al restablecer la contraseña',
      };
    }
  }
}
