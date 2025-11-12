import { Component, inject, signal, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DashboardService,
  DashboardStats,
  RecentActivity,
} from '../../../shared/services/dashboard.service';
import { ActivityType } from '../../../shared/services/activity-logger.service';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-dashboard-overview',
  imports: [CommonModule, Button],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.sass',
})
export class DashboardOverview implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  // Output events for quick actions
  addClassAction = output<void>();
  enrollStudentAction = output<void>();
  addTeacherAction = output<void>();

  // Output events for navigation
  navigateToClasses = output<void>();
  navigateToTeachers = output<void>();
  navigateToStudents = output<void>();
  navigateToActivities = output<void>();

  protected stats = signal<DashboardStats>({
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
  });

  protected activities = signal<RecentActivity[]>([]);
  protected loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      this.loading.set(true);
      const [stats, activities] = await Promise.all([
        this.dashboardService.getDashboardStats(),
        this.dashboardService.getRecentActivities(10),
      ]);
      this.stats.set(stats);
      this.activities.set(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  protected onAddClass(): void {
    this.addClassAction.emit();
  }

  protected onEnrollStudent(): void {
    this.enrollStudentAction.emit();
  }

  protected onAddTeacher(): void {
    this.addTeacherAction.emit();
  }

  protected onNavigateToClasses(): void {
    this.navigateToClasses.emit();
  }

  protected onNavigateToTeachers(): void {
    this.navigateToTeachers.emit();
  }

  protected onNavigateToStudents(): void {
    this.navigateToStudents.emit();
  }

  protected onViewAllActivities(): void {
    this.navigateToActivities.emit();
  }

  protected getTypeClass(type: ActivityType): string {
    switch (type) {
      case 'create':
      case 'enrollment':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'status_change':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'assignment':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  protected getTypeLabel(type: ActivityType): string {
    switch (type) {
      case 'create':
        return 'Creación';
      case 'update':
        return 'Actualización';
      case 'delete':
        return 'Eliminación';
      case 'status_change':
        return 'Cambio de Estado';
      case 'enrollment':
        return 'Inscripción';
      case 'assignment':
        return 'Asignación';
      default:
        return 'Desconocido';
    }
  }

  protected formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
