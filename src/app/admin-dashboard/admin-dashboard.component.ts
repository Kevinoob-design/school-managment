import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

interface NavItem {
  icon: string;
  label: string;
  active?: boolean;
}

interface MetricCard {
  label: string;
  value: string;
  icon: string;
  caption: string;
  accent: 'blue' | 'green' | 'purple';
}

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  tone: 'primary' | 'light';
}

interface ActivityRow {
  activity: string;
  owner: string;
  date: string;
  status: 'Completado' | 'Pendiente' | 'Programado';
}

interface StaffAlert {
  title: string;
  description: string;
  icon: string;
  severity: 'info' | 'warning';
}

interface ResourceCard {
  title: string;
  value: string;
  deltaLabel: string;
  deltaValue: string;
  positive: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [NgClass, NgFor, NgIf],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.sass',
})
export class AdminDashboardComponent {
  protected readonly sidebarOpen = signal(true);

  protected readonly navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', active: true },
    { icon: 'menu_book', label: 'Clases' },
    { icon: 'groups', label: 'Docentes' },
    { icon: 'school', label: 'Estudiantes' },
    { icon: 'assessment', label: 'Reportes' },
  ];

  protected readonly metricCards: MetricCard[] = [
    {
      label: 'Total clases activas',
      value: '25',
      icon: 'menu_book',
      caption: '+2 frente al mes pasado',
      accent: 'blue',
    },
    {
      label: 'Docentes registrados',
      value: '15',
      icon: 'groups',
      caption: '3 nuevas incorporaciones',
      accent: 'green',
    },
    {
      label: 'Estudiantes matriculados',
      value: '300',
      icon: 'school',
      caption: 'Inscripciones cerradas',
      accent: 'purple',
    },
  ];

  protected readonly quickActions: QuickAction[] = [
    {
      label: 'Crear clase',
      description: 'Configura horarios, docentes y cupos.',
      icon: 'add',
      tone: 'primary',
    },
    {
      label: 'Matricular estudiante',
      description: 'Completa el formulario de inscripcion.',
      icon: 'person_add',
      tone: 'light',
    },
    {
      label: 'Invitar docente',
      description: 'Envias un acceso con permisos limitados.',
      icon: 'mail',
      tone: 'light',
    },
  ];

  protected readonly recentActivity: ActivityRow[] = [
    {
      activity: 'Nuevo estudiante inscrito: Sofia Reyes',
      owner: 'Admin Central',
      date: '2024-03-15',
      status: 'Completado',
    },
    {
      activity: 'Actualizacion de horario 5to grado',
      owner: 'Admin Central',
      date: '2024-03-14',
      status: 'Programado',
    },
    {
      activity: 'Docente agregado: Carlos Medina',
      owner: 'Admin Central',
      date: '2024-03-12',
      status: 'Completado',
    },
    {
      activity: 'Reporte de asistencia Q1 generado',
      owner: 'Admin Central',
      date: '2024-03-11',
      status: 'Pendiente',
    },
  ];

  protected readonly staffAlerts: StaffAlert[] = [
    {
      title: 'Reunion administrativa',
      description: 'Coordina con direccion academica el seguimiento de evaluaciones.',
      icon: 'event',
      severity: 'info',
    },
    {
      title: 'Recordatorio de pagos',
      description: 'Enviar estado de cuentas a tutores antes del viernes.',
      icon: 'notifications',
      severity: 'warning',
    },
  ];

  protected readonly resourceCards: ResourceCard[] = [
    {
      title: 'Solicitudes pendientes',
      value: '12',
      deltaLabel: 'Resueltas hoy',
      deltaValue: '4',
      positive: true,
    },
    {
      title: 'Tickets abiertos',
      value: '6',
      deltaLabel: 'En seguimiento',
      deltaValue: '2',
      positive: false,
    },
  ];

  protected readonly supportContacts = [
    {
      name: 'Luisa Fernandez',
      role: 'Coordinadora academica',
      avatar: 'https://i.pravatar.cc/72?img=21',
      status: 'Disponible',
    },
    {
      name: 'Miguel Soto',
      role: 'Soporte TI',
      avatar: 'https://i.pravatar.cc/72?img=35',
      status: 'En linea',
    },
  ];

  protected readonly statusChips = computed(() => ({
    Completado: {
      label: 'Completado',
      class: 'bg-[#def6ec] text-[#1e8a5b] border border-[#b7e9d4]',
    },
    Pendiente: {
      label: 'Pendiente',
      class: 'bg-[#fff7db] text-[#aa7a00] border border-[#ffe8aa]',
    },
    Programado: {
      label: 'Programado',
      class: 'bg-[#e9edff] text-[#2f46c0] border border-[#ccd6ff]',
    },
  }));
}

