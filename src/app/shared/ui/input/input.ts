import { Component, input, output, computed, signal } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.sass',
})
export class Input {
  id = input(`input-${Math.random().toString(36).substring(2, 9)}`);
  type = input<'text' | 'email' | 'password' | 'tel' | 'number' | 'url'>('text');
  placeholder = input('');
  label = input('');
  value = input('');
  disabled = input(false);
  invalid = input(false);
  errorMessage = input('');
  helpText = input('');
  required = input(false);
  fullWidth = input(true);
  icon = input(''); // Material icon name
  size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly isFocused = signal(false);
  protected readonly showPassword = signal(false);

  // Emits new value on input
  valueChange = output<string>();

  protected readonly containerClasses = computed(() => {
    const width = this.fullWidth() ? 'w-full' : '';
    return width;
  });

  protected readonly inputClasses = computed(() => {
    const baseClasses =
      'block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2';

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    const stateClasses = this.invalid()
      ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-400';

    const disabledClasses = this.disabled() ? 'opacity-60 cursor-not-allowed bg-gray-100' : '';

    const iconPadding = this.icon() ? 'pl-11' : '';
    const passwordPadding = this.type() === 'password' ? 'pr-11' : '';

    return `${baseClasses} ${sizeClasses[this.size()]} ${stateClasses} ${disabledClasses} ${iconPadding} ${passwordPadding}`;
  });

  protected readonly labelClasses = computed(() => {
    const baseClasses = 'block font-medium mb-1.5';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };
    const colorClasses = this.invalid() ? 'text-red-700' : 'text-gray-700';
    return `${baseClasses} ${sizeClasses[this.size()]} ${colorClasses}`;
  });

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  protected onFocus(): void {
    this.isFocused.set(true);
  }

  protected onBlur(): void {
    this.isFocused.set(false);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected getPasswordInputType(): string {
    return this.showPassword() ? 'text' : 'password';
  }
}
