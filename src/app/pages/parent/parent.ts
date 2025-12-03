import { Component, OnInit, inject, signal, computed } from '@angular/core'
import { collection, query, where, getDocs, addDoc } from '@angular/fire/firestore'
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage'
import { Button } from '../../shared/ui/button/button'
import { ParentDataService } from '../../shared/services/parent-data.service'
import { Student } from '../../shared/services/student.service'
import { EnrollmentService, Enrollment } from '../../shared/services/enrollment.service'
import { ClassService, Class } from '../../shared/services/class.service'
import { GradeService, Grade } from '../../shared/services/grade.service'
import { AttendanceService } from '../../shared/services/attendance.service'
import {
	AbsenceRequestService,
	AbsenceRequest,
} from '../../shared/services/absence-request.service'
import { AuthService } from '../../shared/services/auth.service'

type TabType = 'overview' | 'grades' | 'requests'

interface ChildGrades {
	classId: string
	className: string
	teacherName: string
	grades: Grade[]
	average: number
	gradeLetter: string
}

interface ChildOverview {
	student: Student
	classesCount: number
	attendanceRate: number
	loading: boolean
}

@Component({
	selector: 'app-parent-dashboard',
  imports: [Button],
	templateUrl: './parent.html',
	styleUrl: './parent.sass',
})
export class ParentDashboard implements OnInit {
	private readonly parentDataService = inject(ParentDataService)
	private readonly enrollmentService = inject(EnrollmentService)
	private readonly classService = inject(ClassService)
	private readonly gradeService = inject(GradeService)
	private readonly attendanceService = inject(AttendanceService)
	private readonly absenceRequestService = inject(AbsenceRequestService)
	private readonly auth = inject(AuthService)
	private readonly storage = inject(Storage)

	protected readonly loading = signal(true)
	protected readonly children = signal<Student[]>([])
	protected readonly selectedChild = signal<Student | null>(null)
	protected readonly currentTab = signal<TabType>('overview')

	// Overview data - all children
	protected readonly childrenOverview = signal<ChildOverview[]>([])

	// Individual child data (for grades/requests tabs)
	protected readonly enrollments = signal<Enrollment[]>([])
	protected readonly classes = signal<Class[]>([])
	protected readonly attendanceRate = signal(0)

	// Grades data
	protected readonly childGrades = signal<ChildGrades[]>([])
	protected readonly gradesLoading = signal(false)

	// Absence requests data
	protected readonly absenceRequests = signal<AbsenceRequest[]>([])
	protected readonly showRequestModal = signal(false)
	protected readonly requestLoading = signal(false)

	// Request form fields
	protected readonly selectedClassId = signal('')
	protected readonly startDate = signal('')
	protected readonly endDate = signal('')
	protected readonly reason = signal('')
	protected readonly attachmentFile = signal<File | null>(null)
	protected readonly formError = signal('')

	protected readonly tabs: { value: TabType; label: string; icon: string }[] = [
		{ value: 'overview', label: 'Resumen', icon: 'dashboard' },
		{ value: 'grades', label: 'Calificaciones', icon: 'grade' },
		{ value: 'requests', label: 'Solicitudes', icon: 'inbox' },
	]

	protected readonly pendingRequests = computed(() => {
		return this.absenceRequests().filter((r) => r.status === 'pending').length
	})

	async ngOnInit(): Promise<void> {
		await this.loadChildren()
	}

	private async loadChildren(): Promise<void> {
		this.loading.set(true)
		try {
			const children = await this.parentDataService.getChildrenByParentEmail()
			this.children.set(children)

			// Load overview data for all children
			await this.loadAllChildrenOverview()
		} catch (error) {
			console.error('Error loading children:', error)
		} finally {
			this.loading.set(false)
		}
	}

	private async loadAllChildrenOverview(): Promise<void> {
		const children = this.children()
		const overviews: ChildOverview[] = children.map((child) => ({
			student: child,
			classesCount: 0,
			attendanceRate: 0,
			loading: true,
		}))
		this.childrenOverview.set(overviews)

		// Load data for each child in parallel
		await Promise.all(
			children.map(async (child, index) => {
				try {
					// Get enrollments by querying with student's tenantId
					const enrollments = await this.getStudentEnrollmentsByTenantId(child.tenantId, child.id!)
					const classesCount = enrollments.length

					// Calculate attendance rate
					let attendanceRate = 0
					if (enrollments.length > 0) {
						// Calculate attendance for each enrollment directly
						let totalRate = 0
						let count = 0
						for (const enrollment of enrollments) {
							const rate = await this.calculateAttendanceRateByTenantId(
								child.tenantId,
								child.id!,
								enrollment.classId,
							)
							totalRate += rate
							count++
						}
						attendanceRate = count > 0 ? totalRate / count : 0
					}

					// Update the overview
					const updated = [...this.childrenOverview()]
					updated[index] = {
						student: child,
						classesCount,
						attendanceRate,
						loading: false,
					}
					this.childrenOverview.set(updated)
				} catch (error) {
					console.error(`Error loading overview for child ${child.fullName}:`, error)
					const updated = [...this.childrenOverview()]
					updated[index] = {
						...updated[index],
						loading: false,
					}
					this.childrenOverview.set(updated)
				}
			}),
		)
	}

	private async getStudentEnrollmentsByTenantId(
		tenantId: string,
		studentId: string,
	): Promise<Enrollment[]> {
		try {
			const enrollmentsRef = collection(this.enrollmentService['firestore'], 'enrollments')
			const enrollmentsQuery = query(
				enrollmentsRef,
				where('tenantId', '==', tenantId),
				where('studentId', '==', studentId),
				where('status', '==', 'enrolled'),
			)
			const snapshot = await getDocs(enrollmentsQuery)
			const enrollments: Enrollment[] = []
			snapshot.forEach((doc) => {
				enrollments.push({ id: doc.id, ...doc.data() } as Enrollment)
			})
			return enrollments
		} catch (error) {
			console.error('Error fetching enrollments:', error)
			return []
		}
	}

	private async calculateAttendanceRateByTenantId(
		tenantId: string,
		studentId: string,
		classId: string,
	): Promise<number> {
		try {
			const attendanceRef = collection(this.attendanceService['firestore'], 'attendance')
			const attendanceQuery = query(
				attendanceRef,
				where('tenantId', '==', tenantId),
				where('classId', '==', classId),
				where('studentId', '==', studentId),
			)
			const snapshot = await getDocs(attendanceQuery)
			const records: { status: string }[] = []
			snapshot.forEach((doc) => {
				records.push(doc.data() as { status: string })
			})

			if (records.length === 0) return 0

			const presentCount = records.filter((r) => r.status === 'present' || r.status === 'late').length
			return (presentCount / records.length) * 100
		} catch (error) {
			console.error('Error calculating attendance:', error)
			return 0
		}
	}

	protected async selectChild(child: Student): Promise<void> {
		this.selectedChild.set(child)
		await this.loadChildData()
	}

	private async loadChildData(): Promise<void> {
		const child = this.selectedChild()
		if (!child?.id) return

		// Load enrollments using student's tenantId
		const enrollments = await this.getStudentEnrollmentsByTenantId(child.tenantId, child.id)
		this.enrollments.set(enrollments)

		// Load classes by querying with student's tenantId
		const enrolledClasses = await this.getClassesByTenantId(child.tenantId, enrollments)
		this.classes.set(enrolledClasses)

		// Load attendance rate
		if (enrolledClasses.length > 0) {
			let totalRate = 0
			let count = 0
			for (const cls of enrolledClasses) {
				const rate = await this.calculateAttendanceRateByTenantId(child.tenantId, child.id, cls.id!)
				totalRate += rate
				count++
			}
			this.attendanceRate.set(count > 0 ? totalRate / count : 0)
		}

		// Load grades if on grades tab
		if (this.currentTab() === 'grades') {
			await this.loadGrades()
		}

		// Load absence requests if on requests tab
		if (this.currentTab() === 'requests') {
			await this.loadAbsenceRequests()
		}
	}

	private async getClassesByTenantId(
		tenantId: string,
		enrollments: Enrollment[],
	): Promise<Class[]> {
		if (enrollments.length === 0) return []

		try {
			const classesRef = collection(this.classService['firestore'], 'classes')
			const classIds = enrollments.map((e) => e.classId)

			// Query classes by tenantId (can't use 'in' operator with classId because we need tenantId filter)
			const classesQuery = query(classesRef, where('tenantId', '==', tenantId))
			const snapshot = await getDocs(classesQuery)

			const classes: Class[] = []
			snapshot.forEach((doc) => {
				const classData = { id: doc.id, ...doc.data() } as Class
				if (classIds.includes(classData.id!)) {
					classes.push(classData)
				}
			})

			return classes
		} catch (error) {
			console.error('Error fetching classes:', error)
			return []
		}
	}

	protected async selectTab(tab: TabType): Promise<void> {
		this.currentTab.set(tab)

		if (tab === 'grades' && this.childGrades().length === 0) {
			await this.loadGrades()
		} else if (tab === 'requests' && this.absenceRequests().length === 0) {
			await this.loadAbsenceRequests()
		}
	}

	private async loadGrades(): Promise<void> {
		const child = this.selectedChild()
		if (!child?.id) return

		this.gradesLoading.set(true)
		try {
			const gradesData: ChildGrades[] = []

			for (const cls of this.classes()) {
				const grades = await this.getGradesByTenantId(child.tenantId, child.id, cls.id!)
				const average = await this.calculateAverageByTenantId(child.tenantId, child.id, cls.id!)
				const gradeLetter = this.gradeService.calculateGradeLetter(average)

				gradesData.push({
					classId: cls.id!,
					className: cls.className,
					teacherName: 'Profesor',
					grades,
					average,
					gradeLetter,
				})
			}

			this.childGrades.set(gradesData)
		} catch (error) {
			console.error('Error loading grades:', error)
		} finally {
			this.gradesLoading.set(false)
		}
	}

	private async getGradesByTenantId(
		tenantId: string,
		studentId: string,
		classId: string,
	): Promise<Grade[]> {
		try {
			const gradesRef = collection(this.gradeService['firestore'], 'grades')
			const gradesQuery = query(
				gradesRef,
				where('tenantId', '==', tenantId),
				where('classId', '==', classId),
				where('studentId', '==', studentId),
			)
			const snapshot = await getDocs(gradesQuery)

			const grades: Grade[] = []
			snapshot.forEach((doc) => {
				grades.push({ id: doc.id, ...doc.data() } as Grade)
			})

			return grades
		} catch (error) {
			console.error('Error fetching grades:', error)
			return []
		}
	}

	private async calculateAverageByTenantId(
		tenantId: string,
		studentId: string,
		classId: string,
	): Promise<number> {
		const grades = await this.getGradesByTenantId(tenantId, studentId, classId)
		if (grades.length === 0) return 0

		const totalPoints = grades.reduce((sum, g) => sum + g.gradeValue, 0)
		return totalPoints / grades.length
	}

	private async loadAbsenceRequests(): Promise<void> {
		const child = this.selectedChild()
		if (!child?.id) return

		this.requestLoading.set(true)
		try {
			const requests = await this.getAbsenceRequestsByTenantId(child.tenantId, child.id)
			this.absenceRequests.set(requests)
		} catch (error) {
			console.error('Error loading absence requests:', error)
		} finally {
			this.requestLoading.set(false)
		}
	}

	private async getAbsenceRequestsByTenantId(
		tenantId: string,
		studentId: string,
	): Promise<AbsenceRequest[]> {
		try {
			const requestsRef = collection(this.absenceRequestService['firestore'], 'absenceRequests')
			const requestsQuery = query(
				requestsRef,
				where('tenantId', '==', tenantId),
				where('studentId', '==', studentId),
			)
			const snapshot = await getDocs(requestsQuery)

			const requests: AbsenceRequest[] = []
			snapshot.forEach((doc) => {
				requests.push({ id: doc.id, ...doc.data() } as AbsenceRequest)
			})

			return requests.sort((a, b) => b.createdAt - a.createdAt)
		} catch (error) {
			console.error('Error fetching absence requests:', error)
			return []
		}
	}

	protected openRequestModal(): void {
		this.resetRequestForm()
		this.showRequestModal.set(true)
	}

	protected closeRequestModal(): void {
		this.showRequestModal.set(false)
		this.resetRequestForm()
	}

	private resetRequestForm(): void {
		this.selectedClassId.set('')
		this.startDate.set('')
		this.endDate.set('')
		this.reason.set('')
		this.attachmentFile.set(null)
		this.formError.set('')
	}

	protected onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement
		if (input.files && input.files.length > 0) {
			const file = input.files[0]
			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				this.formError.set('El archivo no debe superar los 5MB')
				input.value = ''
				return
			}
			this.attachmentFile.set(file)
			this.formError.set('')
		}
	}

	protected removeAttachment(): void {
		this.attachmentFile.set(null)
	}

	protected canSubmitRequest(): boolean {
		return (
			!this.requestLoading() &&
			this.selectedClassId().trim() !== '' &&
			this.startDate().trim() !== '' &&
			this.endDate().trim() !== '' &&
			this.reason().trim().length >= 10
		)
	}

	protected async submitAbsenceRequest(): Promise<void> {
		if (!this.canSubmitRequest()) {
			this.formError.set('Por favor completa todos los campos correctamente')
			return
		}

		const child = this.selectedChild()
		const user = this.auth.currentUser()
		if (!child?.id || !user?.uid) return

		const cls = this.classes().find((c) => c.id === this.selectedClassId())
		if (!cls?.teacherId) {
			this.formError.set('Clase no encontrada')
			return
		}

		this.requestLoading.set(true)
		this.formError.set('')

		try {
			// Upload attachment if provided
			let attachmentUrl: string | undefined
			const file = this.attachmentFile()
			if (file) {
				try {
					attachmentUrl = await this.uploadAttachment(file, child.tenantId, child.id)
				} catch (uploadError) {
					console.error('Error uploading attachment:', uploadError)
					this.formError.set('Error al subir el archivo adjunto')
					this.requestLoading.set(false)
					return
				}
			}

			// Create request with student's tenantId
			const requestId = await this.createAbsenceRequestByTenantId(child.tenantId, {
				studentId: child.id,
				teacherId: cls.teacherId,
				classId: cls.id!,
				startDate: this.startDate(),
				endDate: this.endDate(),
				reason: this.reason().trim(),
				attachmentUrl,
				status: 'pending',
				submittedBy: user.uid,
			})

			if (requestId) {
				alert('Solicitud enviada exitosamente')
				this.closeRequestModal()
				await this.loadAbsenceRequests()
			} else {
				this.formError.set('Error al enviar la solicitud')
			}
		} catch (error) {
			console.error('Error submitting request:', error)
			this.formError.set('Error al enviar la solicitud')
		} finally {
			this.requestLoading.set(false)
		}
	}

	private async createAbsenceRequestByTenantId(
		tenantId: string,
		requestData: Omit<AbsenceRequest, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
	): Promise<string | null> {
		try {
			const requestsRef = collection(this.absenceRequestService['firestore'], 'absenceRequests')
			const now = Date.now()

			const cleanData: Record<string, unknown> = {
				studentId: requestData.studentId,
				teacherId: requestData.teacherId,
				classId: requestData.classId,
				startDate: requestData.startDate,
				endDate: requestData.endDate,
				reason: requestData.reason,
				status: requestData.status,
				submittedBy: requestData.submittedBy,
				tenantId,
				createdAt: now,
				updatedAt: now,
			}

			if (requestData.attachmentUrl) {
				cleanData['attachmentUrl'] = requestData.attachmentUrl
			}

			const docRef = await addDoc(requestsRef, cleanData)
			return docRef.id
		} catch (error) {
			console.error('Error creating absence request:', error)
			return null
		}
	}

	private async uploadAttachment(file: File, tenantId: string, studentId: string): Promise<string> {
		const timestamp = Date.now()
		const fileName = `${timestamp}_${file.name}`
		const filePath = `absence-requests/${tenantId}/${studentId}/${fileName}`
		const storageRef = ref(this.storage, filePath)

		await uploadBytes(storageRef, file)
		return await getDownloadURL(storageRef)
	}

	protected getStatusColor(status: AbsenceRequest['status']): string {
		return this.absenceRequestService.getStatusColor(status)
	}

	protected getStatusLabel(status: AbsenceRequest['status']): string {
		return this.absenceRequestService.getStatusLabel(status)
	}

	protected getGradeLetterColor(letter: string): string {
		return this.gradeService.getGradeLetterColor(letter)
	}

	protected getGradeTypeLabel(type: Grade['gradeType']): string {
		return this.gradeService.getGradeTypeLabel(type)
	}

	protected formatDate(date: string): string {
		return new Date(date).toLocaleDateString('es-ES', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})
	}

	protected formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	protected async logout(): Promise<void> {
    await this.auth.signOut()
	}
}
