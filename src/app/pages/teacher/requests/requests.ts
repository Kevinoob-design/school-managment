import { Component, OnInit, inject, signal, computed } from '@angular/core'
import { Button } from '../../../shared/ui/button/button'
import { Input } from '../../../shared/ui/input/input'
import { StudentService } from '../../../shared/services/student.service'
import { ClassService } from '../../../shared/services/class.service'
import {
	AbsenceRequestService,
	AbsenceRequest,
	AbsenceRequestStatus,
} from '../../../shared/services/absence-request.service'
import { TeacherDataService } from '../../../shared/services/teacher-data.service'

interface EnrichedRequest extends AbsenceRequest {
	studentName: string
	className: string
}

@Component({
	selector: 'app-teacher-requests',
	imports: [Button, Input],
	templateUrl: './requests.html',
	styleUrl: './requests.sass',
})
export class TeacherRequestsTab implements OnInit {
	private readonly absenceRequestService = inject(AbsenceRequestService)
	private readonly studentService = inject(StudentService)
	private readonly classService = inject(ClassService)
	private readonly teacherDataService = inject(TeacherDataService)

	protected readonly loading = signal(true)
	protected readonly requests = signal<EnrichedRequest[]>([])
	protected readonly selectedStatus = signal<AbsenceRequestStatus | 'all'>('all')
	protected readonly showDetailModal = signal(false)
	protected readonly selectedRequest = signal<EnrichedRequest | null>(null)
	protected readonly reviewNotes = signal('')
	protected readonly processing = signal(false)

	protected readonly statusTabs: { value: AbsenceRequestStatus | 'all'; label: string }[] = [
		{ value: 'all', label: 'Todas' },
		{ value: 'pending', label: 'Pendientes' },
		{ value: 'approved', label: 'Aprobadas' },
		{ value: 'rejected', label: 'Rechazadas' },
	]

	protected readonly filteredRequests = computed(() => {
		const status = this.selectedStatus()
		if (status === 'all') return this.requests()
		return this.requests().filter((r) => r.status === status)
	})

	protected readonly pendingCount = computed(() => {
		return this.requests().filter((r) => r.status === 'pending').length
	})

	async ngOnInit(): Promise<void> {
		await this.loadRequests()
	}

	private async loadRequests(): Promise<void> {
		this.loading.set(true)
		try {
			const teacher = await this.teacherDataService.getCurrentTeacherProfile()
			if (!teacher?.id) return

			const requests = await this.absenceRequestService.getRequestsByTeacher(teacher.id)

			// Enrich with student and class names
			const students = await this.studentService.getStudents()
			const classes = await this.classService.getClasses()

			const enriched: EnrichedRequest[] = requests.map((req) => {
				const student = students.find((s) => s.id === req.studentId)
				const cls = classes.find((c) => c.id === req.classId)

				return {
					...req,
					studentName: student?.fullName || 'Estudiante desconocido',
					className: cls?.className || 'Clase desconocida',
				}
			})

			this.requests.set(enriched)
		} catch (error) {
			console.error('Error loading requests:', error)
		} finally {
			this.loading.set(false)
		}
	}

	protected selectStatus(status: AbsenceRequestStatus | 'all'): void {
		this.selectedStatus.set(status)
	}

	protected openDetail(request: EnrichedRequest): void {
		this.selectedRequest.set(request)
		this.reviewNotes.set(request.reviewNotes || '')
		this.showDetailModal.set(true)
	}

	protected closeDetail(): void {
		this.showDetailModal.set(false)
		this.selectedRequest.set(null)
		this.reviewNotes.set('')
	}

	protected async approveRequest(): Promise<void> {
		const request = this.selectedRequest()
		if (!request || this.processing()) return

		const teacher = await this.teacherDataService.getCurrentTeacherProfile()
		if (!teacher?.id) return

		this.processing.set(true)
		try {
			const success = await this.absenceRequestService.approveRequest(
				request.id!,
				teacher.id,
				this.reviewNotes().trim() || undefined,
			)

			if (success) {
				alert('Solicitud aprobada exitosamente')
				this.closeDetail()
				await this.loadRequests()
			} else {
				alert('Error al aprobar la solicitud')
			}
		} catch (error) {
			console.error('Error approving request:', error)
			alert('Error al aprobar la solicitud')
		} finally {
			this.processing.set(false)
		}
	}

	protected async rejectRequest(): Promise<void> {
		const request = this.selectedRequest()
		if (!request || this.processing()) return

		if (!this.reviewNotes().trim()) {
			alert('Por favor proporciona una razón para rechazar la solicitud')
			return
		}

		const teacher = await this.teacherDataService.getCurrentTeacherProfile()
		if (!teacher?.id) return

		this.processing.set(true)
		try {
			const success = await this.absenceRequestService.rejectRequest(
				request.id!,
				teacher.id,
				this.reviewNotes().trim(),
			)

			if (success) {
				alert('Solicitud rechazada')
				this.closeDetail()
				await this.loadRequests()
			} else {
				alert('Error al rechazar la solicitud')
			}
		} catch (error) {
			console.error('Error rejecting request:', error)
			alert('Error al rechazar la solicitud')
		} finally {
			this.processing.set(false)
		}
	}

	protected getStatusColor(status: AbsenceRequestStatus): string {
		return this.absenceRequestService.getStatusColor(status)
	}

	protected getStatusLabel(status: AbsenceRequestStatus): string {
		return this.absenceRequestService.getStatusLabel(status)
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
			hour: '2-digit',
			minute: '2-digit',
		})
	}
}
