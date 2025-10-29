import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.sass',
  host: {
    '[class]': 'classes()',
  },
})
export class Input {
  type = input<'text' | 'email' | 'password' | 'tel'>('text');
  placeholder = input('');
  value = input('');
  disabled = input(false);
  invalid = input(false);
  fullWidth = input(true);

  // Emits new value on input
  valueChange = output<string>();

  protected classes = computed(() => {
    const base = 'block rounded-md border px-3 py-2 text-base transition-colors';
    // remove focus ring to match outer card/border styling
    const state = this.invalid() ? 'border-red-500' : 'border-gray-300';
    const width = this.fullWidth() ? 'w-full' : '';
    return `${base} ${state} ${width}`;
  });

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
