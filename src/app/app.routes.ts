import { Routes } from '@angular/router';

import { AuthComponent } from './auth/auth.component';
import { ParentPortalComponent } from './parent-portal/parent-portal.component';

export const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
    pathMatch: 'full',
  },
  {
    path: 'parent-portal',
    component: ParentPortalComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
