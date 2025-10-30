import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.sass',
})
export class Footer {
  protected readonly currentYear = signal(new Date().getFullYear());
}
