import { Injectable, inject } from '@angular/core'
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore'
import { AuthService } from './auth.service'
import { Student } from './student.service'

@Injectable({
	providedIn: 'root',
})
export class ParentDataService {
	private readonly firestore = inject(Firestore)
	private readonly auth = inject(AuthService)

	private childrenCache: Student[] | null = null
	private cacheTimestamp = 0
	private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

	/**
	 * Get the current parent's email from auth
	 */
	async getCurrentParentEmail(): Promise<string | null> {
    const user = this.auth.currentUser()
		return user?.email || null
	}

	/**
	 * Get all children for the current parent by matching parentEmail
	 * Note: Parents are registered separately and don't have tenantId,
	 * so we only filter by parentEmail and status
	 */
	async getChildrenByParentEmail(): Promise<Student[]> {
		// Check cache first
		if (this.childrenCache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
			return this.childrenCache
		}

		const parentEmail = await this.getCurrentParentEmail()
		if (!parentEmail) return []

		try {
			const studentsRef = collection(this.firestore, 'students')
			const studentsQuery = query(
				studentsRef,
				where('parentEmail', '==', parentEmail),
				where('status', '==', 'active'),
			)
			const snapshot = await getDocs(studentsQuery)

			const children: Student[] = []
			snapshot.forEach((doc) => {
				children.push({ id: doc.id, ...doc.data() } as Student)
			})

			// Cache the results
			this.childrenCache = children
			this.cacheTimestamp = Date.now()

			return children
		} catch (error) {
			console.error('Error fetching children:', error)
			return []
		}
	}

	/**
	 * Clear the cached children data
	 */
	clearCache(): void {
		this.childrenCache = null
		this.cacheTimestamp = 0
	}

	/**
	 * Get a specific child by ID (with validation that parent owns this child)
	 */
	async getChildById(childId: string): Promise<Student | null> {
		const children = await this.getChildrenByParentEmail()
		return children.find((c) => c.id === childId) || null
	}
}
