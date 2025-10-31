import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DashboardService,
  DashboardStats,
  RecentActivity,
} from '../../../shared/services/dashboard.service';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-dashboard-overview',
  imports: [CommonModule, Button],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.sass',
})
export class DashboardOverview implements OnInit {
  private readonly dashboardService = inject(DashboardService);

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
    // TODO: Navigate to add class form or open modal
    console.log('Add new class');
  }

  protected onEnrollStudent(): void {
    // TODO: Navigate to enroll student form or open modal
    console.log('Enroll student');
  }

  protected onAddTeacher(): void {
    // TODO: Navigate to add teacher form or open modal
    console.log('Add teacher');
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'completado':
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
      case 'inactivo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
