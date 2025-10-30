import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardOverview } from './dashboard/dashboard';
import { ClassesTab } from './classes/classes';
import { TeachersTab } from './teachers/teachers';
import { StudentsTab } from './students/students';
import { ReportsTab } from './reports/reports';

type TabName = 'dashboard' | 'classes' | 'teachers' | 'students' | 'reports';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, DashboardOverview, ClassesTab, TeachersTab, StudentsTab, ReportsTab],
  templateUrl: './admin.html',
  styleUrl: './admin.sass',
})
export class AdminDashboard {
  protected activeTab = signal<TabName>('dashboard');

  protected readonly tabs = [
    { id: 'dashboard' as TabName, label: 'Panel Principal', icon: 'dashboard' },
    { id: 'classes' as TabName, label: 'Clases', icon: 'school' },
    { id: 'teachers' as TabName, label: 'Profesores', icon: 'person' },
    { id: 'students' as TabName, label: 'Estudiantes', icon: 'groups' },
    { id: 'reports' as TabName, label: 'Reportes', icon: 'assessment' },
  ];

  protected setActiveTab(tab: TabName): void {
    this.activeTab.set(tab);
  }
}
