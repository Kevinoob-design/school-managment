import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { QuickAction } from '../../models/QuickAction/quick-action.interface';

@Component({
  selector: 'app-quick-action',
  standalone: true,
  template: `
    <button
      type="button"
      class="flex items-center gap-4 rounded-2xl border border-[#eef1ff] bg-[#f6f8ff] px-5 py-4 text-left text-sm text-[#1f2a55] transition hover:border-[#335ef7] hover:bg-[#335ef7]/10"
      (click)="actionTriggered.emit(action)"
    >
      <span class="material-symbols-outlined text-2xl text-[#335ef7]">{{ action.icon }}</span>
      <span>
        <span class="block font-semibold">{{ action.label }}</span>
        <span class="mt-1 block text-xs text-[#6f7ba5]">{{ action.description }}</span>
      </span>
      <span class="material-symbols-outlined ml-auto text-base text-[#9aa4d4]">arrow_forward</span>
    </button>
  `,
  styleUrl: './quick-action.sass',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionComponent {
  @Input({ required: true }) action!: QuickAction;
  @Output() readonly actionTriggered = new EventEmitter<QuickAction>();
}
