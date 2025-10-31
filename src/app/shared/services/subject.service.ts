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

export interface Subject {
  id?: string;
  tenantId: string;
  name: string;
  code: string;
  description: string;
  gradeLevelIds: string[];
  color: string;
  isActive: boolean;
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class SubjectService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Get all subjects for the current school
   */
  async getSubjects(): Promise<Subject[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const subjectsRef = collection(this.firestore, 'subjects');
      const subjectsQuery = query(
        subjectsRef,
        where('tenantId', '==', tenantId),
        orderBy('name', 'asc'),
      );
      const snapshot = await getDocs(subjectsQuery);

      const subjects: Subject[] = [];
      snapshot.forEach((doc) => {
        subjects.push({ id: doc.id, ...doc.data() } as Subject);
      });

      return subjects;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }
  }

  /**
   * Get active subjects only
   */
  async getActiveSubjects(): Promise<Subject[]> {
    const subjects = await this.getSubjects();
    return subjects.filter((s) => s.isActive);
  }

  /**
   * Get subjects by grade level
   */
  async getSubjectsByGradeLevel(gradeLevelId: string): Promise<Subject[]> {
    const subjects = await this.getSubjects();
    return subjects.filter((s) => s.gradeLevelIds.includes(gradeLevelId));
  }

  /**
   * Add a new subject
   */
  async addSubject(
    subjectData: Omit<Subject, 'id' | 'tenantId' | 'createdAt'>,
  ): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    const tenantId = user.uid;

    try {
      const subjectsRef = collection(this.firestore, 'subjects');
      const docRef = await addDoc(subjectsRef, {
        ...subjectData,
        tenantId,
        createdAt: Date.now(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding subject:', error);
      return null;
    }
  }

  /**
   * Update a subject
   */
  async updateSubject(subjectId: string, updates: Partial<Subject>): Promise<boolean> {
    try {
      const subjectRef = doc(this.firestore, 'subjects', subjectId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, createdAt, ...updateData } = updates;
      await updateDoc(subjectRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating subject:', error);
      return false;
    }
  }

  /**
   * Delete a subject
   */
  async deleteSubject(subjectId: string): Promise<boolean> {
    try {
      const subjectRef = doc(this.firestore, 'subjects', subjectId);
      await deleteDoc(subjectRef);
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  }

  /**
   * Toggle subject active status
   */
  async toggleSubjectStatus(subjectId: string, isActive: boolean): Promise<boolean> {
    return this.updateSubject(subjectId, { isActive });
  }

  /**
   * Check if subject code is unique
   */
  async isCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    const subjects = await this.getSubjects();
    return !subjects.some((s) => s.code === code && s.id !== excludeId);
  }
}
