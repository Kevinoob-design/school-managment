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
import { ActivityLoggerService } from './activity-logger.service';

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
  private readonly activityLogger = inject(ActivityLoggerService);

  /**
   * Get all subjects for the current school
   */
  async getSubjects(): Promise<Subject[]> {
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return [];

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
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return null;

    try {
      const subjectsRef = collection(this.firestore, 'subjects');
      const docRef = await addDoc(subjectsRef, {
        ...subjectData,
        tenantId,
        createdAt: Date.now(),
      });

      // Log activity
      await this.activityLogger.logCreate('subject', docRef.id, subjectData.name);

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

      // Log activity
      await this.activityLogger.logUpdate('subject', subjectId, updates.name || 'Asignatura');

      return true;
    } catch (error) {
      console.error('Error updating subject:', error);
      return false;
    }
  }

  /**
   * Delete a subject
   */
  async deleteSubject(subjectId: string, subjectName?: string): Promise<boolean> {
    try {
      const subjectRef = doc(this.firestore, 'subjects', subjectId);
      await deleteDoc(subjectRef);

      // Log activity
      await this.activityLogger.logDelete('subject', subjectId, subjectName || 'Asignatura');

      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  }

  /**
   * Toggle subject active status
   */
  async toggleSubjectStatus(
    subjectId: string,
    isActive: boolean,
    subjectName?: string,
  ): Promise<boolean> {
    const result = await this.updateSubject(subjectId, { isActive });

    // Log activity
    if (result) {
      const status = isActive ? 'active' : 'inactive';
      await this.activityLogger.logStatusChange(
        'subject',
        subjectId,
        subjectName || 'Asignatura',
        status,
      );
    }

    return result;
  }

  /**
   * Check if subject code is unique
   */
  async isCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    const subjects = await this.getSubjects();
    return !subjects.some((s) => s.code === code && s.id !== excludeId);
  }
}
