import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import {
  GradeLevelService,
  GradeLevel,
  GradeStage,
} from '../../../shared/services/grade-level.service';

@Component({
  selector: 'app-grade-levels-tab',
  imports: [CommonModule, Button, Input],
  templateUrl: './grade-levels.html',
  styleUrl: './grade-levels.sass',
})
export class GradeLevelsTab implements OnInit {
  private readonly gradeLevelService = inject(GradeLevelService);

  protected gradeLevels = signal<GradeLevel[]>([]);
  protected loading = signal(true);
  protected showModal = signal(false);
  protected editingGradeLevel = signal<GradeLevel | null>(null);

  // Form fields
  protected name = signal('');
  protected level = signal('');
  protected stage = signal<GradeStage>('primaria');
  protected order = signal('');
  protected isActive = signal(true);
  protected formError = signal('');

  protected readonly stageOptions: { value: GradeStage; label: string }[] = [
    { value: 'primaria', label: 'Primaria' },
    { value: 'secundaria', label: 'Secundaria' },
    { value: 'bachillerato', label: 'Bachillerato' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadGradeLevels();
  }

  private async loadGradeLevels(): Promise<void> {
    this.loading.set(true);
    const levels = await this.gradeLevelService.getGradeLevels();
    this.gradeLevels.set(levels);
    this.loading.set(false);
  }

  protected openAddModal(): void {
    this.resetForm();
    this.editingGradeLevel.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(gradeLevel: GradeLevel): void {
    this.editingGradeLevel.set(gradeLevel);
    this.name.set(gradeLevel.name);
    this.level.set(gradeLevel.level.toString());
    this.stage.set(gradeLevel.stage);
    this.order.set(gradeLevel.order.toString());
    this.isActive.set(gradeLevel.isActive);
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.name.set('');
    this.level.set('');
    this.stage.set('primaria');
    this.order.set('');
    this.isActive.set(true);
    this.formError.set('');
  }

  protected async saveGradeLevel(): Promise<void> {
    // Validation
    if (!this.name().trim() || !this.level() || !this.order()) {
      this.formError.set('Todos los campos son requeridos');
      return;
    }

    const levelNum = parseInt(this.level());
    const orderNum = parseInt(this.order());

    if (isNaN(levelNum) || levelNum < 1 || levelNum > 12) {
      this.formError.set('El nivel debe ser entre 1 y 12');
      return;
    }

    if (isNaN(orderNum) || orderNum < 1) {
      this.formError.set('El orden debe ser un número positivo');
      return;
    }

    const gradeLevelData = {
      name: this.name().trim(),
      level: levelNum,
      stage: this.stage(),
      order: orderNum,
      isActive: this.isActive(),
    };

    try {
      const editing = this.editingGradeLevel();
      if (editing && editing.id) {
        await this.gradeLevelService.updateGradeLevel(editing.id, gradeLevelData);
      } else {
        await this.gradeLevelService.addGradeLevel(gradeLevelData);
      }

      await this.loadGradeLevels();
      this.closeModal();
    } catch (error) {
      this.formError.set('Error al guardar el nivel');
      console.error(error);
    }
  }

  protected async deleteGradeLevel(gradeLevel: GradeLevel): Promise<void> {
    if (!gradeLevel.id) return;

    if (confirm(`¿Estás seguro de eliminar "${gradeLevel.name}"?`)) {
      await this.gradeLevelService.deleteGradeLevel(gradeLevel.id);
      await this.loadGradeLevels();
    }
  }

  protected async toggleStatus(gradeLevel: GradeLevel): Promise<void> {
    if (!gradeLevel.id) return;
    await this.gradeLevelService.toggleGradeLevelStatus(gradeLevel.id, !gradeLevel.isActive);
    await this.loadGradeLevels();
  }

  protected getStageLabel(stage: GradeStage): string {
    return this.stageOptions.find((s) => s.value === stage)?.label || stage;
  }

  protected getStageColor(stage: GradeStage): string {
    switch (stage) {
      case 'primaria':
        return 'bg-blue-100 text-blue-800';
      case 'secundaria':
        return 'bg-green-100 text-green-800';
      case 'bachillerato':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
