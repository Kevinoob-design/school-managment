import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import {
  ReportsService,
  ReportSummary,
  ActivityMetrics,
  EnrollmentMetrics,
  TeacherMetrics,
  ActivityTrend,
} from '../../../shared/services/reports.service';

@Component({
  selector: 'app-reports-tab',
  imports: [CommonModule, Button],
  templateUrl: './reports.html',
  styleUrl: './reports.sass',
})
export class ReportsTab implements OnInit {
  private readonly reportsService = inject(ReportsService);

  protected loading = signal(true);
  protected summary = signal<ReportSummary | null>(null);
  protected activityMetrics = signal<ActivityMetrics | null>(null);
  protected enrollmentMetrics = signal<EnrollmentMetrics | null>(null);
  protected teacherMetrics = signal<TeacherMetrics | null>(null);
  protected activityTrend = signal<ActivityTrend | null>(null);

  // Computed values for visualizations
  protected studentStatusPercentage = computed(() => {
    const s = this.summary();
    if (!s || s.totalStudents === 0) return { active: 0, inactive: 0 };
    return {
      active: Math.round((s.activeStudents / s.totalStudents) * 100),
      inactive: Math.round((s.inactiveStudents / s.totalStudents) * 100),
    };
  });

  protected teacherStatusPercentage = computed(() => {
    const s = this.summary();
    if (!s || s.totalTeachers === 0) return { active: 0, inactive: 0 };
    return {
      active: Math.round((s.activeTeachers / s.totalTeachers) * 100),
      inactive: Math.round((s.inactiveTeachers / s.totalTeachers) * 100),
    };
  });

  protected teacherDistribution = computed(() => {
    const t = this.teacherMetrics();
    if (!t) return { withClasses: 0, withoutClasses: 0 };
    const total = t.teachersWithClasses + t.teachersWithoutClasses;
    if (total === 0) return { withClasses: 0, withoutClasses: 0 };
    return {
      withClasses: Math.round((t.teachersWithClasses / total) * 100),
      withoutClasses: Math.round((t.teachersWithoutClasses / total) * 100),
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadReports();
  }

  private async loadReports(): Promise<void> {
    try {
      this.loading.set(true);
      // Use allSettled to allow partial success
      const results = await Promise.allSettled([
        this.reportsService.getReportSummary(),
        this.reportsService.getActivityMetrics(),
        this.reportsService.getEnrollmentMetrics(),
        this.reportsService.getTeacherMetrics(),
        this.reportsService.getActivityTrend(),
      ]);

      // Process successful results
      if (results[0].status === 'fulfilled') {
        this.summary.set(results[0].value);
      } else {
        console.error('Error loading summary:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        this.activityMetrics.set(results[1].value);
      } else {
        console.error('Error loading activity metrics:', results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        this.enrollmentMetrics.set(results[2].value);
      } else {
        console.error('Error loading enrollment metrics:', results[2].reason);
      }

      if (results[3].status === 'fulfilled') {
        this.teacherMetrics.set(results[3].value);
      } else {
        console.error('Error loading teacher metrics:', results[3].reason);
      }

      if (results[4].status === 'fulfilled') {
        this.activityTrend.set(results[4].value);
      } else {
        console.error('Error loading activity trend:', results[4].reason);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async refreshReports(): Promise<void> {
    await this.loadReports();
  }

  protected getActivityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      create: 'Creación',
      update: 'Actualización',
      delete: 'Eliminación',
      status_change: 'Cambio de Estado',
      enrollment: 'Inscripción',
      assignment: 'Asignación',
    };
    return labels[type] || type;
  }

  protected getEntityLabel(entity: string): string {
    const labels: Record<string, string> = {
      student: 'Estudiantes',
      teacher: 'Profesores',
      class: 'Clases',
      grade_level: 'Niveles',
      subject: 'Asignaturas',
      user: 'Usuarios',
    };
    return labels[entity] || entity;
  }

  protected getBarWidth(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.round((value / max) * 100);
  }

  protected getActivityTypeEntries(): { type: string; count: number }[] {
    const metrics = this.activityMetrics();
    if (!metrics) return [];
    return Object.entries(metrics.activitiesByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  protected getEntityEntries(): { entity: string; count: number }[] {
    const metrics = this.activityMetrics();
    if (!metrics) return [];
    return Object.entries(metrics.activitiesByEntity)
      .map(([entity, count]) => ({ entity, count }))
      .sort((a, b) => b.count - a.count);
  }
}
