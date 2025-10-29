import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { AuthPage } from './pages/auth/auth';
import { SignupPage } from './pages/signup/signup';
import { AdminDashboard } from './pages/admin/admin';
import { TeacherDashboard } from './pages/teacher/teacher';
import { ParentDashboard } from './pages/parent/parent';
import { roleGuard } from './shared/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    component: Landing,
    pathMatch: 'full',
  },
  {
    path: 'auth',
    component: AuthPage,
  },
  {
    path: 'signup',
    component: SignupPage,
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['admin'])],
    component: AdminDashboard,
  },
  {
    path: 'teacher',
    canActivate: [roleGuard(['teacher'])],
    component: TeacherDashboard,
  },
  {
    path: 'parent',
    canActivate: [roleGuard(['parent'])],
    component: ParentDashboard,
  },
];
