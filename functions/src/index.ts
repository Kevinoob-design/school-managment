/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

interface CreateTeacherAccountData {
  email: string;
  password: string;
  teacherId: string;
  teacherName: string;
  tenantId: string;
}

interface ResetTeacherPasswordData {
  teacherUserId: string;
  teacherId: string;
  newPassword: string;
}

/**
 * Create a teacher account with Firebase Authentication
 * Only the admin who owns the teacher can call this function
 */
export const createTeacherAccount = onCall<CreateTeacherAccountData>(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { email, password, teacherId, teacherName, tenantId } = request.data;

  // Validate that caller is the admin who owns this teacher
  if (request.auth.uid !== tenantId) {
    throw new HttpsError('permission-denied', 'No tienes permisos para crear esta cuenta');
  }

  // Validate admin role
  const adminDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();

  if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Solo administradores pueden crear cuentas de profesores',
    );
  }

  // Verify the teacher belongs to this admin
  const teacherDoc = await admin.firestore().collection('teachers').doc(teacherId).get();

  if (!teacherDoc.exists) {
    throw new HttpsError('not-found', 'Profesor no encontrado');
  }

  if (teacherDoc.data()?.tenantId !== tenantId) {
    throw new HttpsError('permission-denied', 'Este profesor no pertenece a tu escuela');
  }

  try {
    // Create the user with Firebase Auth Admin SDK
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: teacherName,
    });

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      fullName: teacherName,
      email: email,
      phoneNumber: '',
      role: 'teacher',
      createdAt: Date.now(),
      tenantId: tenantId,
    });

    // Link userId to teacher record
    await admin.firestore().collection('teachers').doc(teacherId).update({
      userId: userRecord.uid,
    });

    // Log activity
    await admin
      .firestore()
      .collection('activities')
      .add({
        tenantId: tenantId,
        userId: request.auth.uid,
        userName: adminDoc.data()?.fullName || 'Admin',
        userEmail: request.auth.token.email || '',
        type: 'create',
        entity: 'user',
        entityId: userRecord.uid,
        entityName: teacherName,
        description: `Creó cuenta de acceso para el profesor "${teacherName}"`,
        timestamp: Date.now(),
        metadata: {
          role: 'teacher',
          teacherId: teacherId,
        },
      });

    logger.info('Teacher account created', {
      teacherId,
      userId: userRecord.uid,
      email,
    });

    return {
      success: true,
      userId: userRecord.uid,
    };
  } catch (error: any) {
    logger.error('Error creating teacher account', error);

    let errorMessage = 'Error al crear la cuenta';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Este correo ya está registrado';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Correo electrónico inválido';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres';
    }

    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Reset a teacher's password
 * Only the admin who owns the teacher can call this function
 */
export const resetTeacherPassword = onCall<ResetTeacherPasswordData>(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { teacherUserId, teacherId, newPassword } = request.data;

  // Validate admin role
  const adminDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();

  if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Solo administradores pueden restablecer contraseñas',
    );
  }

  // Verify the teacher belongs to this admin
  const teacherDoc = await admin.firestore().collection('teachers').doc(teacherId).get();

  if (!teacherDoc.exists) {
    throw new HttpsError('not-found', 'Profesor no encontrado');
  }

  const teacherData = teacherDoc.data();
  if (teacherData?.tenantId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Este profesor no pertenece a tu escuela');
  }

  if (teacherData?.userId !== teacherUserId) {
    throw new HttpsError('invalid-argument', 'El ID de usuario no coincide con el profesor');
  }

  try {
    // Update password with Firebase Auth Admin SDK
    await admin.auth().updateUser(teacherUserId, {
      password: newPassword,
    });

    // Log activity
    await admin
      .firestore()
      .collection('activities')
      .add({
        tenantId: request.auth.uid,
        userId: request.auth.uid,
        userName: adminDoc.data()?.fullName || 'Admin',
        userEmail: request.auth.token.email || '',
        type: 'update',
        entity: 'user',
        entityId: teacherUserId,
        entityName: teacherData?.fullName || 'Profesor',
        description: `Restableció la contraseña del profesor "${teacherData?.fullName}"`,
        timestamp: Date.now(),
        metadata: {
          role: 'teacher',
          teacherId: teacherId,
          action: 'password_reset',
        },
      });

    logger.info('Teacher password reset', {
      teacherId,
      userId: teacherUserId,
    });

    return {
      success: true,
    };
  } catch (error: any) {
    logger.error('Error resetting teacher password', error);

    let errorMessage = 'Error al restablecer la contraseña';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Usuario no encontrado';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres';
    }

    throw new HttpsError('internal', errorMessage);
  }
});
