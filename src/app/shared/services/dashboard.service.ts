import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { ActivityLoggerService, Activity as LogActivity } from './activity-logger.service';

export interface DashboardStats {
  totalClasses: number;
  totalTeachers: number;
  totalStudents: number;
}

export type RecentActivity = LogActivity;

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly activityLogger = inject(ActivityLoggerService);

  /**
   * Get dashboard statistics for the current school
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const user = this.auth.currentUser();
    if (!user) {
      return { totalClasses: 0, totalTeachers: 0, totalStudents: 0 };
    }

    const tenantId = user.uid;

    try {
      // Count classes
      const classesRef = collection(this.firestore, 'classes');
      const classesQuery = query(classesRef, where('tenantId', '==', tenantId));
      const classesSnapshot = await getDocs(classesQuery);
      const totalClasses = classesSnapshot.size;

      // Count teachers
      const teachersRef = collection(this.firestore, 'teachers');
      const teachersQuery = query(teachersRef, where('tenantId', '==', tenantId));
      const teachersSnapshot = await getDocs(teachersQuery);
      const totalTeachers = teachersSnapshot.size;

      // Count students
      const studentsRef = collection(this.firestore, 'students');
      const studentsQuery = query(studentsRef, where('tenantId', '==', tenantId));
      const studentsSnapshot = await getDocs(studentsQuery);
      const totalStudents = studentsSnapshot.size;

      return {
        totalClasses,
        totalTeachers,
        totalStudents,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { totalClasses: 0, totalTeachers: 0, totalStudents: 0 };
    }
  }

  /**
   * Get recent activities for the current school
   */
  async getRecentActivities(limitCount = 10): Promise<RecentActivity[]> {
    return this.activityLogger.getRecentActivities(limitCount);
  }
}
