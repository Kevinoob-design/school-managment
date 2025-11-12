import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import { ClassService, Class, ClassSchedule } from '../../../shared/services/class.service';
import { GradeLevelService, GradeLevel } from '../../../shared/services/grade-level.service';
import { SubjectService, Subject } from '../../../shared/services/subject.service';
import { TeacherService, Teacher } from '../../../shared/services/teacher.service';

@Component({
  selector: 'app-classes-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './classes.html',
  styleUrl: './classes.sass',
})
export class ClassesTab implements OnInit {
  private readonly classService = inject(ClassService);
  private readonly gradeLevelService = inject(GradeLevelService);
  private readonly subjectService = inject(SubjectService);
  private readonly teacherService = inject(TeacherService);

  protected classes = signal<Class[]>([]);
  protected gradeLevels = signal<GradeLevel[]>([]);
  protected subjects = signal<Subject[]>([]);
  protected teachers = signal<Teacher[]>([]);
  protected loading = signal(true);
  protected showModal = signal(false);
  protected editingClass = signal<Class | null>(null);

  // Form fields
  protected className = signal('');
  protected selectedGradeLevelId = signal('');
  protected selectedSubjectId = signal('');
  protected section = signal('');
  protected selectedTeacherId = signal('');
  protected maxStudents = signal('');
  protected academicYear = signal('');
  protected semester = signal(1);
  protected schedule = signal<ClassSchedule[]>([]);
  protected formError = signal('');

  protected readonly dayOptions = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miércoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sábado', label: 'Sábado' },
  ];

  protected readonly sectionOptions = ['A', 'B', 'C', 'D', 'E'];

  async ngOnInit(): Promise<void> {
    await this.loadData();
    this.academicYear.set(this.classService.getCurrentAcademicYear());
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    const [classes, gradeLevels, subjects, teachers] = await Promise.all([
      this.classService.getClasses(),
      this.gradeLevelService.getActiveGradeLevels(),
      this.subjectService.getActiveSubjects(),
      this.teacherService.getTeachers(),
    ]);
    this.classes.set(classes);
    this.gradeLevels.set(gradeLevels);
    this.subjects.set(subjects);
    this.teachers.set(teachers);
    this.loading.set(false);
  }

  public openAddModal(): void {
    this.resetForm();
    this.editingClass.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(classItem: Class): void {
    this.editingClass.set(classItem);
    this.className.set(classItem.className);
    this.selectedGradeLevelId.set(classItem.gradeLevelId);
    this.selectedSubjectId.set(classItem.subjectId);
    this.section.set(classItem.section);
    this.selectedTeacherId.set(classItem.teacherId || '');
    this.maxStudents.set(classItem.maxStudents.toString());
    this.academicYear.set(classItem.academicYear);
    this.semester.set(classItem.semester);
    this.schedule.set([...classItem.schedule]);
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.className.set('');
    this.selectedGradeLevelId.set('');
    this.selectedSubjectId.set('');
    this.section.set('');
    this.selectedTeacherId.set('');
    this.maxStudents.set('30');
    this.academicYear.set(this.classService.getCurrentAcademicYear());
    this.semester.set(1);
    this.schedule.set([]);
    this.formError.set('');
  }

  protected addScheduleSlot(): void {
    const newSlot: ClassSchedule = {
      day: 'lunes',
      startTime: '08:00',
      endTime: '09:30',
      room: '',
    };
    this.schedule.update((current) => [...current, newSlot]);
  }

  protected removeScheduleSlot(index: number): void {
    this.schedule.update((current) => current.filter((_, i) => i !== index));
  }

  protected updateScheduleSlot(index: number, field: keyof ClassSchedule, value: string): void {
    this.schedule.update((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  protected getFilteredSubjects(): Subject[] {
    const gradeLevelId = this.selectedGradeLevelId();
    if (!gradeLevelId) return this.subjects();
    return this.subjects().filter((s) => s.gradeLevelIds.includes(gradeLevelId));
  }

  protected async saveClass(): Promise<void> {
    // Validation
    if (
      !this.className().trim() ||
      !this.selectedGradeLevelId() ||
      !this.selectedSubjectId() ||
      !this.section() ||
      !this.maxStudents()
    ) {
      this.formError.set('Nombre, nivel, asignatura, sección y capacidad son requeridos');
      return;
    }

    const maxStudentsNum = parseInt(this.maxStudents());
    if (isNaN(maxStudentsNum) || maxStudentsNum < 1) {
      this.formError.set('La capacidad debe ser un número positivo');
      return;
    }

    if (this.schedule().length === 0) {
      this.formError.set('Agrega al menos un horario');
      return;
    }

    const classData = {
      className: this.className().trim(),
      gradeLevelId: this.selectedGradeLevelId(),
      subjectId: this.selectedSubjectId(),
      section: this.section(),
      teacherId: this.selectedTeacherId() || undefined,
      maxStudents: maxStudentsNum,
      academicYear: this.academicYear(),
      semester: this.semester(),
      schedule: this.schedule(),
      status: 'active' as const,
    };

    try {
      const editing = this.editingClass();
      if (editing && editing.id) {
        await this.classService.updateClass(editing.id, classData);
      } else {
        await this.classService.addClass(classData);
      }

      await this.loadData();
      this.closeModal();
    } catch (error) {
      this.formError.set('Error al guardar la clase');
      console.error(error);
    }
  }

  protected async deleteClass(classItem: Class): Promise<void> {
    if (!classItem.id) return;

    if (confirm(`¿Estás seguro de eliminar "${classItem.className}"?`)) {
      await this.classService.deleteClass(classItem.id);
      await this.loadData();
    }
  }

  protected async toggleStatus(classItem: Class): Promise<void> {
    if (!classItem.id) return;
    const newStatus = classItem.status === 'active' ? 'cancelled' : 'active';
    await this.classService.updateClassStatus(classItem.id, newStatus);
    await this.loadData();
  }

  protected getGradeLevelName(gradeLevelId: string): string {
    return this.gradeLevels().find((gl) => gl.id === gradeLevelId)?.name || 'N/A';
  }

  protected getSubjectName(subjectId: string): string {
    return this.subjects().find((s) => s.id === subjectId)?.name || 'N/A';
  }

  protected getSubjectColor(subjectId: string): string {
    return this.subjects().find((s) => s.id === subjectId)?.color || '#6B7280';
  }

  protected getTeacherName(teacherId?: string): string {
    if (!teacherId) return 'Sin asignar';
    return this.teachers().find((t) => t.id === teacherId)?.fullName || 'N/A';
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  protected getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  protected formatSchedule(schedule: ClassSchedule[]): string {
    if (schedule.length === 0) return 'Sin horario';
    return schedule.map((s) => `${s.day.substring(0, 3)} ${s.startTime}-${s.endTime}`).join(', ');
  }
}
