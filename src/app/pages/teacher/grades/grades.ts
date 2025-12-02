import { Component, signal } from '@angular/core'

@Component({
	selector: 'app-teacher-grades',
	imports: [],
	templateUrl: './grades.html',
	styleUrl: './grades.sass',
})
export class TeacherGradesTab {
	protected readonly loading = signal(false)
}
