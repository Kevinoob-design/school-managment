import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import { TeacherService, Teacher } from '../../../shared/services/teacher.service';
import { SubjectService, Subject } from '../../../shared/services/subject.service';
import { TeacherAccountService } from '../../../shared/services/teacher-account.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-teachers-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './teachers.html',
  styleUrl: './teachers.sass',
})
export class TeachersTab implements OnInit {
  private readonly teacherService = inject(TeacherService);
  private readonly subjectService = inject(SubjectService);
  private readonly teacherAccountService = inject(TeacherAccountService);
  private readonly authService = inject(AuthService);

  protected teachers = signal<Teacher[]>([]);
  protected subjects = signal<Subject[]>([]);
  protected loading = signal(true);
  protected showModal = signal(false);
  protected editingTeacher = signal<Teacher | null>(null);

  // Form fields
  protected fullName = signal('');
  protected email = signal('');
  protected phoneNumber = signal('');
  protected selectedSubjects = signal<string[]>([]);
  protected isActive = signal(true);
  protected formError = signal('');

  // Account management
  protected createAccount = signal(false);
  protected generatedPassword = signal('');
  protected passwordCopied = signal(false);
  protected accountLoading = signal(false);
  protected showPasswordSection = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    const [teachers, subjects] = await Promise.all([
      this.teacherService.getTeachers(),
      this.subjectService.getSubjects(),
    ]);
    this.teachers.set(teachers);
    this.subjects.set(subjects);
    this.loading.set(false);
  }

  public openAddModal(): void {
    this.resetForm();
    this.editingTeacher.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(teacher: Teacher): void {
    this.editingTeacher.set(teacher);
    this.fullName.set(teacher.fullName);
    this.email.set(teacher.email);
    this.phoneNumber.set(teacher.phoneNumber);
    this.selectedSubjects.set([...teacher.subjects]);
    this.isActive.set(teacher.status === 'active');
    this.createAccount.set(false);
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.fullName.set('');
    this.email.set('');
    this.phoneNumber.set('');
    this.selectedSubjects.set([]);
    this.isActive.set(true);
    this.formError.set('');
    this.createAccount.set(false);
    this.generatedPassword.set('');
    this.passwordCopied.set(false);
    this.accountLoading.set(false);
    this.showPasswordSection.set(false);
  }

  protected toggleSubject(subjectId: string): void {
    const current = this.selectedSubjects();
    if (current.includes(subjectId)) {
      this.selectedSubjects.set(current.filter((id) => id !== subjectId));
    } else {
      this.selectedSubjects.set([...current, subjectId]);
    }
  }

  protected async saveTeacher(): Promise<void> {
    // Validation
    if (!this.fullName().trim()) {
      this.formError.set('El nombre es requerido');
      return;
    }

    if (!this.email().trim()) {
      this.formError.set('El email es requerido');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email())) {
      this.formError.set('Email inválido');
      return;
    }

    if (!this.phoneNumber().trim()) {
      this.formError.set('El teléfono es requerido');
      return;
    }

    if (this.selectedSubjects().length === 0) {
      this.formError.set('Selecciona al menos una asignatura');
      return;
    }

    const teacherData = {
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      phoneNumber: this.phoneNumber().trim(),
      subjects: this.selectedSubjects(),
      status: this.isActive() ? ('active' as const) : ('inactive' as const),
    };

    try {
      const editing = this.editingTeacher();
      if (editing && editing.id) {
        await this.teacherService.updateTeacher(editing.id, teacherData);

        // If creating account for existing teacher without account
        if (this.createAccount() && !editing.userId) {
          await this.createTeacherAccount(editing.id);
        } else {
          await this.loadData();
          this.closeModal();
        }
      } else {
        // Creating new teacher
        const teacherId = await this.teacherService.addTeacher(teacherData);

        if (!teacherId) {
          this.formError.set('Error al crear el profesor');
          return;
        }

        // If account creation is requested
        if (this.createAccount()) {
          await this.createTeacherAccount(teacherId);
        } else {
          await this.loadData();
          this.closeModal();
        }
      }
    } catch (error) {
      this.formError.set('Error al guardar el profesor');
      console.error(error);
    }
  }

  private async createTeacherAccount(teacherId: string): Promise<void> {
    this.accountLoading.set(true);
    this.formError.set('');

    const currentUser = this.authService.currentUser();
    if (!currentUser || !currentUser.email) {
      this.formError.set('No se pudo obtener la sesión del administrador');
      this.accountLoading.set(false);
      return;
    }

    const password = this.teacherAccountService.generateRandomPassword();
    const tenantId = this.authService.getCurrentTenantId();

    if (!tenantId) {
      this.formError.set('No se pudo obtener el ID del administrador');
      this.accountLoading.set(false);
      return;
    }

    const result = await this.teacherAccountService.createTeacherAccount(
      this.email().trim(),
      password,
      teacherId,
      this.fullName().trim(),
      tenantId,
    );

    if (result.success) {
      this.generatedPassword.set(password);
      this.showPasswordSection.set(true);
      this.accountLoading.set(false);
      await this.loadData();
    } else {
      this.formError.set(result.error || 'Error al crear la cuenta');
      this.accountLoading.set(false);
    }
  }

  protected async copyPasswordToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.generatedPassword());
      this.passwordCopied.set(true);
      setTimeout(() => this.passwordCopied.set(false), 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.formError.set('No se pudo copiar la contraseña');
    }
  }

  protected closeModalAfterAccountCreation(): void {
    if (!this.passwordCopied()) {
      const confirmed = confirm(
        '¿Estás seguro? No podrás ver la contraseña de nuevo. Asegúrate de copiarla.',
      );
      if (!confirmed) return;
    }
    this.closeModal();
  }

  protected async resetPassword(): Promise<void> {
    const teacher = this.editingTeacher();
    if (!teacher || !teacher.id || !teacher.userId) return;

    const confirmed = confirm(
      `¿Generar una nueva contraseña para "${teacher.fullName}"? La contraseña actual dejará de funcionar.`,
    );
    if (!confirmed) return;

    this.accountLoading.set(true);
    this.formError.set('');

    // Generate new password
    const newPassword = this.teacherAccountService.generateRandomPassword();

    // Call Cloud Function to reset password
    const result = await this.teacherAccountService.resetTeacherPassword(
      teacher.userId,
      teacher.id,
      newPassword,
    );

    if (result.success) {
      // Show the new password
      this.generatedPassword.set(newPassword);
      this.showPasswordSection.set(true);
      this.passwordCopied.set(false);
      this.accountLoading.set(false);
    } else {
      this.formError.set(result.error || 'Error al restablecer la contraseña');
      this.accountLoading.set(false);
    }
  }

  protected async deleteTeacher(teacher: Teacher): Promise<void> {
    if (!teacher.id) return;

    if (confirm(`¿Estás seguro de eliminar a "${teacher.fullName}"?`)) {
      await this.teacherService.deleteTeacher(teacher.id, teacher.fullName);
      await this.loadData();
    }
  }

  protected async toggleStatus(teacher: Teacher): Promise<void> {
    if (!teacher.id) return;
    const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
    await this.teacherService.updateTeacherStatus(teacher.id, newStatus, teacher.fullName);
    await this.loadData();
  }

  protected getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  protected getSubjectName(subjectId: string): string {
    return this.subjects().find((s) => s.id === subjectId)?.name || 'Desconocida';
  }

  protected getSubjectColor(subjectId: string): string {
    return this.subjects().find((s) => s.id === subjectId)?.color || '#6B7280';
  }

  protected getStatusLabel(status: 'active' | 'inactive'): string {
    return status === 'active' ? 'Activo' : 'Inactivo';
  }

  protected getStatusClass(status: 'active' | 'inactive'): string {
    return status === 'active'
      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
      : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
}
