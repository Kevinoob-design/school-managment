import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import { StudentService, Student } from '../../../shared/services/student.service';
import { GradeLevelService, GradeLevel } from '../../../shared/services/grade-level.service';

@Component({
  selector: 'app-students-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './students.html',
  styleUrl: './students.sass',
})
export class StudentsTab implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly gradeLevelService = inject(GradeLevelService);

  protected students = signal<Student[]>([]);
  protected gradeLevels = signal<GradeLevel[]>([]);
  protected loading = signal(true);
  protected showModal = signal(false);
  protected editingStudent = signal<Student | null>(null);
  protected searchQuery = signal('');
  protected filterStatus = signal<'all' | 'active' | 'inactive'>('all');
  protected filterGradeLevel = signal('all');

  // Form fields
  protected fullName = signal('');
  protected dateOfBirth = signal('');
  protected email = signal('');
  protected phone = signal('');
  protected address = signal('');
  protected gradeLevel = signal('');
  protected parentName = signal('');
  protected parentEmail = signal('');
  protected parentPhone = signal('');
  protected emergencyContact = signal('');
  protected emergencyPhone = signal('');
  protected medicalNotes = signal('');
  protected status = signal<'active' | 'inactive'>('active');
  protected formError = signal('');

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadStudents(), this.loadGradeLevels()]);
  }

  private async loadStudents(): Promise<void> {
    this.loading.set(true);
    const students = await this.studentService.getStudents();
    this.students.set(students);
    this.loading.set(false);
  }

  private async loadGradeLevels(): Promise<void> {
    const levels = await this.gradeLevelService.getActiveGradeLevels();
    this.gradeLevels.set(levels);
  }

  protected filteredStudents = (): Student[] => {
    let filtered = this.students();

    // Filter by status
    if (this.filterStatus() !== 'all') {
      filtered = filtered.filter((s) => s.status === this.filterStatus());
    }

    // Filter by grade level
    if (this.filterGradeLevel() !== 'all') {
      filtered = filtered.filter((s) => s.gradeLevel === this.filterGradeLevel());
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.parentName.toLowerCase().includes(query) ||
          s.parentEmail.toLowerCase().includes(query),
      );
    }

    return filtered;
  };

  public openAddModal(): void {
    this.resetForm();
    this.editingStudent.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(student: Student): void {
    this.editingStudent.set(student);
    this.fullName.set(student.fullName);
    this.dateOfBirth.set(student.dateOfBirth);
    this.email.set(student.email);
    this.phone.set(student.phone);
    this.address.set(student.address);
    this.gradeLevel.set(student.gradeLevel);
    this.parentName.set(student.parentName);
    this.parentEmail.set(student.parentEmail);
    this.parentPhone.set(student.parentPhone);
    this.emergencyContact.set(student.emergencyContact);
    this.emergencyPhone.set(student.emergencyPhone);
    this.medicalNotes.set(student.medicalNotes || '');
    this.status.set(student.status);
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.fullName.set('');
    this.dateOfBirth.set('');
    this.email.set('');
    this.phone.set('');
    this.address.set('');
    this.gradeLevel.set('');
    this.parentName.set('');
    this.parentEmail.set('');
    this.parentPhone.set('');
    this.emergencyContact.set('');
    this.emergencyPhone.set('');
    this.medicalNotes.set('');
    this.status.set('active');
    this.formError.set('');
  }

  // Validation helpers
  protected isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected isPhoneValid(phone: string): boolean {
    // Check if phone matches (809) 555-5555 format
    return /\(\d{3}\) \d{3}-\d{4}/.test(phone);
  }

  protected onPhoneInput(raw: string, field: 'phone' | 'parentPhone' | 'emergencyPhone'): void {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length >= 1) {
      formatted = `(${digits.slice(0, 3)}`;
      if (digits.length >= 4) formatted += `) ${digits.slice(3, 6)}`;
      if (digits.length >= 7) formatted += `-${digits.slice(6, 10)}`;
    }
    if (digits.length < 1) formatted = '';
    
    if (field === 'phone') {
      this.phone.set(formatted);
    } else if (field === 'parentPhone') {
      this.parentPhone.set(formatted);
    } else if (field === 'emergencyPhone') {
      this.emergencyPhone.set(formatted);
    }
  }

  protected isDateValid(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  protected canSubmit = (): boolean => {
    if (this.loading()) return false;

    const fullNameOk = this.fullName().trim().length >= 2;
    const dateOk = this.isDateValid(this.dateOfBirth());
    const emailOk = this.isEmailValid(this.email().trim());
    const phoneOk = this.isPhoneValid(this.phone().trim());
    const addressOk = this.address().trim().length >= 5;
    const gradeLevelOk = this.gradeLevel().trim().length > 0;
    const parentNameOk = this.parentName().trim().length >= 2;
    const parentEmailOk = this.isEmailValid(this.parentEmail().trim());
    const parentPhoneOk = this.isPhoneValid(this.parentPhone().trim());
    const emergencyContactOk = this.emergencyContact().trim().length >= 2;
    const emergencyPhoneOk = this.isPhoneValid(this.emergencyPhone().trim());

    return (
      fullNameOk &&
      dateOk &&
      emailOk &&
      phoneOk &&
      addressOk &&
      gradeLevelOk &&
      parentNameOk &&
      parentEmailOk &&
      parentPhoneOk &&
      emergencyContactOk &&
      emergencyPhoneOk
    );
  };

  protected async saveStudent(): Promise<void> {
    if (!this.canSubmit()) {
      this.formError.set('Por favor completa todos los campos requeridos correctamente');
      return;
    }

    const studentData = {
      fullName: this.fullName().trim(),
      dateOfBirth: this.dateOfBirth(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      address: this.address().trim(),
      gradeLevel: this.gradeLevel(),
      parentName: this.parentName().trim(),
      parentEmail: this.parentEmail().trim(),
      parentPhone: this.parentPhone().trim(),
      emergencyContact: this.emergencyContact().trim(),
      emergencyPhone: this.emergencyPhone().trim(),
      medicalNotes: this.medicalNotes().trim(),
      status: this.status(),
    };

    try {
      const editing = this.editingStudent();
      if (editing && editing.id) {
        await this.studentService.updateStudent(editing.id, studentData);
      } else {
        await this.studentService.enrollStudent(studentData);
      }

      await this.loadStudents();
      this.closeModal();
    } catch (error) {
      this.formError.set('Error al guardar el estudiante');
      console.error(error);
    }
  }

  protected async deleteStudent(student: Student): Promise<void> {
    if (!student.id) return;

    if (confirm(`¿Estás seguro de eliminar a "${student.fullName}"?`)) {
      await this.studentService.deleteStudent(student.id, student.fullName);
      await this.loadStudents();
    }
  }

  protected async toggleStatus(student: Student): Promise<void> {
    if (!student.id) return;
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    await this.studentService.updateStudentStatus(student.id, newStatus, student.fullName);
    await this.loadStudents();
  }

  protected getStatusColor(status: 'active' | 'inactive'): string {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }

  protected getStatusLabel(status: 'active' | 'inactive'): string {
    return status === 'active' ? 'Activo' : 'Inactivo';
  }

  protected formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  protected getGradeLevelName(gradeLevelId: string): string {
    const level = this.gradeLevels().find((gl) => gl.id === gradeLevelId);
    return level?.name || gradeLevelId;
  }
}
