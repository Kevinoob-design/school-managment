import { Component, signal } from '@angular/core'

@Component({
	selector: 'app-teacher-classes',
	imports: [],
	templateUrl: './classes.html',
	styleUrl: './classes.sass',
})
export class TeacherClassesTab {
	protected readonly loading = signal(false)
}
