import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { TeacherComment } from '../../models/TeacherComment/teacher-comment.interface';

@Component({
  selector: 'app-teacher-comment-card',
  standalone: true,
  template: `
    <article class="rounded-3xl border border-[#eef1ff] bg-[#f6f8ff] p-6 text-sm text-[#6f7ba5] shadow-inner">
      <header class="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#335ef7]">
        <span class="material-symbols-outlined text-base">person</span>
        {{ comment.teacher }} &bull; {{ comment.subject }}
        <span class="ml-auto text-[#9aa4d4] normal-case">{{ comment.date }}</span>
      </header>
      <p class="mt-4 text-base text-[#1f2a55]">{{ comment.comment }}</p>
    </article>
  `,
  styleUrl: './teacher-comment-card.sass',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherCommentCardComponent {
  @Input({ required: true }) comment!: TeacherComment;
}
