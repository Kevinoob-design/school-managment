import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryConstraint,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export type ActivityType =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'enrollment'
  | 'assignment';

export type ActivityEntity =
  | 'student'
  | 'teacher'
  | 'class'
  | 'grade_level'
  | 'subject'
  | 'user'
  | 'announcement'
  | 'enrollment'
  | 'grade'
  | 'attendance'
  | 'absence_request';

export interface Activity {
  id?: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: ActivityType;
  entity: ActivityEntity;
  entityId: string;
  entityName: string;
  description: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilters {
  type?: ActivityType;
  entity?: ActivityEntity;
  startDate?: number;
  endDate?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityLoggerService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Log an activity
   */
  async logActivity(
    type: ActivityType,
    entity: ActivityEntity,
    entityId: string,
    entityName: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    const tenantId = user.uid;

    try {
      const activitiesRef = collection(this.firestore, 'activities');
      const activityData: Omit<Activity, 'id' | 'timestamp'> & { timestamp: Timestamp } = {
        tenantId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuario',
        userEmail: user.email || '',
        type,
        entity,
        entityId,
        entityName: entityName || '',
        description: description || '',
        timestamp: Timestamp.now(),
        metadata: metadata || {},
      };

      await addDoc(activitiesRef, activityData);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Get activities with optional filters and pagination
   */
  async getActivities(
    filters?: ActivityFilters,
    limitCount = 20,
    lastDoc?: unknown,
  ): Promise<Activity[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const activitiesRef = collection(this.firestore, 'activities');
      const constraints: QueryConstraint[] = [
        where('tenantId', '==', tenantId),
        orderBy('timestamp', 'desc'),
      ];

      // Apply filters
      if (filters?.type) {
        constraints.push(where('type', '==', filters.type));
      }
      if (filters?.entity) {
        constraints.push(where('entity', '==', filters.entity));
      }
      if (filters?.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromMillis(filters.startDate)));
      }
      if (filters?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromMillis(filters.endDate)));
      }

      // Pagination
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      constraints.push(limit(limitCount));

      const activitiesQuery = query(activitiesRef, ...constraints);
      const snapshot = await getDocs(activitiesQuery);

      const activities: Activity[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          tenantId: data['tenantId'],
          userId: data['userId'],
          userName: data['userName'],
          userEmail: data['userEmail'],
          type: data['type'],
          entity: data['entity'],
          entityId: data['entityId'],
          entityName: data['entityName'],
          description: data['description'],
          timestamp: data['timestamp']?.toMillis?.() || data['timestamp'] || Date.now(),
          metadata: data['metadata'],
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  /**
   * Get recent activities (for dashboard)
   */
  async getRecentActivities(limitCount = 10): Promise<Activity[]> {
    return this.getActivities({}, limitCount);
  }

  // Convenience methods for common operations

  async logCreate(
    entity: ActivityEntity,
    entityId: string,
    entityName: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<ActivityEntity, string> = {
      student: `Inscribió al estudiante "${entityName}"`,
      teacher: `Agregó al profesor "${entityName}"`,
      class: `Creó la clase "${entityName}"`,
      grade_level: `Creó el nivel académico "${entityName}"`,
      subject: `Creó la asignatura "${entityName}"`,
      user: `Creó el usuario "${entityName}"`,
      announcement: `Creó el anuncio "${entityName}"`,
      enrollment: `Inscripción: ${entityName}`,
      grade: `Publicó calificación "${entityName}"`,
      attendance: `Registró asistencia "${entityName}"`,
      absence_request: `Creó solicitud de ausencia "${entityName}"`,
    };

    await this.logActivity('create', entity, entityId, entityName, descriptions[entity], metadata);
  }

  async logUpdate(
    entity: ActivityEntity,
    entityId: string,
    entityName: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<ActivityEntity, string> = {
      student: `Actualizó los datos del estudiante "${entityName}"`,
      teacher: `Actualizó los datos del profesor "${entityName}"`,
      class: `Actualizó la clase "${entityName}"`,
      grade_level: `Actualizó el nivel académico "${entityName}"`,
      subject: `Actualizó la asignatura "${entityName}"`,
      user: `Actualizó el usuario "${entityName}"`,
      announcement: `Actualizó el anuncio "${entityName}"`,
      enrollment: `Actualizó inscripción: ${entityName}`,
      grade: `Actualizó calificación "${entityName}"`,
      attendance: `Actualizó asistencia "${entityName}"`,
      absence_request: `Actualizó solicitud de ausencia "${entityName}"`,
    };

    await this.logActivity('update', entity, entityId, entityName, descriptions[entity], metadata);
  }

  async logDelete(
    entity: ActivityEntity,
    entityId: string,
    entityName: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<ActivityEntity, string> = {
      student: `Eliminó al estudiante "${entityName}"`,
      teacher: `Eliminó al profesor "${entityName}"`,
      class: `Eliminó la clase "${entityName}"`,
      grade_level: `Eliminó el nivel académico "${entityName}"`,
      subject: `Eliminó la asignatura "${entityName}"`,
      user: `Eliminó el usuario "${entityName}"`,
      announcement: `Eliminó el anuncio "${entityName}"`,
      enrollment: `Desinscripción: ${entityName}`,
      grade: `Eliminó calificación "${entityName}"`,
      attendance: `Eliminó asistencia "${entityName}"`,
      absence_request: `Eliminó solicitud de ausencia "${entityName}"`,
    };

    await this.logActivity('delete', entity, entityId, entityName, descriptions[entity], metadata);
  }

  async logStatusChange(
    entity: ActivityEntity,
    entityId: string,
    entityName: string,
    newStatus: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const statusText = newStatus === 'active' ? 'activó' : 'desactivó';
    const descriptions: Record<ActivityEntity, string> = {
      student: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} al estudiante "${entityName}"`,
      teacher: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} al profesor "${entityName}"`,
      class: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} la clase "${entityName}"`,
      grade_level: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} el nivel académico "${entityName}"`,
      subject: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} la asignatura "${entityName}"`,
      user: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} el usuario "${entityName}"`,
      announcement: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} el anuncio "${entityName}"`,
      enrollment: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} inscripción: ${entityName}`,
      grade: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} calificación "${entityName}"`,
      attendance: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} asistencia "${entityName}"`,
      absence_request: `${newStatus === 'approved' ? 'Aprobó' : newStatus === 'rejected' ? 'Rechazó' : 'Actualizó'} solicitud de ausencia "${entityName}"`,
    };

    await this.logActivity('status_change', entity, entityId, entityName, descriptions[entity], {
      ...metadata,
      newStatus,
    });
  }
}
