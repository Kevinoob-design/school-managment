import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Section } from '../../shared/ui/section/section';
import { AuthService } from '../../shared/services/auth.service';
import { AnnouncementService, Announcement } from '../../shared/services/announcement.service';

interface UserType {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  link: string;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-landing',
  imports: [Button, Card, Section],
  templateUrl: './landing.html',
  styleUrl: './landing.sass',
})
export class Landing implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly announcementService = inject(AnnouncementService);
  
  protected readonly selectedAnnouncement = signal<Announcement | null>(null);
  protected readonly showDetailModal = signal(false);
  protected readonly userTypes = signal<UserType[]>([
    {
      id: 'school',
      title: 'Escuelas',
      description: 'Gestiona las operaciones, personal y estudiantes de tu escuela eficientemente',
      icon: 'school',
      features: [
        'Gestión de matrícula estudiantil',
        'Coordinación de personal y docentes',
        'Planificación del calendario académico',
        'Análisis de rendimiento',
      ],
      link: '/school/login',
    },
    {
      id: 'parent',
      title: 'Padres',
      description: 'Mantente conectado con el progreso educativo de tu hijo',
      icon: 'family_restroom',
      features: [
        'Seguimiento de calificaciones en tiempo real',
        'Monitoreo de asistencia',
        'Comunicación directa con maestros',
        'Notificaciones de eventos',
      ],
      link: '/parent/login',
    },

	{
		id: 'teacher',
		title: 'Maestros',
		description: 'Optimiza tus tareas docentes y administrativas',
		icon: 'co_present',
		features: [
			'Gestión de calificaciones y asignaciones',
			'Registro de asistencia',
			'Comunicación padres-maestros',
			'Planificación curricular',
		],
		link: '/auth',
	},
    {
      id: 'admin',
      title: 'Administradores',
      description: 'Herramientas completas de supervisión y gestión',
      icon: 'admin_panel_settings',
      features: [
        'Reportes del sistema',
        'Gestión de usuarios',
        'Configuración escolar',
        'Panel de análisis de datos',
      ],
      link: '/admin/login',
    },
  ]);

  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly announcementsLoading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadAnnouncements();
  }

  private async loadAnnouncements(): Promise<void> {
    this.announcementsLoading.set(true);
    try {
      const announcements = await this.announcementService.getPublicAnnouncements(3);
      this.announcements.set(announcements);
    } finally {
      this.announcementsLoading.set(false);
    }
  }
  protected readonly features = signal<Feature[]>([
    {
      id: '1',
      title: 'Actualizaciones en Tiempo Real',
      description:
        'Mantente informado con notificaciones instantáneas sobre calificaciones, asistencia y eventos',
      icon: 'notifications_active',
    },
    {
      id: '2',
      title: 'Plataforma Segura',
      description: 'Seguridad de nivel empresarial protegiendo tus datos educativos y privacidad',
      icon: 'security',
    },
    {
      id: '3',
      title: 'Comunicación Fácil',
      description: 'Mensajería fluida entre maestros, padres y administradores',
      icon: 'forum',
    },
    {
      id: '4',
      title: 'Panel de Análisis',
      description: 'Informes completos y análisis sobre el rendimiento académico',
      icon: 'analytics',
    },
  ]);

  protected getAnnouncementTypeClasses(type: string): string {
    const typeMap: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      event: 'bg-blue-100 text-blue-800',
      info: 'bg-green-100 text-green-800',
    };
    return typeMap[type] || typeMap['info'];
  }

  protected formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  }

  protected async goToAllAnnouncements(): Promise<void> {
    await this.router.navigate(['/announcements']);
  }

  protected openDetailModal(announcement: Announcement): void {
    this.selectedAnnouncement.set(announcement);
    this.showDetailModal.set(true);
  }

  protected closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedAnnouncement.set(null);
  }

  protected getTypeLabel(type: string): string {
    const labelMap: Record<string, string> = {
      urgent: 'Urgente',
      info: 'Información',
      event: 'Evento',
    };
    return labelMap[type] || type;
  }

  // Navigation handlers
  protected async goGetStarted(): Promise<void> {
    const user = this.auth.currentUser();
    if (user) {
      await this.navigateToRoleDashboard();
    } else {
      await this.router.navigate(['/signup']);
    }
  }

  protected async goSignUp(): Promise<void> {
    await this.router.navigate(['/signup']);
  }

  protected async goSignIn(): Promise<void> {
    await this.router.navigate(['/auth'], { queryParams: { mode: 'signin' } });
  }

  private async navigateToRoleDashboard(): Promise<void> {
    const role = this.auth.currentRole();
    switch (role) {
      case 'admin':
        await this.router.navigateByUrl('/admin');
        return;
      case 'teacher':
        await this.router.navigateByUrl('/teacher');
        return;
      case 'parent':
        await this.router.navigateByUrl('/parent');
        return;
      default:
        await this.router.navigate(['/auth'], { queryParams: { mode: 'signin' } });
    }
  }
}
