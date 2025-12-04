import { Component, signal } from '@angular/core';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Section } from '../../shared/ui/section/section';
import { Input } from '../../shared/ui/input/input';

interface ContactInfo {
  id: string;
  title: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-contact',
  imports: [Button, Card, Section, Input],
  templateUrl: './contact.html',
  styleUrl: './contact.sass',
})
export class ContactPage {
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly message = signal('');
  protected readonly loading = signal(false);
  protected readonly formError = signal('');
  protected readonly formSuccess = signal('');
  protected readonly expandedQuestion = signal<string | null>(null);

  protected readonly contactInfo = signal<ContactInfo[]>([
    {
      id: '1',
      title: 'Email',
      value: 'contacto@portalescolar.do',
      icon: 'mail',
    },
    {
      id: '2',
      title: 'Teléfono',
      value: '+1 (809) 555-1234',
      icon: 'phone',
    },
    {
      id: '3',
      title: 'Dirección',
      value: 'Santo Domingo, República Dominicana',
      icon: 'location_on',
    },
    {
      id: '4',
      title: 'Horario',
      value: 'Lun - Vie: 9:00 AM - 6:00 PM',
      icon: 'schedule',
    },
  ]);

  protected isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected onPhoneInput(raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length >= 1) {
      formatted = `(${digits.slice(0, 3)}`;
      if (digits.length >= 4) formatted += `) ${digits.slice(3, 6)}`;
      if (digits.length >= 7) formatted += `-${digits.slice(6, 10)}`;
    }
    if (digits.length < 1) formatted = '';
    this.phone.set(formatted);
  }

  protected canSubmit = (): boolean => {
    if (this.loading()) return false;
    const nameOk = this.name().trim().length >= 2;
    const emailOk = this.isEmailValid(this.email().trim());
    const messageOk = this.message().trim().length >= 10;
    return nameOk && emailOk && messageOk;
  };

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) {
      this.formError.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.loading.set(true);
    this.formError.set('');
    this.formSuccess.set('');

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      this.formSuccess.set('¡Gracias por contactarnos! Nos pondremos en contacto contigo pronto.');
      // Reset form
      this.name.set('');
      this.email.set('');
      this.phone.set('');
      this.message.set('');
    } catch {
      this.formError.set('Ocurrió un error al enviar el mensaje. Por favor intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  protected toggleQuestion(questionId: string): void {
    if (this.expandedQuestion() === questionId) {
      this.expandedQuestion.set(null);
    } else {
      this.expandedQuestion.set(questionId);
    }
  }
}
