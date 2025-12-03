import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  orderBy,
  getDoc,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { ActivityLoggerService } from './activity-logger.service';
import { ClassService } from './class.service';
import { StudentService } from './student.service';

export interface Enrollment {
  id?: string;
  tenantId: string;
  classId: string;
  studentId: string;
  enrolledAt: number;
  status: 'enrolled' | 'dropped' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface EnrollmentWithDetails extends Enrollment {
  studentName?: string;
  className?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly activityLogger = inject(ActivityLoggerService);
  private readonly classService = inject(ClassService);
  private readonly studentService = inject(StudentService);

  /**
   * Enroll a student in a class with validations
   */
  async enrollStudent(classId: string, studentId: string): Promise<string | null> {
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return null;

    try {
      // Get class and student data
      const [classData, student] = await Promise.all([
        this.getClassById(classId),
        this.getStudentById(studentId),
      ]);

      if (!classData || !student) {
        throw new Error('Clase o estudiante no encontrado');
      }

      // Validation 1: Check if student and class are active
      if (student.status !== 'active') {
        throw new Error('El estudiante debe estar activo');
      }

      if (classData.status !== 'active') {
        throw new Error('La clase debe estar activa');
      }

      // Validation 2: Check grade level match
      if (student.gradeLevel !== classData.gradeLevelId) {
        throw new Error('El nivel académico del estudiante no coincide con el de la clase');
      }

      // Validation 3: Check if already enrolled
      const isAlreadyEnrolled = await this.isStudentEnrolled(classId, studentId);
      if (isAlreadyEnrolled) {
        throw new Error('El estudiante ya está inscrito en esta clase');
      }

      // Validation 4: Check class capacity
      const isFull = await this.isClassFull(classId);
      if (isFull) {
        throw new Error('La clase ha alcanzado su capacidad máxima');
      }

      // Create enrollment
      const enrollmentsRef = collection(this.firestore, 'enrollments');
      const now = Date.now();
      const docRef = await addDoc(enrollmentsRef, {
        tenantId,
        classId,
        studentId,
        enrolledAt: now,
        status: 'enrolled',
        createdAt: now,
        updatedAt: now,
      });

      // Log activity
      await this.activityLogger.logActivity(
        'enrollment',
        'enrollment',
        docRef.id,
        `${student.fullName} - ${classData.className}`,
        `Inscribió al estudiante "${student.fullName}" en la clase "${classData.className}"`,
        { classId, studentId },
      );

      return docRef.id;
    } catch (error) {
      console.error('Error enrolling student:', error);
      throw error;
    }
  }

  /**
   * Unenroll a student from a class
   */
  async unenrollStudent(
    enrollmentId: string,
    studentName?: string,
    className?: string,
  ): Promise<boolean> {
    try {
      const enrollmentRef = doc(this.firestore, 'enrollments', enrollmentId);
      await deleteDoc(enrollmentRef);

      // Log activity
      await this.activityLogger.logActivity(
        'delete',
        'enrollment',
        enrollmentId,
        `${studentName} - ${className}`,
        `Desinscribió al estudiante "${studentName}" de la clase "${className}"`,
      );

      return true;
    } catch (error) {
      console.error('Error unenrolling student:', error);
      return false;
    }
  }

  /**
   * Get all enrollments for a class
   */
  async getClassEnrollments(classId: string): Promise<Enrollment[]> {
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return [];

    try {
      const enrollmentsRef = collection(this.firestore, 'enrollments');
      const enrollmentsQuery = query(
        enrollmentsRef,
        where('tenantId', '==', tenantId),
        where('classId', '==', classId),
        where('status', '==', 'enrolled'),
        orderBy('enrolledAt', 'desc'),
      );
      const snapshot = await getDocs(enrollmentsQuery);

      const enrollments: Enrollment[] = [];
      snapshot.forEach((doc) => {
        enrollments.push({ id: doc.id, ...doc.data() } as Enrollment);
      });

      return enrollments;
    } catch (error) {
      console.error('Error fetching class enrollments:', error);
      return [];
    }
  }

  /**
   * Get all enrollments for a student
   */
  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return [];

    try {
      const enrollmentsRef = collection(this.firestore, 'enrollments');
      const enrollmentsQuery = query(
        enrollmentsRef,
        where('tenantId', '==', tenantId),
        where('studentId', '==', studentId),
        where('status', '==', 'enrolled'),
        orderBy('enrolledAt', 'desc'),
      );
      const snapshot = await getDocs(enrollmentsQuery);

      const enrollments: Enrollment[] = [];
      snapshot.forEach((doc) => {
        enrollments.push({ id: doc.id, ...doc.data() } as Enrollment);
      });

      return enrollments;
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      return [];
    }
  }

  /**
   * Get enrollment count for a class
   */
  async getEnrollmentCount(classId: string): Promise<number> {
    const enrollments = await this.getClassEnrollments(classId);
    return enrollments.length;
  }

  /**
   * Check if class is full
   */
  async isClassFull(classId: string): Promise<boolean> {
    const classData = await this.getClassById(classId);
    if (!classData) return true;

    const count = await this.getEnrollmentCount(classId);
    return count >= classData.maxStudents;
  }

  /**
   * Check if student is already enrolled in class
   */
  async isStudentEnrolled(classId: string, studentId: string): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    const tenantId = user.uid;

    try {
      const enrollmentsRef = collection(this.firestore, 'enrollments');
      const enrollmentsQuery = query(
        enrollmentsRef,
        where('tenantId', '==', tenantId),
        where('classId', '==', classId),
        where('studentId', '==', studentId),
        where('status', '==', 'enrolled'),
      );
      const snapshot = await getDocs(enrollmentsQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
  }

  /**
   * Get enrollment counts for multiple classes
   */
  async getEnrollmentCounts(classIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    await Promise.all(
      classIds.map(async (classId) => {
        const count = await this.getEnrollmentCount(classId);
        counts.set(classId, count);
      }),
    );

    return counts;
  }

  /**
   * Get class data helper
   */
  private async getClassById(classId: string): Promise<{
    id: string;
    gradeLevelId: string;
    maxStudents: number;
    className: string;
    status: string;
  } | null> {
    try {
      const classRef = doc(this.firestore, 'classes', classId);
      const snapshot = await getDoc(classRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as {
          id: string;
          gradeLevelId: string;
          maxStudents: number;
          className: string;
          status: string;
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching class:', error);
      return null;
    }
  }

  /**
   * Get student data helper
   */
  private async getStudentById(studentId: string): Promise<{
    id: string;
    fullName: string;
    gradeLevel: string;
    status: string;
  } | null> {
    try {
      const studentRef = doc(this.firestore, 'students', studentId);
      const snapshot = await getDoc(studentRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as {
          id: string;
          fullName: string;
          gradeLevel: string;
          status: string;
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  }

  /**
   * Get enrollment capacity percentage
   */
  async getCapacityPercentage(classId: string): Promise<number> {
    const classData = await this.getClassById(classId);
    if (!classData) return 0;

    const count = await this.getEnrollmentCount(classId);
    return Math.round((count / classData.maxStudents) * 100);
  }
}
