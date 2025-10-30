import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardOverview } from './dashboard/dashboard';
import { ClassesTab } from './classes/classes';
import { TeachersTab } from './teachers/teachers';
import { StudentsTab } from './students/students';
import { ReportsTab } from './reports/reports';
import { SidebarNav, NavItem, UserInfo } from '../../shared/ui/sidebar-nav/sidebar-nav';

type TabName = 'dashboard' | 'classes' | 'teachers' | 'students' | 'reports';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    DashboardOverview,
    ClassesTab,
    TeachersTab,
    StudentsTab,
    ReportsTab,
    SidebarNav,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.sass',
})
export class AdminDashboard {
  protected activeTab = signal<TabName>('dashboard');

  protected readonly navItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel Principal', icon: 'dashboard' },
    { id: 'classes', label: 'Clases', icon: 'school' },
    { id: 'teachers', label: 'Profesores', icon: 'person' },
    { id: 'students', label: 'Estudiantes', icon: 'groups' },
    { id: 'reports', label: 'Reportes', icon: 'assessment' },
  ];

  protected readonly userInfo: UserInfo = {
    name: 'Administrador',
    subtitle: 'Ver perfil',
  };

  protected onNavItemClick(itemId: string): void {
    this.activeTab.set(itemId as TabName);
  }

  protected onUserClick(): void {
    // TODO: Navigate to user profile or show menu
    console.log('User clicked');
  }
}
