import { Injectable, inject } from '@angular/core'
import {
	Firestore,
	collection,
	query,
	where,
	getDocs,
	doc,
	updateDoc,
	deleteDoc,
	orderBy,
	writeBatch,
} from '@angular/fire/firestore'
import { AuthService } from './auth.service'
import { ActivityLoggerService } from './activity-logger.service'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceRecord {
	id?: string
	tenantId: string
	classId: string
	studentId: string
	teacherId: string
	date: string // YYYY-MM-DD
	status: AttendanceStatus
	notes?: string
	createdAt: number
	updatedAt: number
}

export interface AttendanceStats {
	studentId: string
	studentName: string
	totalClasses: number
	present: number
	absent: number
	late: number
	excused: number
	attendanceRate: number // percentage
}

@Injectable({
	providedIn: 'root',
})
export class AttendanceService {
	private readonly firestore = inject(Firestore)
	private readonly auth = inject(AuthService)
	private readonly activityLogger = inject(ActivityLoggerService)

	/**
	 * Get attendance for a class on a specific date
	 */
	async getAttendanceByClass(classId: string, date: string): Promise<AttendanceRecord[]> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId) return []

		try {
			const attendanceRef = collection(this.firestore, 'attendance')
			const attendanceQuery = query(
				attendanceRef,
				where('tenantId', '==', tenantId),
				where('classId', '==', classId),
				where('date', '==', date),
			)
			const snapshot = await getDocs(attendanceQuery)

			const records: AttendanceRecord[] = []
			snapshot.forEach((doc) => {
				records.push({ id: doc.id, ...doc.data() } as AttendanceRecord)
			})

			return records
		} catch (error) {
			console.error('Error fetching attendance:', error)
			return []
		}
	}

	/**
	 * Get attendance history for a student in a class
	 */
	async getAttendanceByStudent(
		studentId: string,
		classId: string,
		startDate?: string,
		endDate?: string,
	): Promise<AttendanceRecord[]> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId) return []

		try {
			const attendanceRef = collection(this.firestore, 'attendance')
			const attendanceQuery = query(
				attendanceRef,
				where('tenantId', '==', tenantId),
				where('classId', '==', classId),
				where('studentId', '==', studentId),
				orderBy('date', 'desc'),
			)

			const snapshot = await getDocs(attendanceQuery)

			let records: AttendanceRecord[] = []
			snapshot.forEach((doc) => {
				records.push({ id: doc.id, ...doc.data() } as AttendanceRecord)
			})

			// Filter by date range if provided
			if (startDate || endDate) {
				records = records.filter((record) => {
					if (startDate && record.date < startDate) return false
					if (endDate && record.date > endDate) return false
					return true
				})
			}

			return records
		} catch (error) {
			console.error('Error fetching student attendance:', error)
			return []
		}
	}

	/**
	 * Record attendance for multiple students (bulk operation)
	 */
	async recordAttendance(
		records: Omit<AttendanceRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[],
	): Promise<boolean> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId || records.length === 0) return false

		try {
			const batch = writeBatch(this.firestore)
			const now = Date.now()

			for (const record of records) {
				// Check if record already exists for this date
				const existing = await this.getAttendanceByClass(record.classId, record.date)
				const existingRecord = existing.find((r) => r.studentId === record.studentId)

				if (existingRecord) {
					// Update existing record
					const docRef = doc(this.firestore, 'attendance', existingRecord.id!)
					const updateData: Record<string, unknown> = {
						status: record.status,
						updatedAt: now,
					}
					if (record.notes !== undefined) updateData['notes'] = record.notes
					batch.update(docRef, updateData)
				} else {
					// Create new record - filter out undefined values
					const docRef = doc(collection(this.firestore, 'attendance'))
					const cleanData: Record<string, unknown> = {
						classId: record.classId,
						studentId: record.studentId,
						teacherId: record.teacherId,
						date: record.date,
						status: record.status,
						tenantId,
						createdAt: now,
						updatedAt: now,
					}
					// Add optional fields only if defined
					if (record.notes !== undefined) cleanData['notes'] = record.notes
					batch.set(docRef, cleanData)
				}
			}

			await batch.commit()

			// Log activity
			await this.activityLogger.logActivity(
				'create',
				'attendance',
				records[0].classId,
				`Asistencia ${records[0].date}`,
				`Registró asistencia para ${records.length} estudiantes (${records[0].date})`,
				{ classId: records[0].classId, date: records[0].date },
			)

			return true
		} catch (error) {
			console.error('Error recording attendance:', error)
			return false
		}
	}

	/**
	 * Update a single attendance record
	 */
	async updateAttendance(recordId: string, updates: Partial<AttendanceRecord>): Promise<boolean> {
		try {
			const recordRef = doc(this.firestore, 'attendance', recordId)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, tenantId, createdAt, ...updateData } = updates

			// Filter out undefined values
			const cleanUpdateData: Record<string, unknown> = { updatedAt: Date.now() }
			Object.entries(updateData).forEach(([key, value]) => {
				if (value !== undefined) {
					cleanUpdateData[key] = value
				}
			})

			await updateDoc(recordRef, cleanUpdateData)

			// Log activity
			await this.activityLogger.logActivity(
				'update',
				'attendance',
				recordId,
				'Asistencia',
				`Actualizó registro de asistencia`,
			)

			return true
		} catch (error) {
			console.error('Error updating attendance:', error)
			return false
		}
	}

	/**
	 * Delete an attendance record
	 */
	async deleteAttendance(recordId: string): Promise<boolean> {
		try {
			const recordRef = doc(this.firestore, 'attendance', recordId)
			await deleteDoc(recordRef)

			return true
		} catch (error) {
			console.error('Error deleting attendance:', error)
			return false
		}
	}

	/**
	 * Calculate attendance rate for a student
	 */
	async calculateAttendanceRate(
		studentId: string,
		classId: string,
		startDate?: string,
		endDate?: string,
	): Promise<number> {
		const records = await this.getAttendanceByStudent(studentId, classId, startDate, endDate)

		if (records.length === 0) return 0

		const presentCount = records.filter((r) => r.status === 'present' || r.status === 'late').length
		return (presentCount / records.length) * 100
	}

	/**
	 * Get attendance statistics for all students in a class
	 */
	async getAttendanceStats(
		classId: string,
		studentNames: Map<string, string>,
		startDate?: string,
		endDate?: string,
	): Promise<AttendanceStats[]> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId) return []

		try {
			const attendanceRef = collection(this.firestore, 'attendance')
			const attendanceQuery = query(
				attendanceRef,
				where('tenantId', '==', tenantId),
				where('classId', '==', classId),
				orderBy('date', 'desc'),
			)
			const snapshot = await getDocs(attendanceQuery)

			let records: AttendanceRecord[] = []
			snapshot.forEach((doc) => {
				records.push({ id: doc.id, ...doc.data() } as AttendanceRecord)
			})

			// Filter by date range
			if (startDate || endDate) {
				records = records.filter((record) => {
					if (startDate && record.date < startDate) return false
					if (endDate && record.date > endDate) return false
					return true
				})
			}

			// Group by student
			const statsByStudent = new Map<string, AttendanceStats>()

			records.forEach((record) => {
				if (!statsByStudent.has(record.studentId)) {
					statsByStudent.set(record.studentId, {
						studentId: record.studentId,
						studentName: studentNames.get(record.studentId) || 'Unknown',
						totalClasses: 0,
						present: 0,
						absent: 0,
						late: 0,
						excused: 0,
						attendanceRate: 0,
					})
				}

				const stats = statsByStudent.get(record.studentId)!
				stats.totalClasses++

				switch (record.status) {
					case 'present':
						stats.present++
						break
					case 'absent':
						stats.absent++
						break
					case 'late':
						stats.late++
						break
					case 'excused':
						stats.excused++
						break
				}
			})

			// Calculate attendance rates
			const statsArray: AttendanceStats[] = []
			for (const stats of statsByStudent.values()) {
				stats.attendanceRate = stats.totalClasses > 0 ? ((stats.present + stats.late) / stats.totalClasses) * 100 : 0
				statsArray.push(stats)
			}

			return statsArray.sort((a, b) => a.studentName.localeCompare(b.studentName))
		} catch (error) {
			console.error('Error calculating attendance stats:', error)
			return []
		}
	}

	/**
	 * Get attendance status color class
	 */
	getStatusColor(status: AttendanceStatus): string {
		const colors: Record<AttendanceStatus, string> = {
			present: 'text-green-600 bg-green-100',
			absent: 'text-red-600 bg-red-100',
			late: 'text-yellow-600 bg-yellow-100',
			excused: 'text-blue-600 bg-blue-100',
		}
		return colors[status]
	}

	/**
	 * Get attendance status label in Spanish
	 */
	getStatusLabel(status: AttendanceStatus): string {
		const labels: Record<AttendanceStatus, string> = {
			present: 'Presente',
			absent: 'Ausente',
			late: 'Tarde',
			excused: 'Justificado',
		}
		return labels[status]
	}

	/**
	 * Get today's date in YYYY-MM-DD format
	 */
	getTodayDate(): string {
		const today = new Date()
		return today.toISOString().split('T')[0]
	}

	/**
	 * Validate that date is not in the future
	 */
	isValidAttendanceDate(date: string): boolean {
		const selectedDate = new Date(date)
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		selectedDate.setHours(0, 0, 0, 0)
		return selectedDate <= today
	}
}
