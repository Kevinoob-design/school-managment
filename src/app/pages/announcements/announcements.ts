import { Component, OnInit, inject, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { Button } from '../../shared/ui/button/button'
import { Card } from '../../shared/ui/card/card'
import { Section } from '../../shared/ui/section/section'
import { Input } from '../../shared/ui/input/input'
import { AnnouncementService, Announcement } from '../../shared/services/announcement.service'

@Component({
	selector: 'app-announcements-page',
	imports: [CommonModule, Button, Card, Section, Input],
	templateUrl: './announcements.html',
	styleUrl: './announcements.sass',
})
export class AnnouncementsPage implements OnInit {
	private readonly router = inject(Router)
	private readonly announcementService = inject(AnnouncementService)

	protected readonly announcements = signal<Announcement[]>([])
	protected readonly loading = signal(true)
	protected readonly searchQuery = signal('')
	protected readonly filterType = signal<'all' | 'urgent' | 'info' | 'event'>('all')
	protected readonly selectedAnnouncement = signal<Announcement | null>(null)
	protected readonly showDetailModal = signal(false)

	async ngOnInit(): Promise<void> {
		await this.loadAnnouncements()
	}

	private async loadAnnouncements(): Promise<void> {
		this.loading.set(true)
		try {
			const announcements = await this.announcementService.getAllPublicAnnouncements()
			this.announcements.set(announcements)
		} finally {
			this.loading.set(false)
		}
	}

	protected filteredAnnouncements = computed(() => {
		let filtered = this.announcements()

		// Filter by search query
		const query = this.searchQuery().toLowerCase().trim()
		if (query) {
			filtered = filtered.filter(
				(a) =>
					a.title.toLowerCase().includes(query) ||
					a.content.toLowerCase().includes(query) ||
					a.excerpt.toLowerCase().includes(query),
			)
		}

		// Filter by type
		if (this.filterType() !== 'all') {
			filtered = filtered.filter((a) => a.type === this.filterType())
		}

		return filtered
	})

	protected getTypeClass(type: string): string {
		const typeMap: Record<string, string> = {
			urgent: 'bg-red-100 text-red-800',
			event: 'bg-blue-100 text-blue-800',
			info: 'bg-green-100 text-green-800',
		}
		return typeMap[type] || typeMap['info']
	}

	protected getTypeLabel(type: string): string {
		const labelMap: Record<string, string> = {
			urgent: 'Urgente',
			info: 'Información',
			event: 'Evento',
		}
		return labelMap[type] || type
	}

	protected formatDate(dateString: string): string {
		if (!dateString) return ''
		try {
			const date = new Date(dateString)
			return date.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			})
		} catch {
			return dateString
		}
	}

	protected openDetailModal(announcement: Announcement): void {
		this.selectedAnnouncement.set(announcement)
		this.showDetailModal.set(true)
	}

	protected closeDetailModal(): void {
		this.showDetailModal.set(false)
		this.selectedAnnouncement.set(null)
	}

	protected async goBack(): Promise<void> {
		await this.router.navigate(['/'])
	}
}
