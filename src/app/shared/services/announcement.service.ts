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
	limit,
} from '@angular/fire/firestore'
import { AuthService } from './auth.service'
import { ActivityLoggerService } from './activity-logger.service'

export interface Announcement {
	id?: string
	tenantId: string
	title: string
	content: string
	excerpt: string
	date: string // ISO date string YYYY-MM-DD
	type: 'urgent' | 'info' | 'event'
	targetAudience: 'all' | 'teachers' | 'parents' | 'students'
	status: 'draft' | 'published' | 'archived'
	createdAt: number
	updatedAt: number
}

@Injectable({
	providedIn: 'root',
})
export class AnnouncementService {
	private readonly firestore = inject(Firestore)
	private readonly auth = inject(AuthService)
	private readonly activityLogger = inject(ActivityLoggerService)

	/**
	 * Get all announcements for the current school
	 */
	async getAnnouncements(): Promise<Announcement[]> {
		const user = this.auth.currentUser()
		if (!user) return []

		const tenantId = user.uid

		try {
			const announcementsRef = collection(this.firestore, 'announcements')
			const announcementsQuery = query(
				announcementsRef,
				where('tenantId', '==', tenantId),
				orderBy('date', 'desc'),
				orderBy('createdAt', 'desc'),
			)
			const snapshot = await getDocs(announcementsQuery)

			const announcements: Announcement[] = []
			snapshot.forEach((doc) => {
				announcements.push({ id: doc.id, ...doc.data() } as Announcement)
			})

			return announcements
		} catch (error) {
			console.error('Error fetching announcements:', error)
			return []
		}
	}

	/**
	 * Get public published announcements for landing page (all schools)
	 */
	async getPublicAnnouncements(limitCount = 3): Promise<Announcement[]> {
		try {
			const announcementsRef = collection(this.firestore, 'announcements')
			const announcementsQuery = query(
				announcementsRef,
				where('status', '==', 'published'),
				orderBy('date', 'desc'),
				orderBy('createdAt', 'desc'),
				limit(limitCount),
			)
			const snapshot = await getDocs(announcementsQuery)

			const announcements: Announcement[] = []
			snapshot.forEach((doc) => {
				announcements.push({ id: doc.id, ...doc.data() } as Announcement)
			})

			return announcements
		} catch (error) {
			console.error('Error fetching public announcements:', error)
			return []
		}
	}

	/**
	 * Get all published announcements (for public page)
	 */
	async getAllPublicAnnouncements(): Promise<Announcement[]> {
		try {
			const announcementsRef = collection(this.firestore, 'announcements')
			const announcementsQuery = query(
				announcementsRef,
				where('status', '==', 'published'),
				orderBy('date', 'desc'),
				orderBy('createdAt', 'desc'),
			)
			const snapshot = await getDocs(announcementsQuery)

			const announcements: Announcement[] = []
			snapshot.forEach((doc) => {
				announcements.push({ id: doc.id, ...doc.data() } as Announcement)
			})

			return announcements
		} catch (error) {
			console.error('Error fetching all public announcements:', error)
			return []
		}
	}

	/**
	 * Create a new announcement
	 */
	async createAnnouncement(
		announcementData: Omit<Announcement, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
	): Promise<string | null> {
		const user = this.auth.currentUser()
		if (!user) return null

		const tenantId = user.uid
		const now = Date.now()

		try {
			const announcementsRef = collection(this.firestore, 'announcements')
			const docRef = await addDoc(announcementsRef, {
				...announcementData,
				tenantId,
				createdAt: now,
				updatedAt: now,
			})

			// Log activity
			await this.activityLogger.logCreate('announcement', docRef.id, announcementData.title)

			return docRef.id
		} catch (error) {
			console.error('Error creating announcement:', error)
			return null
		}
	}

	/**
	 * Update an announcement
	 */
	async updateAnnouncement(
		announcementId: string,
		updates: Partial<Announcement>,
	): Promise<boolean> {
		try {
			const announcementRef = doc(this.firestore, 'announcements', announcementId)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, tenantId, createdAt, ...updateData } = updates
			await updateDoc(announcementRef, {
				...updateData,
				updatedAt: Date.now(),
			})

			// Log activity
			await this.activityLogger.logUpdate(
				'announcement',
				announcementId,
				updates.title || 'Anuncio',
			)

			return true
		} catch (error) {
			console.error('Error updating announcement:', error)
			return false
		}
	}

	/**
	 * Delete an announcement
	 */
	async deleteAnnouncement(announcementId: string, title?: string): Promise<boolean> {
		try {
			const announcementRef = doc(this.firestore, 'announcements', announcementId)
			await deleteDoc(announcementRef)

			// Log activity
			await this.activityLogger.logDelete('announcement', announcementId, title || 'Anuncio')

			return true
		} catch (error) {
			console.error('Error deleting announcement:', error)
			return false
		}
	}

	/**
	 * Update announcement status
	 */
	async updateAnnouncementStatus(
		announcementId: string,
		status: 'draft' | 'published' | 'archived',
		title?: string,
	): Promise<boolean> {
		const result = await this.updateAnnouncement(announcementId, { status })

		// Log activity
		if (result) {
			await this.activityLogger.logStatusChange(
				'announcement',
				announcementId,
				title || 'Anuncio',
				status,
			)
		}

		return result
	}

	/**
	 * Get announcements by status
	 */
	async getAnnouncementsByStatus(
		status: 'draft' | 'published' | 'archived',
	): Promise<Announcement[]> {
		const announcements = await this.getAnnouncements()
		return announcements.filter((announcement) => announcement.status === status)
	}

	/**
	 * Get announcements by type
	 */
	async getAnnouncementsByType(type: 'urgent' | 'info' | 'event'): Promise<Announcement[]> {
		const announcements = await this.getAnnouncements()
		return announcements.filter((announcement) => announcement.type === type)
	}
}
