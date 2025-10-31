import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export type GradeStage = 'primaria' | 'secundaria' | 'bachillerato';

export interface GradeLevel {
  id?: string;
  tenantId: string;
  name: string;
  level: number;
  stage: GradeStage;
  order: number;
  isActive: boolean;
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class GradeLevelService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Get all grade levels for the current school
   */
  async getGradeLevels(): Promise<GradeLevel[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const gradeLevelsRef = collection(this.firestore, 'gradeLevels');
      const gradeLevelsQuery = query(
        gradeLevelsRef,
        where('tenantId', '==', tenantId),
        orderBy('order', 'asc'),
      );
      const snapshot = await getDocs(gradeLevelsQuery);

      const gradeLevels: GradeLevel[] = [];
      snapshot.forEach((doc) => {
        gradeLevels.push({ id: doc.id, ...doc.data() } as GradeLevel);
      });

      return gradeLevels;
    } catch (error) {
      console.error('Error fetching grade levels:', error);
      return [];
    }
  }

  /**
   * Get active grade levels only
   */
  async getActiveGradeLevels(): Promise<GradeLevel[]> {
    const gradeLevels = await this.getGradeLevels();
    return gradeLevels.filter((gl) => gl.isActive);
  }

  /**
   * Get grade levels by stage
   */
  async getGradeLevelsByStage(stage: GradeStage): Promise<GradeLevel[]> {
    const gradeLevels = await this.getGradeLevels();
    return gradeLevels.filter((gl) => gl.stage === stage);
  }

  /**
   * Add a new grade level
   */
  async addGradeLevel(
    gradeLevelData: Omit<GradeLevel, 'id' | 'tenantId' | 'createdAt'>,
  ): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    const tenantId = user.uid;

    try {
      const gradeLevelsRef = collection(this.firestore, 'gradeLevels');
      const docRef = await addDoc(gradeLevelsRef, {
        ...gradeLevelData,
        tenantId,
        createdAt: Date.now(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding grade level:', error);
      return null;
    }
  }

  /**
   * Update a grade level
   */
  async updateGradeLevel(gradeLevelId: string, updates: Partial<GradeLevel>): Promise<boolean> {
    try {
      const gradeLevelRef = doc(this.firestore, 'gradeLevels', gradeLevelId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, createdAt, ...updateData } = updates;
      await updateDoc(gradeLevelRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating grade level:', error);
      return false;
    }
  }

  /**
   * Delete a grade level
   */
  async deleteGradeLevel(gradeLevelId: string): Promise<boolean> {
    try {
      const gradeLevelRef = doc(this.firestore, 'gradeLevels', gradeLevelId);
      await deleteDoc(gradeLevelRef);
      return true;
    } catch (error) {
      console.error('Error deleting grade level:', error);
      return false;
    }
  }

  /**
   * Toggle grade level active status
   */
  async toggleGradeLevelStatus(gradeLevelId: string, isActive: boolean): Promise<boolean> {
    return this.updateGradeLevel(gradeLevelId, { isActive });
  }
}
