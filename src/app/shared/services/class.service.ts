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

export interface ClassSchedule {
  day: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado';
  startTime: string;
  endTime: string;
  room?: string;
}

export interface Class {
  id?: string;
  tenantId: string;
  className: string;
  subjectId: string;
  gradeLevelId: string;
  section: string;
  teacherId?: string;
  schedule: ClassSchedule[];
  maxStudents: number;
  academicYear: string;
  semester: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClassService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly activityLogger = inject(ActivityLoggerService);

  /**
   * Get all classes for the current school
   */
  async getClasses(): Promise<Class[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const classesRef = collection(this.firestore, 'classes');
      const classesQuery = query(
        classesRef,
        where('tenantId', '==', tenantId),
        orderBy('className', 'asc'),
      );
      const snapshot = await getDocs(classesQuery);

      const classes: Class[] = [];
      snapshot.forEach((doc) => {
        classes.push({ id: doc.id, ...doc.data() } as Class);
      });

      return classes;
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  /**
   * Get active classes only
   */
  async getActiveClasses(): Promise<Class[]> {
    const classes = await this.getClasses();
    return classes.filter((c) => c.status === 'active');
  }

  /**
   * Get classes by grade level
   */
  async getClassesByGradeLevel(gradeLevelId: string): Promise<Class[]> {
    const classes = await this.getClasses();
    return classes.filter((c) => c.gradeLevelId === gradeLevelId);
  }

  /**
   * Get classes by subject
   */
  async getClassesBySubject(subjectId: string): Promise<Class[]> {
    const classes = await this.getClasses();
    return classes.filter((c) => c.subjectId === subjectId);
  }

  /**
   * Get classes by teacher
   */
  async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    const classes = await this.getClasses();
    return classes.filter((c) => c.teacherId === teacherId);
  }

  /**
   * Add a new class
   */
  async addClass(classData: Omit<Class, 'id' | 'tenantId' | 'createdAt'>): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    const tenantId = user.uid;

    try {
      const classesRef = collection(this.firestore, 'classes');
      const docRef = await addDoc(classesRef, {
        ...classData,
        tenantId,
        createdAt: Date.now(),
      });

      // Log activity
      await this.activityLogger.logCreate('class', docRef.id, classData.className);

      return docRef.id;
    } catch (error) {
      console.error('Error adding class:', error);
      return null;
    }
  }

  /**
   * Update a class
   */
  async updateClass(classId: string, updates: Partial<Class>): Promise<boolean> {
    try {
      const classRef = doc(this.firestore, 'classes', classId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, createdAt, ...updateData } = updates;
      await updateDoc(classRef, updateData);

      // Log activity
      await this.activityLogger.logUpdate('class', classId, updates.className || 'Clase');

      return true;
    } catch (error) {
      console.error('Error updating class:', error);
      return false;
    }
  }

  /**
   * Delete a class
   */
  async deleteClass(classId: string, className?: string): Promise<boolean> {
    try {
      const classRef = doc(this.firestore, 'classes', classId);
      await deleteDoc(classRef);

      // Log activity
      await this.activityLogger.logDelete('class', classId, className || 'Clase');

      return true;
    } catch (error) {
      console.error('Error deleting class:', error);
      return false;
    }
  }

  /**
   * Update class status
   */
  async updateClassStatus(
    classId: string,
    status: 'active' | 'completed' | 'cancelled',
  ): Promise<boolean> {
    return this.updateClass(classId, { status });
  }

  /**
   * Assign teacher to a class
   */
  async assignTeacher(classId: string, teacherId: string): Promise<boolean> {
    return this.updateClass(classId, { teacherId });
  }

  /**
   * Get current academic year
   */
  getCurrentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // Academic year starts in August (month 8)
    if (month >= 8) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }
}
