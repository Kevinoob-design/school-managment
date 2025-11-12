import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardOverview } from './dashboard/dashboard';
import { GradeLevelsTab } from './grade-levels/grade-levels';
import { SubjectsTab } from './subjects/subjects';
import { ClassesTab } from './classes/classes';
import { TeachersTab } from './teachers/teachers';
import { StudentsTab } from './students/students';
import { ActivitiesTab } from './activities/activities';
import { ReportsTab } from './reports/reports';
import { SidebarNav, NavItem, UserInfo } from '../../shared/ui/sidebar-nav/sidebar-nav';

type TabName =
  | 'dashboard'
  | 'grade-levels'
  | 'subjects'
  | 'classes'
  | 'teachers'
  | 'students'
  | 'activities'
  | 'reports';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    DashboardOverview,
    GradeLevelsTab,
    SubjectsTab,
    ClassesTab,
    TeachersTab,
    StudentsTab,
    ActivitiesTab,
    ReportsTab,
    SidebarNav,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.sass',
})
export class AdminDashboard {
  protected activeTab = signal<TabName>('dashboard');

  @ViewChild(ClassesTab) classesTab?: ClassesTab;
  @ViewChild(TeachersTab) teachersTab?: TeachersTab;
  @ViewChild(StudentsTab) studentsTab?: StudentsTab;

  protected readonly navItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel Principal', icon: 'dashboard' },
    { id: 'grade-levels', label: 'Niveles Académicos', icon: 'stairs' },
    { id: 'subjects', label: 'Asignaturas', icon: 'book' },
    { id: 'classes', label: 'Clases', icon: 'school' },
    { id: 'teachers', label: 'Profesores', icon: 'person' },
    { id: 'students', label: 'Estudiantes', icon: 'groups' },
    { id: 'activities', label: 'Actividades', icon: 'history' },
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

  // Quick action handlers for dashboard
  protected handleAddClass(): void {
    this.activeTab.set('classes');
    setTimeout(() => {
      this.classesTab?.openAddModal();
    }, 0);
  }

  protected handleEnrollStudent(): void {
    this.activeTab.set('students');
    setTimeout(() => {
      this.studentsTab?.openAddModal();
    }, 0);
  }

  protected handleAddTeacher(): void {
    this.activeTab.set('teachers');
    setTimeout(() => {
      this.teachersTab?.openAddModal();
    }, 0);
  }

  // Navigation handlers for counter cards
  protected navigateToTab(tab: TabName): void {
    this.activeTab.set(tab);
  }

  protected navigateToActivities(): void {
    this.activeTab.set('activities');
  }
}
