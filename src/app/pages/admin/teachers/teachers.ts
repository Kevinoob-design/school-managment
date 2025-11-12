import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import { TeacherService, Teacher } from '../../../shared/services/teacher.service';
import { SubjectService, Subject } from '../../../shared/services/subject.service';

@Component({
  selector: 'app-teachers-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './teachers.html',
  styleUrl: './teachers.sass',
})
export class TeachersTab implements OnInit {
  private readonly teacherService = inject(TeacherService);
  private readonly subjectService = inject(SubjectService);

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
      } else {
        await this.teacherService.addTeacher(teacherData);
      }

      await this.loadData();
      this.closeModal();
    } catch (error) {
      this.formError.set('Error al guardar el profesor');
      console.error(error);
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
