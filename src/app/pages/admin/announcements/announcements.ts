import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import { AnnouncementService, Announcement } from '../../../shared/services/announcement.service';

@Component({
  selector: 'app-announcements-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './announcements.html',
  styleUrl: './announcements.sass',
})
export class AnnouncementsTab implements OnInit {
  private readonly announcementService = inject(AnnouncementService);

  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly loading = signal(true);
  protected readonly showModal = signal(false);
  protected readonly editingAnnouncement = signal<Announcement | null>(null);
  protected readonly formError = signal('');

  // Form fields
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly excerpt = signal('');
  protected readonly date = signal(this.getTodayDate());
  protected readonly type = signal<'urgent' | 'info' | 'event'>('info');
  protected readonly targetAudience = signal<'all' | 'teachers' | 'parents' | 'students'>('all');
  protected readonly status = signal<'draft' | 'published' | 'archived'>('draft');

  // Search and filters
  protected readonly searchQuery = signal('');
  protected readonly filterStatus = signal<'all' | 'draft' | 'published' | 'archived'>('all');
  protected readonly filterType = signal<'all' | 'urgent' | 'info' | 'event'>('all');

  async ngOnInit(): Promise<void> {
    await this.loadAnnouncements();
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  protected async loadAnnouncements(): Promise<void> {
    this.loading.set(true);
    try {
      const announcements = await this.announcementService.getAnnouncements();
      this.announcements.set(announcements);
    } finally {
      this.loading.set(false);
    }
  }

  protected filteredAnnouncements = computed(() => {
    let filtered = this.announcements();

    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query),
      );
    }

    // Filter by status
    if (this.filterStatus() !== 'all') {
      filtered = filtered.filter((a) => a.status === this.filterStatus());
    }

    // Filter by type
    if (this.filterType() !== 'all') {
      filtered = filtered.filter((a) => a.type === this.filterType());
    }

    return filtered;
  });

  protected openAddModal(): void {
    this.resetForm();
    this.editingAnnouncement.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(announcement: Announcement): void {
    this.editingAnnouncement.set(announcement);
    this.title.set(announcement.title);
    this.content.set(announcement.content);
    this.excerpt.set(announcement.excerpt);
    this.date.set(announcement.date);
    this.type.set(announcement.type);
    this.targetAudience.set(announcement.targetAudience);
    this.status.set(announcement.status);
    this.formError.set('');
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.title.set('');
    this.content.set('');
    this.excerpt.set('');
    this.date.set(this.getTodayDate());
    this.type.set('info');
    this.targetAudience.set('all');
    this.status.set('draft');
    this.formError.set('');
  }

  protected isTitleValid(title: string): boolean {
    return title.trim().length >= 5;
  }

  protected isContentValid(content: string): boolean {
    return content.trim().length >= 20;
  }

  protected isDateValid(date: string): boolean {
    if (!date) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(date);
  }

  protected canSubmit = computed(() => {
    if (this.loading()) return false;
    const titleOk = this.isTitleValid(this.title());
    const contentOk = this.isContentValid(this.content());
    const dateOk = this.isDateValid(this.date());
    return titleOk && contentOk && dateOk;
  });

  protected updateExcerptFromContent(): void {
    const contentText = this.content().trim();
    if (contentText.length > 0 && this.excerpt().trim().length === 0) {
      const autoExcerpt =
        contentText.length > 150 ? contentText.substring(0, 147) + '...' : contentText;
      this.excerpt.set(autoExcerpt);
    }
  }

  protected async saveAnnouncement(): Promise<void> {
    if (!this.canSubmit()) {
      this.formError.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.loading.set(true);
    this.formError.set('');

    try {
      const announcementData = {
        title: this.title().trim(),
        content: this.content().trim(),
        excerpt: this.excerpt().trim() || this.content().trim().substring(0, 150),
        date: this.date(),
        type: this.type(),
        targetAudience: this.targetAudience(),
        status: this.status(),
      };

      if (this.editingAnnouncement()) {
        const success = await this.announcementService.updateAnnouncement(
          this.editingAnnouncement()!.id!,
          announcementData,
        );
        if (!success) {
          this.formError.set('Error al actualizar el anuncio');
          return;
        }
      } else {
        const id = await this.announcementService.createAnnouncement(announcementData);
        if (!id) {
          this.formError.set('Error al crear el anuncio');
          return;
        }
      }

      await this.loadAnnouncements();
      this.closeModal();
    } catch (error) {
      this.formError.set('Error al guardar el anuncio');
      console.error('Error saving announcement:', error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async deleteAnnouncement(announcement: Announcement): Promise<void> {
    if (!confirm(`¿Estás seguro de eliminar el anuncio "${announcement.title}"?`)) {
      return;
    }

    this.loading.set(true);
    try {
      const success = await this.announcementService.deleteAnnouncement(
        announcement.id!,
        announcement.title,
      );
      if (success) {
        await this.loadAnnouncements();
      } else {
        alert('Error al eliminar el anuncio');
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggleStatus(announcement: Announcement): Promise<void> {
    const newStatus: 'draft' | 'published' | 'archived' =
      announcement.status === 'published' ? 'draft' : 'published';

    this.loading.set(true);
    try {
      const success = await this.announcementService.updateAnnouncementStatus(
        announcement.id!,
        newStatus,
        announcement.title,
      );
      if (success) {
        await this.loadAnnouncements();
      } else {
        alert('Error al cambiar el estado del anuncio');
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected getTypeClass(type: string): string {
    const typeMap: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      event: 'bg-blue-100 text-blue-800',
      info: 'bg-green-100 text-green-800',
    };
    return typeMap[type] || typeMap['info'];
  }

  protected getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };
    return statusMap[status] || statusMap['draft'];
  }

  protected getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      draft: 'Borrador',
      published: 'Publicado',
      archived: 'Archivado',
    };
    return labelMap[status] || status;
  }

  protected getTypeLabel(type: string): string {
    const labelMap: Record<string, string> = {
      urgent: 'Urgente',
      info: 'Información',
      event: 'Evento',
    };
    return labelMap[type] || type;
  }

  protected getTargetAudienceLabel(target: string): string {
    const labelMap: Record<string, string> = {
      all: 'Todos',
      teachers: 'Profesores',
      parents: 'Padres',
      students: 'Estudiantes',
    };
    return labelMap[target] || target;
  }

  protected formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
}
