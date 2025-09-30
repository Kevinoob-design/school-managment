import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, signal } from '@angular/core';

interface GradeRow {
  subject: string;
  semester1: string;
  semester2: string;
  finalGrade: string;
  highlight?: boolean;
}

interface TeacherComment {
  teacher: string;
  subject: string;
  comment: string;
  date: string;
}

interface InsightCard {
  title: string;
  value: string;
  trendLabel: string;
  trendValue: string;
  trendPositive: boolean;
}

interface QuickAction {
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-parent-portal',
  standalone: true,
  imports: [NgClass, NgFor, NgIf],
  templateUrl: './parent-portal.component.html',
  styleUrl: './parent-portal.component.sass',
})
export class ParentPortalComponent {
  protected readonly academicYears = ['2023-2024', '2022-2023', '2021-2022'];
  protected readonly selectedYear = signal(this.academicYears[0]);

  protected readonly navItems = [
    { label: 'Dashboard', route: '#', active: false },
    { label: 'Clases', route: '#', active: false },
    { label: 'Calificaciones', route: '#', active: true },
    { label: 'Asistencia', route: '#', active: false },
    { label: 'Mensajes', route: '#', active: false },
  ];

  protected readonly insightCards: InsightCard[] = [
    {
      title: 'Promedio general',
      value: '3.8',
      trendLabel: 'vs. semestre anterior',
      trendValue: '+0.2',
      trendPositive: true,
    },
    {
      title: 'Asistencia acumulada',
      value: '95%',
      trendLabel: 'Ultimos 30 dias',
      trendValue: '-1%',
      trendPositive: false,
    },
    {
      title: 'Tareas a tiempo',
      value: '18/20',
      trendLabel: 'Esta semana',
      trendValue: '+3',
      trendPositive: true,
    },
  ];

  protected readonly grades: GradeRow[] = [
    { subject: 'Matematicas', semester1: 'A', semester2: 'A-', finalGrade: 'A', highlight: true },
    { subject: 'Lengua', semester1: 'B+', semester2: 'A', finalGrade: 'A-' },
    { subject: 'Ciencias', semester1: 'A-', semester2: 'B+', finalGrade: 'B+' },
    { subject: 'Historia', semester1: 'B', semester2: 'B', finalGrade: 'B' },
    { subject: 'Arte', semester1: 'A', semester2: 'A', finalGrade: 'A' },
  ];

  protected readonly teacherComments: TeacherComment[] = [
    {
      teacher: 'Prof. Hernandez',
      subject: 'Matematicas',
      comment:
        'Valentina demuestra una comprension solida de las fracciones y participa con confianza en clase. Continuar reforzando la practica en casa.',
      date: 'Hace 2 dias',
    },
    {
      teacher: 'Profa. Romero',
      subject: 'Lengua',
      comment:
        'Excelente progreso en lectura comprensiva. Recomiendo seguir leyendo 20 minutos diarios para mantener el ritmo.',
      date: 'Hace 1 semana',
    },
  ];

  protected readonly quickActions: QuickAction[] = [
    {
      label: 'Solicitar reunion',
      description: 'Agenda un encuentro con el docente tutor.',
      icon: 'event_available',
    },
    {
      label: 'Descargar boleta',
      description: 'Obtiene un PDF con las calificaciones del periodo.',
      icon: 'download',
    },
    {
      label: 'Enviar mensaje',
      description: 'Contacta rapidamente al profesorado desde el portal.',
      icon: 'mail',
    },
  ];

  protected readonly announcements = [
    {
      title: 'Entrega de proyectos de ciencias',
      description: 'Los alumnos presentaran sus maquetas este viernes a las 9:00 a.m.',
      timeLabel: 'En 3 dias',
    },
    {
      title: 'Reunion general de padres',
      description: 'Sesion informativa sobre cierre de trimestre y objetivos del proximo periodo.',
      timeLabel: '24 de octubre',
    },
  ];

  protected setAcademicYear(year: string) {
    this.selectedYear.set(year);
  }
}
