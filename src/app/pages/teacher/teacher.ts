import { Component, OnInit, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { TeacherClassesTab } from './classes/classes'
import { TeacherGradesTab } from './grades/grades'
import { TeacherAttendanceTab } from './attendance/attendance'
import { TeacherRequestsTab } from './requests/requests'
import { SidebarNav, NavItem } from '../../shared/ui/sidebar-nav/sidebar-nav'
import { Button } from '../../shared/ui/button/button'
import { TeacherDataService } from '../../shared/services/teacher-data.service'
import { AuthService } from '../../shared/services/auth.service'
import { Teacher } from '../../shared/services/teacher.service'

type TabName = 'classes' | 'grades' | 'attendance' | 'requests'

@Component({
	selector: 'app-teacher-dashboard',
	imports: [
		SidebarNav,
		TeacherClassesTab,
		TeacherGradesTab,
		TeacherAttendanceTab,
		TeacherRequestsTab,
		Button,
	],
	templateUrl: './teacher.html',
	styleUrl: './teacher.sass',
})
export class TeacherDashboard implements OnInit {
	private readonly teacherDataService = inject(TeacherDataService)
	private readonly auth = inject(AuthService)
	private readonly router = inject(Router)

	protected readonly activeTab = signal<TabName>('classes')
	protected readonly teacher = signal<Teacher | null>(null)
	protected readonly loading = signal(true)
	protected readonly error = signal<string | null>(null)

	protected readonly navItems: NavItem[] = [
		{ id: 'classes', label: 'Mis Clases', icon: 'school' },
		{ id: 'grades', label: 'Calificaciones', icon: 'grade' },
		{ id: 'attendance', label: 'Asistencia', icon: 'fact_check' },
		{ id: 'requests', label: 'Solicitudes', icon: 'mail' },
	]

	async ngOnInit(): Promise<void> {
		await this.loadTeacherProfile()
	}

	private async loadTeacherProfile(): Promise<void> {
		this.loading.set(true)
		this.error.set(null)

		try {
			const teacher = await this.teacherDataService.getCurrentTeacherProfile()
			if (!teacher) {
				this.error.set('Perfil de profesor no encontrado. Contacta al administrador.')
			} else {
				this.teacher.set(teacher)
			}
		} catch (error) {
			console.error('Error loading teacher profile:', error)
			this.error.set('Error de conexión. Verifica tu internet.')
		} finally {
			this.loading.set(false)
		}
	}

	protected onNavItemClick(itemId: string): void {
		this.activeTab.set(itemId as TabName)
	}

	protected async logout(): Promise<void> {
		await this.auth.signOut()
		this.teacherDataService.clearCache()
		await this.router.navigate(['/'])
	}
}
