import { Component, signal, inject, OnInit } from '@angular/core'
import { Button } from '../../shared/ui/button/button'
import { Section } from '../../shared/ui/section/section'
import { Input } from '../../shared/ui/input/input'
import { AuthService } from '../../shared/services/auth.service'
import { updateProfile, updateEmail, getAuth } from '@angular/fire/auth'
import { Firestore, doc, updateDoc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore'
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage'

@Component({
	selector: 'app-profile',
	imports: [Button, Section, Input],
	templateUrl: './profile.html',
	styleUrl: './profile.sass',
})
export class ProfilePage implements OnInit {
	private readonly authService = inject(AuthService)
	private readonly firestore = inject(Firestore)
	private readonly storage = inject(Storage)

	protected readonly displayName = signal('')
	protected readonly email = signal('')
	protected readonly phoneNumber = signal('')
	protected readonly photoURL = signal('')
	protected readonly photoFile = signal<File | null>(null)
	protected readonly role = signal('')
	protected readonly loading = signal(false)
	protected readonly formError = signal('')
	protected readonly formSuccess = signal('')

	async ngOnInit(): Promise<void> {
		await this.loadUserData()
	}

	private async loadUserData(): Promise<void> {
		const user = this.authService.currentUser()
		if (!user) return

		this.email.set(user.email || '')
		this.photoURL.set(user.photoURL || '')

		// Load data from Firestore users table (source of truth for name)
		try {
			const userDoc = doc(this.firestore, 'users', user.uid)
			const snap = await getDoc(userDoc)
			if (snap.exists()) {
				const data = snap.data() as { fullName?: string; phoneNumber?: string; role?: string }
				this.displayName.set(data.fullName || '')
				this.phoneNumber.set(data.phoneNumber || '')
				this.role.set(data.role || '')
			}
		} catch (error) {
			console.error('Error loading user data:', error)
		}
	}

	protected isEmailValid(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	}

	protected onPhoneInput(raw: string): void {
		const digits = raw.replace(/\D/g, '').slice(0, 10)
		let formatted = digits
		if (digits.length >= 1) {
			formatted = `(${digits.slice(0, 3)}`
			if (digits.length >= 4) formatted += `) ${digits.slice(3, 6)}`
			if (digits.length >= 7) formatted += `-${digits.slice(6, 10)}`
		}
		if (digits.length < 1) formatted = ''
		this.phoneNumber.set(formatted)
	}

	protected onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement
		if (input.files && input.files.length > 0) {
			const file = input.files[0]
			// Validate file type (images only)
			if (!file.type.startsWith('image/')) {
				this.formError.set('Solo se permiten archivos de imagen')
				input.value = ''
				return
			}
			// Validate file size (max 2MB for profile photos)
			if (file.size > 2 * 1024 * 1024) {
				this.formError.set('La imagen no debe superar los 2MB')
				input.value = ''
				return
			}
			this.photoFile.set(file)
			this.formError.set('')
			// Create preview URL
			const reader = new FileReader()
			reader.onload = (e) => {
				this.photoURL.set(e.target?.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	protected removePhoto(event?: Event): void {
		if (event) {
			event.preventDefault()
			event.stopPropagation()
		}
		this.photoFile.set(null)
		const user = this.authService.currentUser()
		if (user?.photoURL) {
			this.photoURL.set(user.photoURL)
		} else {
			this.photoURL.set('')
		}
		// Clear any file inputs
		const fileInputs = document.querySelectorAll('input[type="file"]')
		fileInputs.forEach((input) => {
			;(input as HTMLInputElement).value = ''
		})
	}

	protected canSubmit = (): boolean => {
		if (this.loading()) return false
		const nameOk = this.displayName().trim().length >= 2
		const emailOk = this.isEmailValid(this.email().trim())
		return nameOk && emailOk
	}

	protected async saveProfile(): Promise<void> {
		if (!this.canSubmit()) {
			this.formError.set('Por favor completa todos los campos correctamente')
			return
		}

		const user = this.authService.currentUser()
		if (!user) {
			this.formError.set('No se pudo obtener la información del usuario')
			return
		}

		this.loading.set(true)
		this.formError.set('')
		this.formSuccess.set('')

		try {
			// Upload photo if a new file was selected
			let photoURL = this.photoURL()
			const file = this.photoFile()
			if (file) {
				try {
					photoURL = await this.uploadProfilePhoto(file, user.uid)
				} catch (uploadError) {
					console.error('Error uploading photo:', uploadError)
					this.formError.set('Error al subir la foto de perfil')
					this.loading.set(false)
					return
				}
			}

			// Update Firebase Auth profile
			await updateProfile(user, {
				displayName: this.displayName().trim(),
				photoURL: photoURL || null,
			})

			// Reload user to get fresh data from Firebase
			await user.reload()
			
			// Force signal update by setting to null first, then to fresh user
			const auth = getAuth()
			const freshUser = auth.currentUser
			if (freshUser) {
				this.authService.currentUser.set(null)
				setTimeout(() => {
					this.authService.currentUser.set(freshUser)
				}, 0)
			}

			// Update email if changed
			const newEmail = this.email().trim().toLowerCase()
			if (newEmail !== user.email) {
				await updateEmail(user, newEmail)
			}

			// Update Firestore users document
			const userDoc = doc(this.firestore, 'users', user.uid)
			await updateDoc(userDoc, {
				fullName: this.displayName().trim(),
				email: newEmail,
				phoneNumber: this.phoneNumber().trim(),
			})

			// If user is a teacher, also update teachers table
			const role = this.role()
			if (role === 'teacher') {
				await this.updateTeacherProfile(user.uid, {
					fullName: this.displayName().trim(),
					phoneNumber: this.phoneNumber().trim(),
				})
			}

			this.formSuccess.set('Perfil actualizado exitosamente')
			// Clear the file after successful upload
			this.photoFile.set(null)
		} catch (error: unknown) {
			console.error('Error updating profile:', error)
			const err = error as { code?: string }
			if (err.code === 'auth/requires-recent-login') {
				this.formError.set(
					'Por seguridad, debes volver a iniciar sesión antes de cambiar el email',
				)
			} else {
				this.formError.set('Ocurrió un error al actualizar el perfil')
			}
		} finally {
			this.loading.set(false)
		}
	}

	private async uploadProfilePhoto(file: File, userId: string): Promise<string> {
		const timestamp = Date.now()
		const fileName = `${timestamp}_${file.name}`
		const filePath = `profile-photos/${userId}/${fileName}`
		const storageRef = ref(this.storage, filePath)

		await uploadBytes(storageRef, file)
		return await getDownloadURL(storageRef)
	}

	private async updateTeacherProfile(
		userId: string,
		updates: { fullName: string; phoneNumber: string },
	): Promise<void> {
		try {
			// Find teacher document by userId
			const teachersRef = collection(this.firestore, 'teachers')
			const teachersQuery = query(teachersRef, where('userId', '==', userId))
			const snapshot = await getDocs(teachersQuery)

			if (!snapshot.empty) {
				// Update the first matching teacher document
				const teacherDoc = snapshot.docs[0]
				const teacherRef = doc(this.firestore, 'teachers', teacherDoc.id)
				await updateDoc(teacherRef, {
					fullName: updates.fullName,
					phoneNumber: updates.phoneNumber,
				})
			}
		} catch (error) {
			console.error('Error updating teacher profile:', error)
			// Don't throw - this is a secondary update
		}
	}

	protected getRoleLabel(role: string): string {
		const labels: Record<string, string> = {
			admin: 'Administrador',
			teacher: 'Maestro',
			parent: 'Padre/Madre',
		}
		return labels[role] || role
	}
}
