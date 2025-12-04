import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Section } from '../../shared/ui/section/section';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

@Component({
  selector: 'app-features',
  imports: [Button, Card, Section],
  templateUrl: './features.html',
  styleUrl: './features.sass',
})
export class FeaturesPage {
  protected readonly features = signal<Feature[]>([
    {
      id: '1',
      title: 'Gestión de Estudiantes',
      description:
        'Sistema completo para administrar información de estudiantes, desde inscripción hasta graduación.',
      icon: 'school',
      benefits: [
        'Registro de inscripción simplificado',
        'Historial académico completo',
        'Control de asistencia en tiempo real',
        'Gestión de documentos digitales',
      ],
    },
    {
      id: '2',
      title: 'Portal de Calificaciones',
      description:
        'Acceso instantáneo a calificaciones y evaluaciones con reportes detallados de progreso.',
      icon: 'grade',
      benefits: [
        'Calificaciones en tiempo real',
        'Reportes de progreso personalizados',
        'Seguimiento de competencias',
        'Análisis de rendimiento académico',
      ],
    },
    {
      id: '3',
      title: 'Comunicación Integrada',
      description:
        'Herramientas de mensajería y notificaciones para mantener conectada a la comunidad educativa.',
      icon: 'forum',
      benefits: [
        'Mensajería instantánea segura',
        'Notificaciones push automáticas',
        'Anuncios y circulares digitales',
        'Chat entre padres y maestros',
      ],
    },
    {
      id: '4',
      title: 'Gestión de Clases',
      description: 'Organiza horarios, materias y grupos de manera eficiente y automatizada.',
      icon: 'calendar_month',
      benefits: [
        'Creación automática de horarios',
        'Gestión de aulas y recursos',
        'Asignación de maestros',
        'Control de capacidad',
      ],
    },
    {
      id: '5',
      title: 'Reportes y Análisis',
      description:
        'Panel de análisis con métricas clave y reportes personalizables para tomar mejores decisiones.',
      icon: 'analytics',
      benefits: [
        'Dashboard con métricas en vivo',
        'Reportes personalizables',
        'Análisis de tendencias',
        'Exportación de datos',
      ],
    },
    {
      id: '6',
      title: 'Seguridad y Privacidad',
      description:
        'Protección de datos de nivel empresarial con cumplimiento de normativas educativas.',
      icon: 'security',
      benefits: [
        'Cifrado de extremo a extremo',
        'Control de acceso por roles',
        'Auditoría de actividades',
        'Cumplimiento GDPR',
      ],
    },
    {
      id: '7',
      title: 'Aplicación Móvil',
      description:
        'Acceso completo desde cualquier dispositivo con aplicaciones nativas iOS y Android.',
      icon: 'phone_android',
      benefits: [
        'Apps nativas iOS y Android',
        'Sincronización en tiempo real',
        'Modo offline disponible',
        'Notificaciones push',
      ],
    },
    {
      id: '8',
      title: 'Gestión Financiera',
      description: 'Control completo de pagos, colegiaturas y finanzas escolares.',
      icon: 'payments',
      benefits: [
        'Control de colegiaturas',
        'Pagos en línea',
        'Reportes financieros',
        'Facturación automática',
      ],
    },
  ]);

  private readonly router = inject(Router);

  protected async goSignUp(): Promise<void> {
    await this.router.navigate(['/signup']);
  }

  protected async goContact(): Promise<void> {
    await this.router.navigate(['/contact']);
  }
}
