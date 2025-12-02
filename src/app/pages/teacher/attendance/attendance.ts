import { Component, signal } from '@angular/core'

@Component({
	selector: 'app-teacher-attendance',
	imports: [],
	templateUrl: './attendance.html',
	styleUrl: './attendance.sass',
})
export class TeacherAttendanceTab {
	protected readonly loading = signal(false)
}
