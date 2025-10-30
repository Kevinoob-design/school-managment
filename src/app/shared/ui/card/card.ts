import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.sass',
  host: {
    '[class]': 'classes()',
  },
})
export class Card {
  padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  shadow = input<'none' | 'sm' | 'md' | 'lg'>('md');
  hover = input(false);

  protected classes = computed(() => {
    const baseClasses = 'bg-white rounded-lg border border-gray-200';

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8',
    };

    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
    };

    const hoverClass = this.hover() ? 'transition-shadow hover:shadow-xl' : '';

    return `${baseClasses} ${paddingClasses[this.padding()]} ${shadowClasses[this.shadow()]} ${hoverClass}`;
  });
}
