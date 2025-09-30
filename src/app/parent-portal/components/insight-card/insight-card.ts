import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { InsightCard } from '../../models/InsightCard/insight-card.interface';

@Component({
  selector: 'app-insight-card',
  standalone: true,
  imports: [NgClass],
  template: `
    <article class="rounded-2xl border border-[#eef1ff] bg-[#f6f8ff] px-5 py-5 text-sm text-[#6f7ba5] shadow-sm">
      <p class="font-semibold text-[#1f2a55]">{{ card.title }}</p>
      <p class="mt-3 text-3xl font-bold text-[#335ef7]">{{ card.value }}</p>
      <p class="mt-4 flex items-center gap-1">
        <span class="material-symbols-outlined text-base" [ngClass]="trendClass">{{ trendIcon }}</span>
        <span class="font-semibold" [ngClass]="trendClass">{{ card.trendValue }}</span>
        <span class="text-xs uppercase tracking-[0.2em]">{{ card.trendLabel }}</span>
      </p>
    </article>
  `,
  styleUrl: './insight-card.sass',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightCardComponent {
  @Input({ required: true }) card!: InsightCard;

  protected get trendClass(): string {
    return this.card.trendPositive ? 'text-[#21b17c]' : 'text-[#ff6174]';
  }

  protected get trendIcon(): string {
    return this.card.trendPositive ? 'trending_up' : 'trending_down';
  }
}
