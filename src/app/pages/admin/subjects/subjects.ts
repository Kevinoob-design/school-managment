import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import { SubjectService, Subject } from '../../../shared/services/subject.service';
import { GradeLevelService, GradeLevel } from '../../../shared/services/grade-level.service';

@Component({
  selector: 'app-subjects-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './subjects.html',
  styleUrl: './subjects.sass',
})
export class SubjectsTab implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly gradeLevelService = inject(GradeLevelService);

  protected subjects = signal<Subject[]>([]);
  protected gradeLevels = signal<GradeLevel[]>([]);
  protected loading = signal(true);
  protected showModal = signal(false);
  protected editingSubject = signal<Subject | null>(null);

  // Form fields
  protected name = signal('');
  protected code = signal('');
  protected description = signal('');
  protected selectedGradeLevelIds = signal<Set<string>>(new Set());
  protected color = signal('#3B82F6');
  protected isActive = signal(true);
  protected formError = signal('');

  protected readonly colorOptions = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Naranja' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Púrpura' },
    { value: '#EC4899', label: 'Rosa' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    const [subjects, gradeLevels] = await Promise.all([
      this.subjectService.getSubjects(),
      this.gradeLevelService.getActiveGradeLevels(),
    ]);
    this.subjects.set(subjects);
    this.gradeLevels.set(gradeLevels);
    this.loading.set(false);
  }

  protected openAddModal(): void {
    this.resetForm();
    this.editingSubject.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(subject: Subject): void {
    this.editingSubject.set(subject);
    this.name.set(subject.name);
    this.code.set(subject.code);
    this.description.set(subject.description);
    this.selectedGradeLevelIds.set(new Set(subject.gradeLevelIds));
    this.color.set(subject.color);
    this.isActive.set(subject.isActive);
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.name.set('');
    this.code.set('');
    this.description.set('');
    this.selectedGradeLevelIds.set(new Set());
    this.color.set('#3B82F6');
    this.isActive.set(true);
    this.formError.set('');
  }

  protected toggleGradeLevel(gradeLevelId: string): void {
    const current = new Set(this.selectedGradeLevelIds());
    if (current.has(gradeLevelId)) {
      current.delete(gradeLevelId);
    } else {
      current.add(gradeLevelId);
    }
    this.selectedGradeLevelIds.set(current);
  }

  protected isGradeLevelSelected(gradeLevelId: string): boolean {
    return this.selectedGradeLevelIds().has(gradeLevelId);
  }

  protected async saveSubject(): Promise<void> {
    // Validation
    if (!this.name().trim() || !this.code().trim()) {
      this.formError.set('Nombre y código son requeridos');
      return;
    }

    if (this.selectedGradeLevelIds().size === 0) {
      this.formError.set('Selecciona al menos un nivel académico');
      return;
    }

    const subjectData = {
      name: this.name().trim(),
      code: this.code().trim().toUpperCase(),
      description: this.description().trim(),
      gradeLevelIds: Array.from(this.selectedGradeLevelIds()),
      color: this.color(),
      isActive: this.isActive(),
    };

    try {
      const editing = this.editingSubject();
      if (editing && editing.id) {
        await this.subjectService.updateSubject(editing.id, subjectData);
      } else {
        // Check code uniqueness
        const isUnique = await this.subjectService.isCodeUnique(subjectData.code);
        if (!isUnique) {
          this.formError.set('Este código ya está en uso');
          return;
        }
        await this.subjectService.addSubject(subjectData);
      }

      await this.loadData();
      this.closeModal();
    } catch (error) {
      this.formError.set('Error al guardar la asignatura');
      console.error(error);
    }
  }

  protected async deleteSubject(subject: Subject): Promise<void> {
    if (!subject.id) return;

    if (confirm(`¿Estás seguro de eliminar "${subject.name}"?`)) {
      await this.subjectService.deleteSubject(subject.id);
      await this.loadData();
    }
  }

  protected async toggleStatus(subject: Subject): Promise<void> {
    if (!subject.id) return;
    await this.subjectService.toggleSubjectStatus(subject.id, !subject.isActive);
    await this.loadData();
  }

  protected getGradeLevelNames(gradeLevelIds: string[]): string {
    const names = gradeLevelIds
      .map((id) => this.gradeLevels().find((gl) => gl.id === id)?.name)
      .filter(Boolean);
    return names.join(', ') || 'Sin niveles';
  }
}
