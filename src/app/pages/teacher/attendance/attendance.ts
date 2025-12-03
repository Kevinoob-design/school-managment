import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Button } from '../../../shared/ui/button/button';
import { ClassService, Class } from '../../../shared/services/class.service';
import { EnrollmentService } from '../../../shared/services/enrollment.service';
import { StudentService } from '../../../shared/services/student.service';
import {
  AttendanceService,
  AttendanceRecord,
  AttendanceStatus,
} from '../../../shared/services/attendance.service';
import { TeacherDataService } from '../../../shared/services/teacher-data.service';

interface StudentAttendance {
  id: string;
  fullName: string;
  email: string;
  attendanceStatus: AttendanceStatus;
  notes: string;
}

@Component({
  selector: 'app-teacher-attendance',
  imports: [Button],
  templateUrl: './attendance.html',
  styleUrl: './attendance.sass',
})
export class TeacherAttendanceTab implements OnInit {
  private readonly classService = inject(ClassService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly studentService = inject(StudentService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly teacherDataService = inject(TeacherDataService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly classes = signal<Class[]>([]);
  protected readonly selectedClass = signal<Class | null>(null);
  protected readonly selectedDate = signal(this.attendanceService.getTodayDate());
  protected readonly students = signal<StudentAttendance[]>([]);
  protected readonly showHistory = signal(false);
  protected readonly historyRecords = signal<AttendanceRecord[]>([]);
  protected readonly historyLoading = signal(false);

  protected readonly statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
    { value: 'present', label: 'Presente', color: 'bg-green-100 text-green-700' },
    { value: 'absent', label: 'Ausente', color: 'bg-red-100 text-red-700' },
    { value: 'late', label: 'Tarde', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'excused', label: 'Justificado', color: 'bg-blue-100 text-blue-700' },
  ];

  protected readonly statistics = computed(() => {
    const students = this.students();
    if (students.length === 0) return { present: 0, absent: 0, late: 0, excused: 0 };

    return {
      present: students.filter((s) => s.attendanceStatus === 'present').length,
      absent: students.filter((s) => s.attendanceStatus === 'absent').length,
      late: students.filter((s) => s.attendanceStatus === 'late').length,
      excused: students.filter((s) => s.attendanceStatus === 'excused').length,
    };
  });

  protected readonly canSave = computed(() => {
    return !this.saving() && this.selectedClass() !== null && this.students().length > 0;
  });

  async ngOnInit(): Promise<void> {
    await this.loadClasses();
  }

  private async loadClasses(): Promise<void> {
    this.loading.set(true);
    try {
      const teacher = await this.teacherDataService.getCurrentTeacherProfile();
      if (!teacher?.id) return;

      const classes = await this.classService.getClassesByTeacher(teacher.id);
      const activeClasses = classes.filter((c) => c.status === 'active');
      this.classes.set(activeClasses);

      if (activeClasses.length > 0) {
        await this.selectClass(activeClasses[0]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async selectClass(cls: Class): Promise<void> {
    this.selectedClass.set(cls);
    this.loading.set(true);
    try {
      await this.loadAttendance();
    } finally {
      this.loading.set(false);
    }
  }

  protected async changeDate(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.selectedDate.set(input.value);
    if (this.selectedClass()) {
      await this.loadAttendance();
    }
  }

  private async loadAttendance(): Promise<void> {
    if (!this.selectedClass()?.id) return;

    // Get enrolled students
    const enrollments = await this.enrollmentService.getClassEnrollments(this.selectedClass()!.id!);
    const allStudents = await this.studentService.getStudents();

    // Get attendance records for selected date
    const attendanceRecords = await this.attendanceService.getAttendanceByClass(
      this.selectedClass()!.id!,
      this.selectedDate(),
    );

    // Build student list with current attendance status
    const studentsWithAttendance: StudentAttendance[] = [];
    for (const enrollment of enrollments) {
      const student = allStudents.find((s) => s.id === enrollment.studentId);
      if (!student) continue;

      const record = attendanceRecords.find((r: AttendanceRecord) => r.studentId === student.id);

      studentsWithAttendance.push({
        id: student.id!,
        fullName: student.fullName,
        email: student.email,
        attendanceStatus: record?.status || 'present', // Default to present
        notes: record?.notes || '',
      });
    }

    this.students.set(studentsWithAttendance.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  protected setStudentStatus(studentId: string, status: AttendanceStatus): void {
    const students = this.students();
    const index = students.findIndex((s) => s.id === studentId);
    if (index !== -1) {
      const updated = [...students];
      updated[index] = { ...updated[index], attendanceStatus: status };
      this.students.set(updated);
    }
  }

  protected setStudentNotes(studentId: string, notes: string): void {
    const students = this.students();
    const index = students.findIndex((s) => s.id === studentId);
    if (index !== -1) {
      const updated = [...students];
      updated[index] = { ...updated[index], notes };
      this.students.set(updated);
    }
  }

  protected setAllStatus(status: AttendanceStatus): void {
    const updated = this.students().map((s) => ({ ...s, attendanceStatus: status }));
    this.students.set(updated);
  }

  protected async saveAttendance(): Promise<void> {
    if (!this.canSave()) return;

    const teacher = await this.teacherDataService.getCurrentTeacherProfile();
    if (!teacher?.id || !this.selectedClass()?.id) return;

    this.saving.set(true);
    try {
      const records = this.students().map((student) => ({
        classId: this.selectedClass()!.id!,
        studentId: student.id!,
        teacherId: teacher.id!,
        date: this.selectedDate(),
        status: student.attendanceStatus,
        notes: student.notes || undefined,
      }));

      await this.attendanceService.recordAttendance(records);
      alert('Asistencia guardada exitosamente');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error al guardar la asistencia');
    } finally {
      this.saving.set(false);
    }
  }

  protected async loadHistory(): Promise<void> {
    if (!this.selectedClass()?.id) return;

    this.historyLoading.set(true);
    this.showHistory.set(true);
    try {
      // Get all records for all dates for this class
      // We'll need to query multiple dates or modify the service
      // For now, just show records for the selected date
      const records = await this.attendanceService.getAttendanceByClass(
        this.selectedClass()!.id!,
        this.selectedDate(),
      );
      this.historyRecords.set(records);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      this.historyLoading.set(false);
    }
  }

  protected closeHistory(): void {
    this.showHistory.set(false);
    this.historyRecords.set([]);
  }

  protected getStatusColor(status: AttendanceStatus): string {
    return this.attendanceService.getStatusColor(status);
  }

  protected getStatusLabel(status: AttendanceStatus): string {
    return this.attendanceService.getStatusLabel(status);
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
