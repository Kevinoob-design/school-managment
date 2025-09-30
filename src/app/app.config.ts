import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { getAnalytics, initializeAnalytics } from 'firebase/analytics';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getStorage, provideStorage } from '@angular/fire/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideFirebaseApp(() => {
      const app = initializeApp(
        //   {
        //   projectId: 'school-managment-b8a01',
        //   appId: '1:635934339038:web:ba05277769844a92af774f',
        //   storageBucket: 'school-managment-b8a01.firebasestorage.app',
        //   apiKey: 'AIzaSyCWa9VFRyP7BK0x7IywvMnrJ0CGwJpfuVA',
        //   authDomain: 'school-managment-b8a01.firebaseapp.com',
        //   messagingSenderId: '635934339038',
        //   measurementId: 'G-2LRKEGHTT7',
        // }
        {
          apiKey: 'AIzaSyD8PDv26ZY0kjtbKgCKC3-gdOl1Tp9IOfA',
          authDomain: 'disegnoweb.firebaseapp.com',
          projectId: 'disegnoweb',
          storageBucket: 'disegnoweb.firebasestorage.app',
          messagingSenderId: '683355761877',
          appId: '1:683355761877:web:4e0cc320dbd4e9faf8c65c',
          measurementId: 'G-DDZCRN2KXJ',
        },
      );

      const analytics = getAnalytics(app);
      initializeAnalytics(app);
      return app;
    }),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()),
    provideStorage(() => getStorage()),
  ],
};
