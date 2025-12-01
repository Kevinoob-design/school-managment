import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getFunctions, provideFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { isDevMode } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'school-managment-b8a01',
        appId: '1:635934339038:web:ba05277769844a92af774f',
        storageBucket: 'school-managment-b8a01.firebasestorage.app',
        apiKey: 'AIzaSyCWa9VFRyP7BK0x7IywvMnrJ0CGwJpfuVA',
        authDomain: 'school-managment-b8a01.firebaseapp.com',
        messagingSenderId: '635934339038',
        measurementId: 'G-2LRKEGHTT7',
      }),
    ),
    provideAuth(() => {
      const auth = getAuth();
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      return firestore;
    }),
    provideDatabase(() => getDatabase()),
    provideStorage(() => getStorage()),
    provideFunctions(() => {
      const functions = getFunctions();
      if (isDevMode()) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),
  ],
};
