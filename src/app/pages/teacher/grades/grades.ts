import { Component, OnInit, inject, signal, computed } from '@angular/core'
import { Button } from '../../../shared/ui/button/button'
import { Input } from '../../../shared/ui/input/input'
import { ClassService, Class } from '../../../shared/services/class.service'
import { EnrollmentService } from '../../../shared/services/enrollment.service'
import { StudentService, Student } from '../../../shared/services/student.service'
import { GradeService, Grade, GradeType } from '../../../shared/services/grade.service'
import { TeacherDataService } from '../../../shared/services/teacher-data.service'

interface StudentWithGrades extends Student {
	grades: Grade[]
	average: number
	gradeLetter: string
}

@Component({
	selector: 'app-teacher-grades',
	imports: [Button, Input],
	templateUrl: './grades.html',
	styleUrl: './grades.sass',
})
export class TeacherGradesTab implements OnInit {
	private readonly classService = inject(ClassService)
	private readonly enrollmentService = inject(EnrollmentService)
	private readonly studentService = inject(StudentService)
	private readonly gradeService = inject(GradeService)
	private readonly teacherDataService = inject(TeacherDataService)

	protected readonly loading = signal(true)
	protected readonly classes = signal<Class[]>([])
	protected readonly selectedClass = signal<Class | null>(null)
	protected readonly students = signal<StudentWithGrades[]>([])
	protected readonly searchQuery = signal('')
	protected readonly selectedGradeType = signal<GradeType | 'all'>('all')
	protected readonly showAddGradeModal = signal(false)
	protected readonly editingGrade = signal<Grade | null>(null)

	// Form fields for add/edit grade modal
	protected readonly gradeName = signal('')
	protected readonly gradeType = signal<GradeType>('exam')
	protected readonly maxPoints = signal(100)
	protected readonly weight = signal(0)
	protected readonly selectedStudentId = signal<string | null>(null)
	protected readonly earnedPoints = signal(0)
	protected readonly comments = signal('')
	protected readonly formError = signal('')
	protected readonly saving = signal(false)

	protected readonly gradeTypes: { value: GradeType; label: string }[] = [
		{ value: 'exam', label: 'Examen' },
		{ value: 'quiz', label: 'Quiz' },
		{ value: 'homework', label: 'Tarea' },
		{ value: 'project', label: 'Proyecto' },
		{ value: 'participation', label: 'Participación' },
		{ value: 'final', label: 'Final' },
	]

	protected readonly filteredStudents = computed(() => {
		const query = this.searchQuery().toLowerCase()
		const students = this.students()

		if (!query) return students

		return students.filter(
			(s) =>
				s.fullName.toLowerCase().includes(query) ||
				s.email.toLowerCase().includes(query),
		)
	})

	protected readonly classAverage = computed(() => {
		const students = this.students()
		if (students.length === 0) return 0

		const sum = students.reduce((acc, s) => acc + s.average, 0)
		return sum / students.length
	})

	protected readonly totalGrades = computed(() => {
		return this.students().reduce((sum, s) => sum + s.grades.length, 0)
	})

	async ngOnInit(): Promise<void> {
		await this.loadClasses()
	}

	private async loadClasses(): Promise<void> {
		this.loading.set(true)
		try {
			const teacher = await this.teacherDataService.getCurrentTeacherProfile()
			if (!teacher?.id) return

			const classes = await this.classService.getClassesByTeacher(teacher.id)
			const activeClasses = classes.filter((c) => c.status === 'active')
			this.classes.set(activeClasses)

			if (activeClasses.length > 0) {
				await this.selectClass(activeClasses[0])
			}
		} catch (error) {
			console.error('Error loading classes:', error)
		} finally {
			this.loading.set(false)
		}
	}

	protected async selectClass(cls: Class): Promise<void> {
		this.selectedClass.set(cls)
		this.loading.set(true)
		try {
			await this.loadStudentsAndGrades(cls.id!)
		} finally {
			this.loading.set(false)
		}
	}

	private async loadStudentsAndGrades(classId: string): Promise<void> {
		// Get enrolled students
		const enrollments = await this.enrollmentService.getClassEnrollments(classId)
		const allStudents = await this.studentService.getStudents()

		// Get all grades for the class
		const grades = await this.gradeService.getGradesByClass(classId)

		// Build student list with grades
		const studentsWithGrades: StudentWithGrades[] = []
		for (const enrollment of enrollments) {
			const student = allStudents.find((s) => s.id === enrollment.studentId)
			if (!student) continue

			const studentGrades = grades.filter((g) => g.studentId === student.id)
			const average = await this.gradeService.calculateStudentAverage(
				student.id!,
				classId,
			)

			studentsWithGrades.push({
				...student,
				grades: studentGrades,
				average,
				gradeLetter: this.gradeService.calculateGradeLetter(average),
			})
		}

		this.students.set(studentsWithGrades.sort((a, b) => a.fullName.localeCompare(b.fullName)))
	}

	protected openAddGradeModal(studentId?: string): void {
		this.resetForm()
		if (studentId) {
			this.selectedStudentId.set(studentId)
		}
		this.showAddGradeModal.set(true)
	}

	protected openEditGradeModal(grade: Grade): void {
		this.editingGrade.set(grade)
		this.gradeName.set(grade.gradeName)
		this.gradeType.set(grade.gradeType)
		this.maxPoints.set(grade.maxPoints)
		this.earnedPoints.set(grade.earnedPoints)
		this.weight.set(grade.weight || 0)
		this.comments.set(grade.comments || '')
		this.selectedStudentId.set(grade.studentId)
		this.showAddGradeModal.set(true)
	}

	protected closeModal(): void {
		this.showAddGradeModal.set(false)
		this.editingGrade.set(null)
		this.resetForm()
	}

	private resetForm(): void {
		this.gradeName.set('')
		this.gradeType.set('exam')
		this.maxPoints.set(100)
		this.earnedPoints.set(0)
		this.weight.set(0)
		this.comments.set('')
		this.selectedStudentId.set(null)
		this.formError.set('')
	}

	protected canSubmit(): boolean {
		if (this.saving()) return false
		if (!this.gradeName().trim()) return false
		if (!this.selectedStudentId()) return false
		if (this.maxPoints() <= 0) return false
		if (this.earnedPoints() < 0 || this.earnedPoints() > this.maxPoints()) return false
		return true
	}

	protected async saveGrade(): Promise<void> {
		if (!this.canSubmit()) {
			this.formError.set('Por favor completa todos los campos correctamente')
			return
		}

		const teacher = await this.teacherDataService.getCurrentTeacherProfile()
		if (!teacher?.id || !this.selectedClass()?.id) return

		this.saving.set(true)
		this.formError.set('')

		try {
			const gradeValue = (this.earnedPoints() / this.maxPoints()) * 100

			const gradeData = {
				classId: this.selectedClass()!.id!,
				studentId: this.selectedStudentId()!,
				teacherId: teacher.id,
				gradeName: this.gradeName().trim(),
				gradeType: this.gradeType(),
				maxPoints: this.maxPoints(),
				earnedPoints: this.earnedPoints(),
				gradeValue,
				weight: this.weight() > 0 ? this.weight() : undefined,
				comments: this.comments().trim() || undefined,
			}

			if (this.editingGrade()) {
				await this.gradeService.updateGrade(this.editingGrade()!.id!, gradeData)
			} else {
				await this.gradeService.addGrade(gradeData)
			}

			this.closeModal()
			await this.loadStudentsAndGrades(this.selectedClass()!.id!)
		} catch (error) {
			console.error('Error saving grade:', error)
			this.formError.set('Error al guardar la calificación')
		} finally {
			this.saving.set(false)
		}
	}

	protected async deleteGrade(grade: Grade): Promise<void> {
		if (!confirm('¿Estás seguro de eliminar esta calificación?')) return

		try {
			await this.gradeService.deleteGrade(grade.id!, grade.gradeName)
			await this.loadStudentsAndGrades(this.selectedClass()!.id!)
		} catch (error) {
			console.error('Error deleting grade:', error)
		}
	}

	protected getGradeLetterColor(letter: string): string {
		return this.gradeService.getGradeLetterColor(letter)
	}

	protected getGradeTypeLabel(type: GradeType): string {
		return this.gradeService.getGradeTypeLabel(type)
	}

	protected formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}
}
