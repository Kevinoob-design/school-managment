import { Injectable, inject } from '@angular/core'
import {
	Firestore,
	collection,
	query,
	where,
	getDocs,
	addDoc,
	doc,
	updateDoc,
	deleteDoc,
	orderBy,
} from '@angular/fire/firestore'
import { AuthService } from './auth.service'
import { ActivityLoggerService } from './activity-logger.service'

export type GradeType = 'exam' | 'quiz' | 'homework' | 'project' | 'participation' | 'final'

export interface Grade {
	id?: string
	tenantId: string
	classId: string
	studentId: string
	teacherId: string
	gradeValue: number // 0-100
	gradeLetter?: string // A, B, C, D, F (calculated)
	gradeType: GradeType
	gradeName: string // "Midterm Exam", "Quiz 1", etc.
	maxPoints: number
	earnedPoints: number
	weight?: number // percentage weight in final grade
	dueDate?: string
	submittedDate?: string
	comments?: string
	createdAt: number
	updatedAt: number
}

export interface StudentGradeSummary {
	studentId: string
	studentName: string
	grades: Grade[]
	average: number
	gradeLetter: string
}

@Injectable({
	providedIn: 'root',
})
export class GradeService {
	private readonly firestore = inject(Firestore)
	private readonly auth = inject(AuthService)
	private readonly activityLogger = inject(ActivityLoggerService)

	/**
	 * Get all grades for a class
	 */
	async getGradesByClass(classId: string): Promise<Grade[]> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId) return []

		try {
			const gradesRef = collection(this.firestore, 'grades')
			const gradesQuery = query(
				gradesRef,
				where('tenantId', '==', tenantId),
				where('classId', '==', classId),
				orderBy('createdAt', 'desc'),
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

	/**
	 * Get grades for a specific student in a class
	 */
	async getGradesByStudent(studentId: string, classId: string): Promise<Grade[]> {
		const grades = await this.getGradesByClass(classId)
		return grades.filter((g) => g.studentId === studentId)
	}

	/**
	 * Get grades by type (exam, quiz, etc.)
	 */
	async getGradesByType(classId: string, gradeType: GradeType): Promise<Grade[]> {
		const grades = await this.getGradesByClass(classId)
		return grades.filter((g) => g.gradeType === gradeType)
	}

	/**
	 * Add a new grade
	 */
	async addGrade(gradeData: Omit<Grade, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId) return null

		try {
			const gradesRef = collection(this.firestore, 'grades')
			const now = Date.now()

			// Calculate grade letter
			const gradeLetter = this.calculateGradeLetter(gradeData.gradeValue)

			// Filter out undefined values
			const cleanData: Record<string, unknown> = {
				classId: gradeData.classId,
				studentId: gradeData.studentId,
				teacherId: gradeData.teacherId,
				gradeValue: gradeData.gradeValue,
				gradeType: gradeData.gradeType,
				gradeName: gradeData.gradeName,
				maxPoints: gradeData.maxPoints,
				earnedPoints: gradeData.earnedPoints,
				tenantId,
				gradeLetter,
				createdAt: now,
				updatedAt: now,
			}

			// Add optional fields only if defined
			if (gradeData.weight !== undefined) cleanData['weight'] = gradeData.weight
			if (gradeData.comments !== undefined) cleanData['comments'] = gradeData.comments
			if (gradeData.dueDate !== undefined) cleanData['dueDate'] = gradeData.dueDate
			if (gradeData.submittedDate !== undefined) cleanData['submittedDate'] = gradeData.submittedDate

			const docRef = await addDoc(gradesRef, cleanData)

			// Log activity
			await this.activityLogger.logActivity(
				'create',
				'grade',
				docRef.id,
				`${gradeData.gradeName}`,
				`Publicó calificación "${gradeData.gradeName}" (${gradeData.gradeValue}%)`,
				{ classId: gradeData.classId, studentId: gradeData.studentId },
			)

			return docRef.id
		} catch (error) {
			console.error('Error adding grade:', error)
			return null
		}
	}

	/**
	 * Update a grade
	 */
	async updateGrade(gradeId: string, updates: Partial<Grade>): Promise<boolean> {
		try {
			const gradeRef = doc(this.firestore, 'grades', gradeId)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, tenantId, createdAt, ...updateData } = updates

			// Recalculate grade letter if gradeValue changed
			if (updates.gradeValue !== undefined) {
				updateData.gradeLetter = this.calculateGradeLetter(updates.gradeValue)
			}

			// Filter out undefined values from updateData
			const cleanUpdateData: Record<string, unknown> = { updatedAt: Date.now() }
			Object.entries(updateData).forEach(([key, value]) => {
				if (value !== undefined) {
					cleanUpdateData[key] = value
				}
			})

			await updateDoc(gradeRef, cleanUpdateData)

			// Log activity
			await this.activityLogger.logActivity(
				'update',
				'grade',
				gradeId,
				updates.gradeName || 'Calificación',
				`Actualizó calificación "${updates.gradeName || 'Calificación'}"`,
			)

			return true
		} catch (error) {
			console.error('Error updating grade:', error)
			return false
		}
	}

	/**
	 * Delete a grade
	 */
	async deleteGrade(gradeId: string, gradeName?: string): Promise<boolean> {
		try {
			const gradeRef = doc(this.firestore, 'grades', gradeId)
			await deleteDoc(gradeRef)

			// Log activity
			await this.activityLogger.logActivity(
				'delete',
				'grade',
				gradeId,
				gradeName || 'Calificación',
				`Eliminó calificación "${gradeName || 'Calificación'}"`,
			)

			return true
		} catch (error) {
			console.error('Error deleting grade:', error)
			return false
		}
	}

	/**
	 * Calculate student average for a class
	 */
	async calculateStudentAverage(studentId: string, classId: string): Promise<number> {
		const grades = await this.getGradesByStudent(studentId, classId)

		if (grades.length === 0) return 0

		// If weights are specified, use weighted average
		const hasWeights = grades.some((g) => g.weight !== undefined && g.weight > 0)

		if (hasWeights) {
			let totalWeightedScore = 0
			let totalWeight = 0

			grades.forEach((grade) => {
				const weight = grade.weight || 0
				totalWeightedScore += grade.gradeValue * weight
				totalWeight += weight
			})

			return totalWeight > 0 ? totalWeightedScore / totalWeight : 0
		}

		// Simple average
		const sum = grades.reduce((acc, grade) => acc + grade.gradeValue, 0)
		return sum / grades.length
	}

	/**
	 * Calculate class average
	 */
	async calculateClassAverage(classId: string): Promise<number> {
		const grades = await this.getGradesByClass(classId)

		if (grades.length === 0) return 0

		const sum = grades.reduce((acc, grade) => acc + grade.gradeValue, 0)
		return sum / grades.length
	}

	/**
	 * Get student grade summaries for a class
	 */
	async getStudentGradeSummaries(classId: string, studentNames: Map<string, string>): Promise<StudentGradeSummary[]> {
		const grades = await this.getGradesByClass(classId)

		// Group grades by student
		const gradesByStudent = new Map<string, Grade[]>()
		grades.forEach((grade) => {
			if (!gradesByStudent.has(grade.studentId)) {
				gradesByStudent.set(grade.studentId, [])
			}
			gradesByStudent.get(grade.studentId)!.push(grade)
		})

		// Calculate summaries
		const summaries: StudentGradeSummary[] = []
		for (const [studentId, studentGrades] of gradesByStudent.entries()) {
			const average = await this.calculateStudentAverage(studentId, classId)
			summaries.push({
				studentId,
				studentName: studentNames.get(studentId) || 'Unknown',
				grades: studentGrades,
				average,
				gradeLetter: this.calculateGradeLetter(average),
			})
		}

		return summaries.sort((a, b) => a.studentName.localeCompare(b.studentName))
	}

	/**
	 * Calculate grade letter from numeric value
	 */
	calculateGradeLetter(value: number): string {
		if (value >= 90) return 'A'
		if (value >= 80) return 'B'
		if (value >= 70) return 'C'
		if (value >= 60) return 'D'
		return 'F'
	}

	/**
	 * Get grade letter color class
	 */
	getGradeLetterColor(letter: string): string {
		const colors: Record<string, string> = {
			A: 'text-green-600',
			B: 'text-blue-600',
			C: 'text-yellow-600',
			D: 'text-orange-600',
			F: 'text-red-600',
		}
		return colors[letter] || 'text-gray-600'
	}

	/**
	 * Get grade type label in Spanish
	 */
	getGradeTypeLabel(type: GradeType): string {
		const labels: Record<GradeType, string> = {
			exam: 'Examen',
			quiz: 'Quiz',
			homework: 'Tarea',
			project: 'Proyecto',
			participation: 'Participación',
			final: 'Final',
		}
		return labels[type]
	}
}
