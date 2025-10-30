import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { Input } from '../../shared/ui/input/input';
import { Button } from '../../shared/ui/button/button';
import { AuthService } from '../../shared/services/auth.service';
import { SchoolService, DominicanAddress } from '../../shared/services/school.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, RouterLink, Input, Button],
  templateUrl: './signup.html',
  styleUrl: './signup.sass',
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly schoolService = inject(SchoolService);

  fullName = signal('');
  phoneNumber = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  role = signal<'admin' | 'parent'>('parent');
  loading = signal(false);
  error = signal<string | null>(null);

  // School fields (only for admin)
  schoolName = signal('');
  street = signal('');
  number = signal('');
  sector = signal('');
  city = signal('');
  province = signal('');
  postalCode = signal('');
  registrationNumber = signal('');

  private readonly passwordPolicy = {
    minLength: 8,
    requireUpper: true,
    requireLower: true,
    requireDigit: true,
    requireSpecial: true,
  } as const;

  passwordErrors = computed(() => {
    const pwd = this.password().trim();
    const errors: string[] = [];
    if (pwd.length < this.passwordPolicy.minLength)
      errors.push(`At least ${this.passwordPolicy.minLength} characters`);
    if (this.passwordPolicy.requireUpper && !/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (this.passwordPolicy.requireLower && !/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (this.passwordPolicy.requireDigit && !/\d/.test(pwd)) errors.push('One number');
    if (this.passwordPolicy.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd))
      errors.push('One special character');
    return errors;
  });

  canSubmit = computed(() => {
    if (this.loading()) return false;
    const emailOk = this.isValidEmail(this.email().trim());
    const passOk = this.passwordErrors().length === 0;
    const confirmOk = this.password().trim() === this.confirmPassword().trim();
    const nameOk = this.fullName().trim().length >= 2;
    const phoneOk = this.isValidPhone(this.phoneNumber().trim());

    // Additional validation for admin role
    if (this.role() === 'admin') {
      const schoolNameOk = this.schoolName().trim().length >= 3;
      const streetOk = this.street().trim().length >= 3;
      const numberOk = this.number().trim().length >= 1;
      const sectorOk = this.sector().trim().length >= 3;
      const cityOk = this.city().trim().length >= 3;
      const provinceOk = this.province().trim().length >= 3;
      const regNumberOk = this.registrationNumber().trim().length >= 5;

      return (
        emailOk &&
        passOk &&
        confirmOk &&
        nameOk &&
        phoneOk &&
        schoolNameOk &&
        streetOk &&
        numberOk &&
        sectorOk &&
        cityOk &&
        provinceOk &&
        regNumberOk
      );
    }

    return emailOk && passOk && confirmOk && nameOk && phoneOk;
  });

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      // Create user account
      const user = await this.auth.signUpWithEmail({
        fullName: this.fullName(),
        phoneNumber: this.phoneNumber(),
        email: this.email(),
        password: this.password(),
        role: this.role(),
      });

      // If admin, create school record
      if (this.role() === 'admin') {
        const address: DominicanAddress = {
          street: this.street().trim(),
          number: this.number().trim(),
          sector: this.sector().trim(),
          city: this.city().trim(),
          province: this.province().trim(),
          postalCode: this.postalCode().trim() || undefined,
        };

        await this.schoolService.createSchool(user.uid, {
          schoolName: this.schoolName().trim(),
          address,
          registrationNumber: this.registrationNumber().trim(),
        });
      }

      const role = this.auth.currentRole();
      await this.router.navigateByUrl(
        role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/parent',
      );
    } catch (e) {
      console.error(e);
      const error = e as Error;
      if (error.message === 'Registration number is already in use') {
        this.error.set('This school registration number is already in use');
      } else {
        this.error.set('Sign up failed. Please check your details and try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected onPhoneInput(raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length >= 1) {
      formatted = `(${digits.slice(0, 3)}`;
      if (digits.length >= 4) formatted += `) ${digits.slice(3, 6)}`;
      if (digits.length >= 7) formatted += `-${digits.slice(6, 10)}`;
    }
    if (digits.length < 1) formatted = '';
    this.phoneNumber.set(formatted);
  }

  // Validation helpers (kept out of template for clarity)
  protected isEmailInvalid(): boolean {
    return !this.isValidEmail(this.email().trim());
  }

  protected isPhoneInvalid(): boolean {
    return !this.isValidPhone(this.phoneNumber().trim());
  }

  private isConfirmMismatch(): boolean {
    const pwd = this.password().trim();
    const confirm = this.confirmPassword().trim();
    return confirm.length > 0 && confirm !== pwd;
  }

  protected isPasswordInvalid(): boolean {
    // invalid if password policy fails OR confirm mismatch is present
    return this.passwordErrors().length > 0 || this.isConfirmMismatch();
  }

  protected isConfirmInvalid(): boolean {
    // mirror password invalid plus mismatch for consistent UX
    return this.passwordErrors().length > 0 || this.isConfirmMismatch();
  }

  private isValidEmail(value: string): boolean {
    return /.+@.+\..+/.test(value);
  }

  private isValidPhone(value: string): boolean {
    return /\(\d{3}\) \d{3}-\d{4}/.test(value);
  }
}
