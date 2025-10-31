import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { Announcement } from '../../models/Announcement/announcement.interface';

@Component({
  selector: 'app-announcement-item',
  standalone: true,
  template: `
    <div class="rounded-2xl border border-[#eef1ff] bg-[#f6f8ff] px-5 py-4 text-sm text-[#1f2a55]">
      <p class="font-semibold">{{ announcement.title }}</p>
      <p class="mt-2 text-sm text-[#6f7ba5]">{{ announcement.description }}</p>
      <p class="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#335ef7]">
        <span class="material-symbols-outlined text-base">schedule</span>
        {{ announcement.timeLabel }}
      </p>
    </div>
  `,
  styleUrl: './announcement-item.sass',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementItemComponent {
  @Input({ required: true }) announcement!: Announcement;
}
