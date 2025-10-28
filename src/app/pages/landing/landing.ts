import { Component, signal } from '@angular/core';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Section } from '../../shared/ui/section/section';

interface UserType {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  link: string;
}

interface Announcement {
  id: string;
  title: string;
  date: string;
  school: string;
  excerpt: string;
  type: 'urgent' | 'info' | 'event';
}

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-landing',
  imports: [Button, Card, Section],
  templateUrl: './landing.html',
  styleUrl: './landing.sass',
})
export class Landing {
  protected readonly userTypes = signal<UserType[]>([
    {
      id: 'school',
      title: 'Schools',
      description: 'Manage your school operations, staff, and students efficiently',
      icon: 'school',
      features: [
        'Student enrollment management',
        'Staff and teacher coordination',
        'Academic calendar planning',
        'Performance analytics',
      ],
      link: '/school/login',
    },
    {
      id: 'parent',
      title: 'Parents',
      description: "Stay connected with your child's education journey",
      icon: 'family_restroom',
      features: [
        'Real-time grade tracking',
        'Attendance monitoring',
        'Direct teacher communication',
        'Event notifications',
      ],
      link: '/parent/login',
    },
    {
      id: 'teacher',
      title: 'Teachers',
      description: 'Streamline your teaching and administrative tasks',
      icon: 'co_present',
      features: [
        'Grade and assignment management',
        'Attendance tracking',
        'Parent-teacher communication',
        'Curriculum planning',
      ],
      link: '/teacher/login',
    },
    {
      id: 'admin',
      title: 'Administrators',
      description: 'Comprehensive oversight and management tools',
      icon: 'admin_panel_settings',
      features: [
        'System-wide reporting',
        'User management',
        'School configuration',
        'Data analytics dashboard',
      ],
      link: '/admin/login',
    },
  ]);

  protected readonly announcements = signal<Announcement[]>([
    {
      id: '1',
      title: 'Spring Break Schedule Updated',
      date: '2025-10-28',
      school: 'Lincoln High School',
      excerpt:
        'Important changes to the spring break calendar. Please review the updated schedule.',
      type: 'urgent',
    },
    {
      id: '2',
      title: 'Parent-Teacher Conference Registration Open',
      date: '2025-10-26',
      school: 'Roosevelt Elementary',
      excerpt:
        'Book your time slots for the upcoming parent-teacher conferences scheduled for November.',
      type: 'event',
    },
    {
      id: '3',
      title: 'New Online Learning Resources Available',
      date: '2025-10-25',
      school: 'All Schools',
      excerpt: 'Access a wide range of new educational materials and interactive learning tools.',
      type: 'info',
    },
  ]);

  protected readonly features = signal<Feature[]>([
    {
      id: '1',
      title: 'Real-Time Updates',
      description: 'Stay informed with instant notifications about grades, attendance, and events',
      icon: 'notifications_active',
    },
    {
      id: '2',
      title: 'Secure Platform',
      description: 'Enterprise-grade security protecting your educational data and privacy',
      icon: 'security',
    },
    {
      id: '3',
      title: 'Easy Communication',
      description: 'Seamless messaging between teachers, parents, and administrators',
      icon: 'forum',
    },
    {
      id: '4',
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights and reports on academic performance',
      icon: 'analytics',
    },
  ]);

  protected getAnnouncementTypeClasses(type: string): string {
    const typeMap: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      event: 'bg-blue-100 text-blue-800',
      info: 'bg-green-100 text-green-800',
    };
    return typeMap[type] || typeMap['info'];
  }
}
