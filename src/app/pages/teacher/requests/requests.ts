import { Component, signal } from '@angular/core'

@Component({
	selector: 'app-teacher-requests',
	imports: [],
	templateUrl: './requests.html',
	styleUrl: './requests.sass',
})
export class TeacherRequestsTab {
	protected readonly loading = signal(false)
}
