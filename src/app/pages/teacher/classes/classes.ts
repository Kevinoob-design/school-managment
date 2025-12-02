import { Component, OnInit, inject, signal, computed } from '@angular/core'
import { Card } from '../../../shared/ui/card/card'
import { ClassService, Class, ClassSchedule } from '../../../shared/services/class.service'
import { SubjectService, Subject } from '../../../shared/services/subject.service'
import { GradeLevelService, GradeLevel } from '../../../shared/services/grade-level.service'
import { EnrollmentService } from '../../../shared/services/enrollment.service'
import { TeacherDataService } from '../../../shared/services/teacher-data.service'

interface EnrichedClass extends Class {
	subjectName?: string
	gradeLevelName?: string
	enrollmentCount?: number
}

@Component({
	selector: 'app-teacher-classes',
	imports: [Card],
	templateUrl: './classes.html',
	styleUrl: './classes.sass',
})
export class TeacherClassesTab implements OnInit {
	private readonly classService = inject(ClassService)
	private readonly subjectService = inject(SubjectService)
	private readonly gradeLevelService = inject(GradeLevelService)
	private readonly enrollmentService = inject(EnrollmentService)
	private readonly teacherDataService = inject(TeacherDataService)

	protected readonly loading = signal(true)
	protected readonly classes = signal<EnrichedClass[]>([])
	protected readonly subjects = signal<Subject[]>([])
	protected readonly gradeLevels = signal<GradeLevel[]>([])

	protected readonly activeClasses = computed(() =>
		this.classes().filter((c) => c.status === 'active'),
	)

	protected readonly completedClasses = computed(() =>
		this.classes().filter((c) => c.status === 'completed'),
	)

	protected readonly cancelledClasses = computed(() =>
		this.classes().filter((c) => c.status === 'cancelled'),
	)

	async ngOnInit(): Promise<void> {
		await this.loadClasses()
	}

	private async loadClasses(): Promise<void> {
		this.loading.set(true)

		try {
			const teacher = await this.teacherDataService.getCurrentTeacherProfile()
			if (!teacher?.id) {
				return
			}

			// Load reference data
			const [subjects, gradeLevels] = await Promise.all([
				this.subjectService.getSubjects(),
				this.gradeLevelService.getGradeLevels(),
			])

			this.subjects.set(subjects)
			this.gradeLevels.set(gradeLevels)

			// Get teacher's classes
			const teacherClasses = await this.classService.getClassesByTeacher(teacher.id)

			// Enrich with additional data
			const enrichedClasses = await Promise.all(
				teacherClasses.map(async (cls) => {
					const subject = subjects.find((s) => s.id === cls.subjectId)
					const gradeLevel = gradeLevels.find((gl) => gl.id === cls.gradeLevelId)

					// Get enrollment count
					const enrollments = await this.enrollmentService.getClassEnrollments(
						cls.id!,
					)

					return {
						...cls,
						subjectName: subject?.name || 'N/A',
						gradeLevelName: gradeLevel?.name || 'N/A',
						enrollmentCount: enrollments.length,
					} as EnrichedClass
				}),
			)

			this.classes.set(enrichedClasses)
		} catch (error) {
			console.error('Error loading classes:', error)
		} finally {
			this.loading.set(false)
		}
	}

	protected getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			active: 'text-green-700 bg-green-100',
			completed: 'text-blue-700 bg-blue-100',
			cancelled: 'text-gray-700 bg-gray-100',
		}
		return colors[status] || colors['active']
	}

	protected getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			active: 'Activa',
			completed: 'Completada',
			cancelled: 'Cancelada',
		}
		return labels[status] || status
	}

	protected getCapacityColor(count: number, max: number): string {
		const percentage = (count / max) * 100
		if (percentage >= 100) return 'text-red-600 font-bold'
		if (percentage >= 90) return 'text-red-600'
		if (percentage >= 70) return 'text-yellow-600'
		return 'text-green-600'
	}

	protected formatSchedule(schedule: ClassSchedule[]): string {
		if (!schedule || schedule.length === 0) return 'Sin horario'

		return schedule
			.map((s) => `${s.day}: ${s.startTime}-${s.endTime}`)
			.join(', ')
	}
}
