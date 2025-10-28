import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-section',
  imports: [],
  templateUrl: './section.html',
  styleUrl: './section.sass',
  host: {
    '[class]': 'classes()',
  },
})
export class Section {
  spacing = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  background = input<'white' | 'gray' | 'blue' | 'transparent'>('transparent');
  container = input(true);

  protected classes = computed(() => {
    const spacingClasses = {
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
      xl: 'py-24',
    };

    const backgroundClasses = {
      white: 'bg-white',
      gray: 'bg-gray-50',
      blue: 'bg-blue-50',
      transparent: 'bg-transparent',
    };

    return `${spacingClasses[this.spacing()]} ${backgroundClasses[this.background()]} block`;
  });
}
