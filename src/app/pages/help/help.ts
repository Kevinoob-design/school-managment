import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Section } from '../../shared/ui/section/section';

interface FAQCategory {
  id: string;
  title: string;
  icon: string;
  questions: FAQQuestion[];
}

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
}

@Component({
  selector: 'app-help',
  imports: [Button, Card, Section],
  templateUrl: './help.html',
  styleUrl: './help.sass',
})
export class HelpPage {
  protected readonly expandedQuestion = signal<string | null>(null);

  protected readonly faqCategories = signal<FAQCategory[]>([
    {
      id: 'getting-started',
      title: 'Comenzando',
      icon: 'rocket_launch',
      questions: [
        {
          id: 'q1',
          question: '¿Cómo creo una cuenta?',
          answer:
            'Haz clic en el botón "Registrarse" en la página principal. Completa el formulario con tu información básica (nombre, email, contraseña) y selecciona tu rol (administrador, maestro o padre). Recibirás un email de confirmación para activar tu cuenta.',
        },
        {
          id: 'q2',
          question: '¿Qué roles de usuario existen?',
          answer:
            'Tenemos tres roles principales: Administradores (gestión completa de la escuela), Maestros (gestión de clases y calificaciones) y Padres (seguimiento del progreso de sus hijos). Cada rol tiene permisos específicos según sus necesidades.',
        },
        {
          id: 'q3',
          question: '¿Cómo inicio sesión por primera vez?',
          answer:
            'Después de confirmar tu email, ve a la página de inicio de sesión. Ingresa tu email y contraseña. Si olvidaste tu contraseña, usa la opción "Olvidé mi contraseña" para restablecerla.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Gestión de Cuenta',
      icon: 'account_circle',
      questions: [
        {
          id: 'q4',
          question: '¿Cómo cambio mi contraseña?',
          answer:
            'Ve a Configuración > Seguridad desde tu panel. Ingresa tu contraseña actual y luego tu nueva contraseña dos veces para confirmar. La contraseña debe tener al menos 8 caracteres.',
        },
        {
          id: 'q5',
          question: '¿Puedo actualizar mi información de perfil?',
          answer:
            'Sí, ve a tu Perfil desde el menú de usuario. Puedes actualizar tu nombre, foto de perfil, teléfono y otra información personal. Los cambios se guardan automáticamente.',
        },
        {
          id: 'q6',
          question: '¿Cómo elimino mi cuenta?',
          answer:
            'Para eliminar tu cuenta, ve a Configuración > Cuenta > Eliminar Cuenta. Ten en cuenta que esta acción es irreversible y se eliminarán todos tus datos permanentemente.',
        },
      ],
    },
    {
      id: 'features',
      title: 'Uso de Funcionalidades',
      icon: 'featured_play_list',
      questions: [
        {
          id: 'q7',
          question: '¿Cómo registro calificaciones? (Maestros)',
          answer:
            'Ve a tu panel de maestro > Mis Clases > selecciona la clase. Haz clic en "Calificaciones" y podrás ingresar o actualizar las notas de cada estudiante. Los cambios se reflejan inmediatamente para los padres.',
        },
        {
          id: 'q8',
          question: '¿Cómo veo el progreso de mi hijo? (Padres)',
          answer:
            'Desde tu panel de padre, verás un resumen del progreso académico. Haz clic en "Ver Detalles" para calificaciones específicas, asistencia, tareas y comentarios de maestros.',
        },
        {
          id: 'q9',
          question: '¿Cómo gestiono anuncios? (Administradores)',
          answer:
            'Ve a Admin > Anuncios. Puedes crear, editar o eliminar anuncios. Selecciona el tipo (urgente, información, evento), escribe el contenido y elige la audiencia (todos, maestros, padres).',
        },
      ],
    },
    {
      id: 'technical',
      title: 'Soporte Técnico',
      icon: 'support',
      questions: [
        {
          id: 'q10',
          question: '¿Qué navegadores son compatibles?',
          answer:
            'La plataforma funciona mejor en las últimas versiones de Chrome, Firefox, Safari y Edge. Recomendamos mantener tu navegador actualizado para la mejor experiencia.',
        },
        {
          id: 'q11',
          question: '¿Hay una aplicación móvil?',
          answer:
            'Actualmente estamos desarrollando aplicaciones nativas para iOS y Android. Por ahora, puedes usar la versión web optimizada para móviles desde tu navegador.',
        },
        {
          id: 'q12',
          question: '¿Mis datos están seguros?',
          answer:
            'Sí, utilizamos cifrado de nivel empresarial (SSL/TLS), autenticación segura y cumplimos con normativas de protección de datos. Tus datos se almacenan en servidores seguros con respaldos regulares.',
        },
      ],
    },
  ]);

  protected readonly resources = signal<Resource[]>([
    {
      id: '1',
      title: 'Guías en Video',
      description: 'Tutoriales paso a paso para aprovechar al máximo la plataforma',
      icon: 'play_circle',
      action: 'Ver Videos',
    },
    {
      id: '2',
      title: 'Documentación',
      description: 'Guías detalladas y manuales de usuario para todas las funcionalidades',
      icon: 'description',
      action: 'Leer Docs',
    },
    {
      id: '3',
      title: 'Soporte en Vivo',
      description: 'Chatea con nuestro equipo de soporte para ayuda inmediata',
      icon: 'chat',
      action: 'Iniciar Chat',
    },
    {
      id: '4',
      title: 'Comunidad',
      description: 'Conéctate con otros usuarios y comparte mejores prácticas',
      icon: 'groups',
      action: 'Unirse',
    },
  ]);

  private readonly router = inject(Router);

  protected toggleQuestion(questionId: string): void {
    if (this.expandedQuestion() === questionId) {
      this.expandedQuestion.set(null);
    } else {
      this.expandedQuestion.set(questionId);
    }
  }

  protected async goContact(): Promise<void> {
    await this.router.navigate(['/contact']);
  }
}
