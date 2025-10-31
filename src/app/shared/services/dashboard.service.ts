import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface DashboardStats {
  totalClasses: number;
  totalTeachers: number;
  totalStudents: number;
}

export interface RecentActivity {
  id: string;
  description: string;
  userName: string;
  timestamp: number;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

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
      const teachersRef = collection(this.firestore, 'users');
      const teachersQuery = query(
        teachersRef,
        where('tenantId', '==', tenantId),
        where('role', '==', 'teacher'),
      );
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
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }

    const tenantId = user.uid;

    try {
      const activitiesRef = collection(this.firestore, 'activities');
      const activitiesQuery = query(
        activitiesRef,
        where('tenantId', '==', tenantId),
        orderBy('timestamp', 'desc'),
        limit(limitCount),
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);

      const activities: RecentActivity[] = [];
      activitiesSnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          description: data['description'] || '',
          userName: data['userName'] || 'Usuario desconocido',
          timestamp: data['timestamp']?.toMillis?.() || data['timestamp'] || Date.now(),
          status: data['status'] || 'pendiente',
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Log a new activity
   */
  async logActivity(description: string, status = 'completado'): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    const tenantId = user.uid;

    try {
      const activitiesRef = collection(this.firestore, 'activities');
      const activityData = {
        tenantId,
        description,
        userName: user.displayName || user.email || 'Usuario',
        timestamp: Timestamp.now(),
        status,
      };

      await getDocs(query(activitiesRef, limit(1))); // Just to ensure collection exists
      // In a real implementation, you'd use addDoc here
      console.log('Activity logged:', activityData);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}
