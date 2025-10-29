import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.sass',
  host: {
    '[class]': 'wrapperClasses()',
  },
})
export class Button {
  variant = input<'primary' | 'secondary' | 'outline' | 'ghost'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  disabled = input(false);
  fullWidth = input(false);

  protected wrapperClasses = computed(() => {
    return this.fullWidth() ? 'w-full inline-block' : 'inline-block';
  });

  protected buttonClasses = computed(() => {
    const baseInteractive =
      'inline-flex items-center justify-center font-medium cursor-pointer transition-colors transform transition-all duration-150 hover:shadow-md hover:-translate-y-px active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700',
      outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50',
      ghost: 'bg-transparent hover:bg-gray-100',
    } as const;

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded',
      md: 'px-4 py-2 text-base rounded-md',
      lg: 'px-6 py-3 text-lg rounded-lg',
    } as const;

    const widthClass = this.fullWidth() ? 'w-full' : '';

    return `${baseInteractive} ${variantClasses[this.variant()]} ${sizeClasses[this.size()]} ${widthClass}`;
  });
}
