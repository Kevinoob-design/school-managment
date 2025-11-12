import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import {
  ActivityLoggerService,
  Activity,
  ActivityType,
  ActivityEntity,
} from '../../../shared/services/activity-logger.service';

@Component({
  selector: 'app-activities-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './activities.html',
  styleUrl: './activities.sass',
})
export class ActivitiesTab implements OnInit {
  private readonly activityLogger = inject(ActivityLoggerService);

  protected activities = signal<Activity[]>([]);
  protected loading = signal(true);
  protected hasMore = signal(true);

  // Filters
  protected searchQuery = signal('');
  protected filterType = signal<'all' | ActivityType>('all');
  protected filterEntity = signal<'all' | ActivityEntity>('all');
  protected startDate = signal('');
  protected endDate = signal('');

  protected readonly typeOptions: { value: 'all' | ActivityType; label: string }[] = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'create', label: 'Creación' },
    { value: 'update', label: 'Actualización' },
    { value: 'delete', label: 'Eliminación' },
    { value: 'status_change', label: 'Cambio de Estado' },
    { value: 'enrollment', label: 'Inscripción' },
    { value: 'assignment', label: 'Asignación' },
  ];

  protected readonly entityOptions: { value: 'all' | ActivityEntity; label: string }[] = [
    { value: 'all', label: 'Todas las entidades' },
    { value: 'student', label: 'Estudiantes' },
    { value: 'teacher', label: 'Profesores' },
    { value: 'class', label: 'Clases' },
    { value: 'grade_level', label: 'Niveles Académicos' },
    { value: 'subject', label: 'Asignaturas' },
    { value: 'user', label: 'Usuarios' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadActivities();
  }

  protected async loadActivities(append = false): Promise<void> {
    if (!append) {
      this.loading.set(true);
    }

    const filters: {
      type?: ActivityType;
      entity?: ActivityEntity;
      startDate?: number;
      endDate?: number;
    } = {};

    if (this.filterType() !== 'all') {
      filters.type = this.filterType() as ActivityType;
    }

    if (this.filterEntity() !== 'all') {
      filters.entity = this.filterEntity() as ActivityEntity;
    }

    if (this.startDate()) {
      filters.startDate = new Date(this.startDate()).getTime();
    }

    if (this.endDate()) {
      filters.endDate = new Date(this.endDate()).getTime();
    }

    const newActivities = await this.activityLogger.getActivities(filters, 50);

    if (append) {
      this.activities.update((current) => [...current, ...newActivities]);
    } else {
      this.activities.set(newActivities);
    }

    this.hasMore.set(newActivities.length >= 50);
    this.loading.set(false);
  }

  protected filteredActivities = (): Activity[] => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.activities();

    return this.activities().filter(
      (activity) =>
        activity.description.toLowerCase().includes(query) ||
        activity.userName.toLowerCase().includes(query) ||
        activity.userEmail.toLowerCase().includes(query) ||
        activity.entityName.toLowerCase().includes(query),
    );
  };

  protected async applyFilters(): Promise<void> {
    await this.loadActivities(false);
  }

  protected async clearFilters(): Promise<void> {
    this.filterType.set('all');
    this.filterEntity.set('all');
    this.startDate.set('');
    this.endDate.set('');
    this.searchQuery.set('');
    await this.loadActivities(false);
  }

  protected async loadMore(): Promise<void> {
    await this.loadActivities(true);
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
    return this.typeOptions.find((opt) => opt.value === type)?.label || 'Desconocido';
  }

  protected getEntityLabel(entity: ActivityEntity): string {
    return this.entityOptions.find((opt) => opt.value === entity)?.label || 'Desconocido';
  }

  protected formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatShortDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
