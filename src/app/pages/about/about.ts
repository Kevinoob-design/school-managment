import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Section } from '../../shared/ui/section/section';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  icon: string;
}

interface Value {
  id: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-about',
  imports: [Button, Card, Section],
  templateUrl: './about.html',
  styleUrl: './about.sass',
})
export class AboutPage {
  protected readonly teamMembers = signal<TeamMember[]>([
    {
      id: '1',
      name: 'Equipo de Desarrollo',
      role: 'Ingeniería y Tecnología',
      icon: 'code',
    },
    {
      id: '2',
      name: 'Equipo Educativo',
      role: 'Pedagogía y Diseño Curricular',
      icon: 'school',
    },
    {
      id: '3',
      name: 'Soporte al Cliente',
      role: 'Atención y Asistencia',
      icon: 'support_agent',
    },
    {
      id: '4',
      name: 'Equipo de Seguridad',
      role: 'Protección de Datos',
      icon: 'shield',
    },
  ]);

  protected readonly values = signal<Value[]>([
    {
      id: '1',
      title: 'Innovación',
      description:
        'Desarrollamos soluciones tecnológicas de vanguardia que transforman la educación.',
      icon: 'lightbulb',
    },
    {
      id: '2',
      title: 'Calidad',
      description: 'Nos comprometemos con la excelencia en cada aspecto de nuestra plataforma.',
      icon: 'verified',
    },
    {
      id: '3',
      title: 'Accesibilidad',
      description:
        'Creemos que la tecnología educativa debe estar al alcance de todas las instituciones.',
      icon: 'accessibility',
    },
    {
      id: '4',
      title: 'Seguridad',
      description:
        'La protección de datos y la privacidad son nuestra máxima prioridad en todo momento.',
      icon: 'security',
    },
  ]);

  private readonly router = inject(Router);

  protected async goContact(): Promise<void> {
    await this.router.navigate(['/contact']);
  }

  protected async goSignUp(): Promise<void> {
    await this.router.navigate(['/signup']);
  }
}
