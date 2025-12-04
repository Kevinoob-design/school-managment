import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Button } from '../../../shared/ui/button/button';
import { Input } from '../../../shared/ui/input/input';
import {
  BillingCycle,
  DueDateConfig,
  DueDateRuleType,
  FeeCategory,
  FeeDefinition,
  FinancialService,
  PaymentRecord,
  PaymentStatus,
  PenaltyType,
} from '../../../shared/services/financial.service';
import { StudentService, Student } from '../../../shared/services/student.service';

type GooglePayEnvironment = 'TEST' | 'PRODUCTION';

type GooglePayAuthMethod = 'PAN_ONLY' | 'CRYPTOGRAM_3DS';
type GooglePayCardNetwork = 'VISA' | 'MASTERCARD';

interface GooglePayCardPaymentMethod {
  type: 'CARD';
  parameters: {
    allowedAuthMethods: GooglePayAuthMethod[];
    allowedCardNetworks: GooglePayCardNetwork[];
    billingAddressRequired: boolean;
    billingAddressParameters: {
      format: 'FULL';
    };
  };
  tokenizationSpecification: {
    type: 'PAYMENT_GATEWAY';
    parameters: {
      gateway: string;
      gatewayMerchantId: string;
    };
  };
}

interface GooglePayTransactionInfo {
  totalPriceStatus: 'FINAL';
  totalPrice: string;
  currencyCode: string;
  countryCode: string;
}

interface GooglePayPaymentRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: GooglePayCardPaymentMethod[];
  merchantInfo: {
    merchantName: string;
  };
  transactionInfo: GooglePayTransactionInfo;
  emailRequired?: boolean;
}

interface GooglePayPaymentData {
  email?: string;
  transactionInfo?: {
    totalPrice?: string;
  };
  paymentMethodData?: {
    tokenizationData?: {
      token?: string;
    };
    info?: {
      billingAddress?: {
        name?: string;
      };
    };
  };
}

interface GooglePayIsReadyToPayRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: GooglePayCardPaymentMethod[];
}

interface GooglePaymentsClient {
  isReadyToPay(request: GooglePayIsReadyToPayRequest): Promise<{ result?: boolean } | undefined>;
}

interface GooglePayNamespace {
  payments?: {
    api?: {
      PaymentsClient: new (config: { environment: GooglePayEnvironment }) => GooglePaymentsClient;
    };
  };
}

declare const google: GooglePayNamespace;

@Component({
  selector: 'app-finance-tab',
  imports: [CommonModule, DatePipe, Button, Input],
  templateUrl: './finance.html',
  styleUrl: './finance.sass',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FinanceTab implements OnInit {
  private readonly financialService = inject(FinancialService);
  private readonly studentService = inject(StudentService);

  protected loading = signal(true);
  protected feeCatalog = signal<FeeDefinition[]>([]);
  protected dueDateConfigs = signal<DueDateConfig[]>([]);
  protected paymentRecords = signal<PaymentRecord[]>([]);
  protected students = signal<Student[]>([]);

  protected showFeeModal = signal(false);
  protected showDueModal = signal(false);
  protected showPaymentModal = signal(false);

  protected editingFee = signal<FeeDefinition | null>(null);
  protected editingDueConfig = signal<DueDateConfig | null>(null);
  protected editingPayment = signal<PaymentRecord | null>(null);

  // Fee form signals
  protected feeName = signal('');
  protected feeDescription = signal('');
  protected feeCategory = signal<FeeCategory>('colegiatura');
  protected feeAmount = signal('');
  protected feeCurrency = signal('MXN');
  protected feeBillingCycle = signal<BillingCycle>('mensual');
  protected feeIsActive = signal(true);
  protected feeFormError = signal('');

  // Due date form signals
  protected dueConfigFeeId = signal('');
  protected dueRuleType = signal<DueDateRuleType | 'none'>('none');
  protected dueDate = signal('');
  protected dueRuleDay = signal('');
  protected dueRuleMonth = signal('');
  protected dueWarningDays = signal('7');
  protected dueGracePeriodDays = signal('5');
  protected duePenaltyType = signal<PenaltyType>('porcentaje');
  protected duePenaltyValue = signal('');
  protected dueApplyDailyPenalty = signal(false);
  protected dueMaxPenaltyAmount = signal('');
  protected dueNotes = signal('');
  protected dueFormError = signal('');

  // Payment form signals
  protected paymentStudentId = signal('');
  protected paymentFeeId = signal('');
  protected paymentPayerName = signal('');
  protected paymentPayerEmail = signal('');
  protected paymentDueDate = signal('');
  protected paymentBillingPeriod = signal('');
  protected paymentAmountExpected = signal('');
  protected paymentAmountPaid = signal('');
  protected paymentCurrency = signal('MXN');
  protected paymentGoogleTransactionId = signal('');
  protected paymentStatus = signal<PaymentStatus>('pendiente');
  protected paymentDate = signal('');
  protected paymentNotes = signal('');
  protected paymentFormError = signal('');
  protected googlePayReady = signal(false);
  protected googlePayInitialized = signal(false);
  protected googlePayFeedback = signal('');

  protected readonly categoryOptions: { value: FeeCategory; label: string }[] = [
    { value: 'colegiatura', label: 'Colegiatura' },
    { value: 'inscripcion', label: 'Inscripcion' },
    { value: 'taller', label: 'Taller' },
    { value: 'evento', label: 'Evento' },
  ];

  protected readonly billingCycleOptions: { value: BillingCycle; label: string }[] = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'anual', label: 'Anual' },
    { value: 'unico', label: 'Unico' },
  ];

  protected readonly currencyOptions = ['MXN', 'USD', 'EUR', 'COP'];

  protected readonly penaltyTypeOptions: { value: PenaltyType; label: string }[] = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'monto', label: 'Monto fijo' },
  ];

  protected readonly ruleTypeOptions: {
    value: DueDateRuleType | 'none';
    label: string;
    description: string;
  }[] = [
    { value: 'none', label: 'Fecha fija', description: 'Una fecha específica (ej. 2024-12-15)' },
    {
      value: 'monthly-day',
      label: 'Día del mes',
      description: 'Cada mes en el día especificado (ej. día 5)',
    },
    {
      value: 'monthly-last',
      label: 'Último día del mes',
      description: 'El último día de cada mes',
    },
    {
      value: 'quarterly-day',
      label: 'Día trimestral',
      description: 'Primer mes del trimestre en el día especificado',
    },
    {
      value: 'yearly-date',
      label: 'Fecha anual',
      description: 'Cada año en la misma fecha (ej. 1 de agosto)',
    },
  ];

  protected readonly paymentStatusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'pagado', label: 'Pagado' },
    { value: 'conciliado', label: 'Conciliado' },
    { value: 'fallido', label: 'Fallido' },
  ];

  protected readonly overduePayments = computed(() =>
    this.paymentRecords().filter((payment) => {
      if (!payment.dueDate) return false;
      const dueDate = new Date(payment.dueDate).getTime();
      if (Number.isNaN(dueDate)) return false;
      return dueDate < Date.now() && payment.status !== 'conciliado';
    }),
  );

  protected readonly totalPendingAmount = computed(() =>
    this.overduePayments().reduce((acc, payment) => {
      const pending = Math.max(payment.amountExpected - payment.amountPaid, 0);
      return acc + pending;
    }, 0),
  );

  protected readonly totalCollectedAmount = computed(() =>
    this.paymentRecords()
      .filter((payment) => payment.status === 'conciliado' || payment.status === 'pagado')
      .reduce((acc, payment) => acc + payment.amountPaid, 0),
  );

  protected readonly totalScheduledAmount = computed(() =>
    this.paymentRecords().reduce((acc, payment) => acc + payment.amountExpected, 0),
  );

  protected readonly googlePayPaymentRequest = computed<GooglePayPaymentRequest | null>(() => {
    const amountRaw = this.paymentAmountExpected().trim();
    const amount = Number.parseFloat(amountRaw);
    if (Number.isNaN(amount) || amount <= 0) {
      return null;
    }

    const currency = this.paymentCurrency() || 'MXN';

    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [this.getGooglePayCardPaymentMethod()],
      merchantInfo: {
        merchantName: 'School Management (Demo)',
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: amount.toFixed(2),
        currencyCode: currency,
        countryCode: 'US',
      },
      emailRequired: true,
    } satisfies GooglePayPaymentRequest;
  });

  private paymentsClient: GooglePaymentsClient | null = null;
  private googlePayScriptLoading?: Promise<void>;

  async ngOnInit(): Promise<void> {
    void this.initializeGooglePay();
    await this.loadData();
  }

  // protected request =()=>{
  //   this.googlePayPaymentRequest();
  // };
  private getGooglePayCardPaymentMethod(): GooglePayCardPaymentMethod {
    return {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['VISA', 'MASTERCARD'],
        billingAddressRequired: true,
        billingAddressParameters: {
          format: 'FULL',
        },
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'example',
          gatewayMerchantId: 'exampleGatewayMerchantId',
        },
      },
    } satisfies GooglePayCardPaymentMethod;
  }

  private ensureGooglePayScriptLoaded(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.resolve();
    }

    if (
      typeof google !== 'undefined' &&
      google?.payments?.api?.PaymentsClient &&
      !this.googlePayScriptLoading
    ) {
      return Promise.resolve();
    }

    if (this.googlePayScriptLoading) {
      return this.googlePayScriptLoading;
    }

    const loadingPromise = new Promise<void>((resolve, reject) => {
      const scriptUrl = 'https://pay.google.com/gp/p/js/pay.js';
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${scriptUrl}"]`,
      );
      if (existingScript) {
        if (existingScript.dataset['loaded'] === 'true') {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => {
          existingScript.dataset['loaded'] = 'true';
          resolve();
        });
        existingScript.addEventListener('error', () =>
          reject(new Error('No fue posible cargar Google Pay.')),
        );
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset['loaded'] = 'false';
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('No fue posible cargar Google Pay.'));
      document.head.appendChild(script);
    });

    this.googlePayScriptLoading = loadingPromise
      .then((value) => {
        this.googlePayScriptLoading = undefined;
        return value;
      })
      .catch((error) => {
        this.googlePayScriptLoading = undefined;
        throw error;
      });

    return this.googlePayScriptLoading;
  }

  private async initializeGooglePay(): Promise<void> {
    try {
      await this.ensureGooglePayScriptLoaded();
      const googleNamespace = typeof google === 'undefined' ? undefined : google;
      const PaymentsClientCtor = googleNamespace?.payments?.api?.PaymentsClient;
      if (!PaymentsClientCtor) {
        this.googlePayReady.set(false);
        return;
      }

      this.paymentsClient = new PaymentsClientCtor({ environment: 'TEST' });
      const response = await this.paymentsClient.isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [this.getGooglePayCardPaymentMethod()],
      });

      const ready = !!response?.result;
      this.googlePayReady.set(ready);
    } catch (error) {
      console.error('Error inicializando Google Pay', error);
      this.googlePayReady.set(false);
    } finally {
      this.googlePayInitialized.set(true);
    }
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [fees, configs, payments, students] = await Promise.all([
        this.financialService.getFeeCatalog(),
        this.financialService.getDueDateConfigs(),
        this.financialService.getPaymentRecords(),
        this.studentService.getStudents(),
      ]);

      this.feeCatalog.set(fees);
      this.dueDateConfigs.set(configs);
      this.paymentRecords.set(payments);
      this.students.set(students);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fees --------------------------------------------------------------------
   */
  protected openAddFeeModal(): void {
    this.resetFeeForm();
    this.editingFee.set(null);
    this.showFeeModal.set(true);
  }

  protected openEditFeeModal(fee: FeeDefinition): void {
    this.editingFee.set(fee);
    this.feeName.set(fee.name);
    this.feeDescription.set(fee.description);
    this.feeCategory.set(fee.category);
    this.feeAmount.set(fee.amount.toString());
    this.feeCurrency.set(fee.currency);
    this.feeBillingCycle.set(fee.billingCycle);
    this.feeIsActive.set(fee.isActive);
    this.feeFormError.set('');
    this.showFeeModal.set(true);
  }

  protected closeFeeModal(): void {
    this.showFeeModal.set(false);
    this.resetFeeForm();
  }

  private resetFeeForm(): void {
    this.feeName.set('');
    this.feeDescription.set('');
    this.feeCategory.set('colegiatura');
    this.feeAmount.set('');
    this.feeCurrency.set('MXN');
    this.feeBillingCycle.set('mensual');
    this.feeIsActive.set(true);
    this.feeFormError.set('');
  }

  protected async saveFee(): Promise<void> {
    if (!this.feeName().trim()) {
      this.feeFormError.set('El nombre de la tarifa es obligatorio.');
      return;
    }

    const amount = Number.parseFloat(this.feeAmount());
    if (Number.isNaN(amount) || amount <= 0) {
      this.feeFormError.set('El monto debe ser un numero positivo.');
      return;
    }

    const feePayload = {
      name: this.feeName().trim(),
      description: this.feeDescription().trim(),
      category: this.feeCategory(),
      amount,
      currency: this.feeCurrency(),
      billingCycle: this.feeBillingCycle(),
      isActive: this.feeIsActive(),
    };

    try {
      const editing = this.editingFee();
      if (editing && editing.id) {
        await this.financialService.updateFeeDefinition(editing.id, feePayload);
      } else {
        await this.financialService.addFeeDefinition(feePayload);
      }

      await this.loadData();
      this.closeFeeModal();
    } catch (error) {
      this.feeFormError.set('Error al guardar la tarifa.');
      console.error(error);
    }
  }

  protected async toggleFeeStatus(fee: FeeDefinition): Promise<void> {
    if (!fee.id) return;
    await this.financialService.updateFeeDefinition(fee.id, { isActive: !fee.isActive });
    await this.loadData();
  }

  protected async deleteFee(fee: FeeDefinition): Promise<void> {
    if (!fee.id) return;
    if (!confirm(`Estas seguro de eliminar la tarifa "${fee.name}"?`)) return;

    await this.financialService.deleteFeeDefinition(fee.id);
    await this.loadData();
  }

  /**
   * Due date configs --------------------------------------------------------
   */
  protected openAddDueModal(): void {
    this.resetDueForm();
    this.editingDueConfig.set(null);
    this.showDueModal.set(true);
  }

  protected openEditDueModal(config: DueDateConfig): void {
    this.editingDueConfig.set(config);
    this.dueConfigFeeId.set(config.feeId);

    // Handle rule-based or fixed date
    if (config.dueDateRule) {
      this.dueRuleType.set(config.dueDateRule.type);
      this.dueRuleDay.set(config.dueDateRule.day?.toString() ?? '');
      this.dueRuleMonth.set(config.dueDateRule.month?.toString() ?? '');
      this.dueDate.set(config.dueDateRule.fixedDate ?? '');
    } else {
      this.dueRuleType.set('none');
      this.dueDate.set(config.dueDate ?? '');
    }

    this.dueWarningDays.set(config.warningDaysBefore.toString());
    this.dueGracePeriodDays.set(config.gracePeriodDays.toString());
    this.duePenaltyType.set(config.penaltyType);
    this.duePenaltyValue.set(config.penaltyValue.toString());
    this.dueApplyDailyPenalty.set(config.applyDailyPenalty);
    this.dueMaxPenaltyAmount.set(config.maxPenaltyAmount?.toString() ?? '');
    this.dueNotes.set(config.notes ?? '');
    this.dueFormError.set('');
    this.showDueModal.set(true);
  }

  protected closeDueModal(): void {
    this.showDueModal.set(false);
    this.resetDueForm();
  }

  private resetDueForm(): void {
    this.dueConfigFeeId.set('');
    this.dueRuleType.set('none');
    this.dueDate.set('');
    this.dueRuleDay.set('');
    this.dueRuleMonth.set('');
    this.dueWarningDays.set('7');
    this.dueGracePeriodDays.set('5');
    this.duePenaltyType.set('porcentaje');
    this.duePenaltyValue.set('');
    this.dueApplyDailyPenalty.set(false);
    this.dueMaxPenaltyAmount.set('');
    this.dueNotes.set('');
    this.dueFormError.set('');
  }

  protected async saveDueConfig(): Promise<void> {
    if (!this.dueConfigFeeId()) {
      this.dueFormError.set('Selecciona una tarifa.');
      return;
    }

    const selectedRuleType = this.dueRuleType();

    // Validate based on rule type
    if (selectedRuleType === 'none' && !this.dueDate()) {
      this.dueFormError.set('Define una fecha limite.');
      return;
    }

    if (
      (selectedRuleType === 'monthly-day' || selectedRuleType === 'quarterly-day') &&
      !this.dueRuleDay()
    ) {
      this.dueFormError.set('Especifica el día del mes (1-31).');
      return;
    }

    if (selectedRuleType === 'yearly-date' && (!this.dueRuleMonth() || !this.dueRuleDay())) {
      this.dueFormError.set('Especifica el mes y día para la fecha anual.');
      return;
    }

    const penaltyValue = Number.parseFloat(this.duePenaltyValue());
    if (Number.isNaN(penaltyValue) || penaltyValue < 0) {
      this.dueFormError.set('El recargo debe ser un numero valido.');
      return;
    }

    const gracePeriod = Number.parseInt(this.dueGracePeriodDays(), 10);
    if (Number.isNaN(gracePeriod) || gracePeriod < 0) {
      this.dueFormError.set('El periodo de gracia debe ser un numero valido.');
      return;
    }

    const maxPenalty = this.dueMaxPenaltyAmount().trim()
      ? Number.parseFloat(this.dueMaxPenaltyAmount())
      : undefined;
    if (maxPenalty !== undefined && (Number.isNaN(maxPenalty) || maxPenalty < 0)) {
      this.dueFormError.set('El maximo de recargo debe ser un numero valido.');
      return;
    }

    const fee = this.feeCatalog().find((item) => item.id === this.dueConfigFeeId());
    const feeName = fee?.name ?? this.editingDueConfig()?.feeName ?? 'Tarifa';

    const notes = this.dueNotes().trim();
    const warningDays = Number.parseInt(this.dueWarningDays(), 10) || 7;

    // Build due date rule or use fixed date
    let dueDateRule = undefined;
    let dueDate = undefined;

    if (selectedRuleType === 'none') {
      dueDate = this.dueDate();
    } else if (selectedRuleType === 'monthly-last') {
      dueDateRule = { type: 'monthly-last' as const };
    } else if (selectedRuleType === 'monthly-day') {
      const day = Number.parseInt(this.dueRuleDay(), 10);
      dueDateRule = { type: 'monthly-day' as const, day };
    } else if (selectedRuleType === 'quarterly-day') {
      const day = Number.parseInt(this.dueRuleDay(), 10);
      dueDateRule = { type: 'quarterly-day' as const, day };
    } else if (selectedRuleType === 'yearly-date') {
      const day = Number.parseInt(this.dueRuleDay(), 10);
      const month = Number.parseInt(this.dueRuleMonth(), 10);
      dueDateRule = { type: 'yearly-date' as const, day, month };
    }

    const payload = {
      feeId: this.dueConfigFeeId(),
      feeName,
      ...(dueDate ? { dueDate } : {}),
      ...(dueDateRule ? { dueDateRule } : {}),
      warningDaysBefore: warningDays,
      gracePeriodDays: gracePeriod,
      penaltyType: this.duePenaltyType(),
      penaltyValue,
      applyDailyPenalty: this.dueApplyDailyPenalty(),
      ...(maxPenalty !== undefined ? { maxPenaltyAmount: maxPenalty } : {}),
      ...(notes ? { notes } : {}),
    } satisfies Omit<DueDateConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

    try {
      const editing = this.editingDueConfig();
      if (editing && editing.id) {
        await this.financialService.updateDueDateConfig(editing.id, payload);
      } else {
        await this.financialService.addDueDateConfig(payload);
      }

      await this.loadData();
      this.closeDueModal();
    } catch (error) {
      this.dueFormError.set('Error al guardar la configuracion.');
      console.error(error);
    }
  }

  protected async deleteDueConfig(config: DueDateConfig): Promise<void> {
    if (!config.id) return;
    if (!confirm(`Eliminar la fecha limite para "${config.feeName}"?`)) return;

    await this.financialService.deleteDueDateConfig(config.id);
    await this.loadData();
  }

  /**
   * Payments & receipts -----------------------------------------------------
   */
  protected handleGooglePaySuccess(event: Event): void {
    const customEvent = event as CustomEvent<unknown> | undefined;
    const detail = customEvent?.detail ?? (event as { detail?: unknown }).detail;
    if (!this.isGooglePayPaymentData(detail)) {
      return;
    }
    const paymentData = detail;

    const totalPrice = paymentData.transactionInfo?.totalPrice;
    if (typeof totalPrice === 'string' && totalPrice.trim()) {
      this.paymentAmountPaid.set(totalPrice);
    } else if (!this.paymentAmountPaid().trim() && this.paymentAmountExpected().trim()) {
      this.paymentAmountPaid.set(this.paymentAmountExpected());
    }

    const token = paymentData.paymentMethodData?.tokenizationData?.token;
    if (typeof token === 'string' && token.trim()) {
      let transactionId = token;
      try {
        const parsedToken = JSON.parse(token);
        if (parsedToken && typeof parsedToken === 'object') {
          const candidate =
            parsedToken.id ??
            parsedToken.gatewayTransactionId ??
            parsedToken.paymentMethodId ??
            parsedToken.token ??
            token;
          if (typeof candidate === 'string') {
            transactionId = candidate;
          }
        }
      } catch {
        // Token is not JSON, keep original value.
      }
      this.paymentGoogleTransactionId.set(transactionId);
    }

    const payerEmail = paymentData.email;
    if (typeof payerEmail === 'string' && payerEmail.trim()) {
      this.paymentPayerEmail.set(payerEmail);
    }

    const billingName = paymentData.paymentMethodData?.info?.billingAddress?.name;
    if (typeof billingName === 'string' && billingName.trim() && !this.paymentPayerName().trim()) {
      this.paymentPayerName.set(billingName);
    }

    this.paymentStatus.set('pagado');
    this.paymentFormError.set('');
    this.googlePayFeedback.set(
      'Pago autorizado con Google Pay. Revisa la informacion y guarda el registro.',
    );
  }

  protected handleGooglePayCancel(): void {
    this.googlePayFeedback.set('Se cancelo el flujo de Google Pay.');
  }

  protected handleGooglePayError(event: Event): void {
    const detail =
      event instanceof ErrorEvent
        ? event.message
        : ((event as CustomEvent | undefined)?.detail ?? 'Evento desconocido');
    console.error('Error en Google Pay', detail);
    this.googlePayFeedback.set('No se pudo procesar el pago con Google Pay. Intenta nuevamente.');
  }

  protected openAddPaymentModal(): void {
    this.resetPaymentForm();
    this.editingPayment.set(null);
    this.googlePayFeedback.set('');
    this.showPaymentModal.set(true);
  }

  protected openEditPaymentModal(payment: PaymentRecord): void {
    this.editingPayment.set(payment);
    this.paymentStudentId.set(payment.studentId);
    this.paymentFeeId.set(payment.feeId);
    this.paymentPayerName.set(payment.payerName);
    this.paymentPayerEmail.set(payment.payerEmail);
    this.paymentDueDate.set(payment.dueDate);
    this.paymentBillingPeriod.set(payment.billingPeriod);
    this.paymentAmountExpected.set(payment.amountExpected.toString());
    this.paymentAmountPaid.set(payment.amountPaid.toString());
    this.paymentCurrency.set(payment.currency);
    this.paymentGoogleTransactionId.set(payment.googlePayTransactionId);
    this.paymentStatus.set(payment.status);
    this.paymentDate.set(
      payment.paymentDate ? new Date(payment.paymentDate).toISOString().slice(0, 10) : '',
    );
    this.paymentNotes.set(payment.notes ?? '');
    this.paymentFormError.set('');
    this.googlePayFeedback.set('');
    this.showPaymentModal.set(true);
  }

  protected onStudentSelected(): void {
    const studentId = this.paymentStudentId();
    const student = this.students().find((s) => s.id === studentId);
    if (student) {
      this.paymentPayerName.set(student.parentName);
      this.paymentPayerEmail.set(student.parentEmail);
    }
  }

  protected onFeeSelected(): void {
    const feeId = this.paymentFeeId();
    const fee = this.feeCatalog().find((f) => f.id === feeId);
    if (fee) {
      this.paymentAmountExpected.set(fee.amount.toString());
      this.paymentCurrency.set(fee.currency);

      // Find due date config for this fee
      const dueConfig = this.dueDateConfigs().find((d) => d.feeId === feeId);
      if (dueConfig) {
        // Calculate due date from rule or use fixed date
        let calculatedDueDate = '';
        if (dueConfig.dueDateRule) {
          calculatedDueDate = this.financialService.calculateDueDateFromRule(dueConfig.dueDateRule);
        } else if (dueConfig.dueDate) {
          calculatedDueDate = dueConfig.dueDate;
        }
        if (calculatedDueDate) {
          this.paymentDueDate.set(calculatedDueDate);
        }
      }
    }
  }

  protected closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.resetPaymentForm();
  }

  protected handleBackdropClick(event: MouseEvent, modal: 'fee' | 'due' | 'payment'): void {
    event.stopPropagation();
    if (event.target !== event.currentTarget) {
      return;
    }

    this.closeModalByType(modal);
  }

  protected closeModalWithKeyboard(event: KeyboardEvent, modal: 'fee' | 'due' | 'payment'): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeModalByType(modal);
  }

  private closeModalByType(modal: 'fee' | 'due' | 'payment'): void {
    switch (modal) {
      case 'fee':
        this.closeFeeModal();
        break;
      case 'due':
        this.closeDueModal();
        break;
      case 'payment':
        this.closePaymentModal();
        break;
      default:
        break;
    }
  }

  private resetPaymentForm(): void {
    this.paymentStudentId.set('');
    this.paymentFeeId.set('');
    this.paymentPayerName.set('');
    this.paymentPayerEmail.set('');
    this.paymentDueDate.set('');
    this.paymentBillingPeriod.set('');
    this.paymentAmountExpected.set('');
    this.paymentAmountPaid.set('');
    this.paymentCurrency.set('MXN');
    this.paymentGoogleTransactionId.set('');
    this.paymentStatus.set('pendiente');
    this.paymentDate.set('');
    this.paymentNotes.set('');
    this.paymentFormError.set('');
    this.googlePayFeedback.set('');
  }

  protected async savePayment(): Promise<void> {
    if (!this.paymentStudentId()) {
      this.paymentFormError.set('Selecciona un estudiante.');
      return;
    }

    if (!this.paymentFeeId()) {
      this.paymentFormError.set('Selecciona una tarifa asociada al pago.');
      return;
    }

    if (!this.paymentPayerName().trim()) {
      this.paymentFormError.set('El nombre del responsable es obligatorio.');
      return;
    }

    if (!this.paymentPayerEmail().trim()) {
      this.paymentFormError.set('El correo de contacto es obligatorio.');
      return;
    }

    if (!this.paymentDueDate()) {
      this.paymentFormError.set('Selecciona la fecha limite del pago.');
      return;
    }

    if (!this.paymentBillingPeriod().trim()) {
      this.paymentFormError.set('Indica el periodo facturado (ej. 2024-09).');
      return;
    }

    const expected = Number.parseFloat(this.paymentAmountExpected());
    if (Number.isNaN(expected) || expected <= 0) {
      this.paymentFormError.set('El monto esperado debe ser mayor a cero.');
      return;
    }

    const paidValue = this.paymentAmountPaid().trim()
      ? Number.parseFloat(this.paymentAmountPaid())
      : 0;
    if (Number.isNaN(paidValue) || paidValue < 0) {
      this.paymentFormError.set('El monto pagado debe ser un numero valido.');
      return;
    }

    if (!this.paymentGoogleTransactionId().trim()) {
      this.paymentFormError.set('Ingresa el ID de transaccion.');
      return;
    }

    const fee = this.feeCatalog().find((item) => item.id === this.paymentFeeId());
    const feeName = fee?.name ?? this.editingPayment()?.feeName ?? 'Tarifa';

    const student = this.students().find((s) => s.id === this.paymentStudentId());
    const studentName = student?.fullName ?? this.editingPayment()?.studentName ?? 'Estudiante';

    const notes = this.paymentNotes().trim();
    const paymentDate = this.paymentDate() ? new Date(this.paymentDate()).getTime() : undefined;

    const payload = {
      studentId: this.paymentStudentId(),
      studentName,
      feeId: this.paymentFeeId(),
      feeName,
      payerName: this.paymentPayerName().trim(),
      payerEmail: this.paymentPayerEmail().trim(),
      dueDate: this.paymentDueDate(),
      billingPeriod: this.paymentBillingPeriod().trim(),
      amountExpected: expected,
      amountPaid: paidValue,
      currency: this.paymentCurrency(),
      googlePayTransactionId: this.paymentGoogleTransactionId().trim(),
      status: this.paymentStatus(),
      ...(paymentDate ? { paymentDate } : {}),
      ...(notes ? { notes } : {}),
    } satisfies Omit<PaymentRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

    try {
      const editing = this.editingPayment();
      if (editing && editing.id) {
        await this.financialService.updatePaymentRecord(editing.id, payload);
      } else {
        await this.financialService.addPaymentRecord(payload);
      }

      await this.loadData();
      this.closePaymentModal();
    } catch (error) {
      this.paymentFormError.set('Error al guardar el pago.');
      console.error(error);
    }
  }

  protected async deletePayment(payment: PaymentRecord): Promise<void> {
    if (!payment.id) return;
    if (!confirm(`Eliminar el registro de pago de "${payment.payerName}"?`)) return;

    await this.financialService.deletePaymentRecord(payment.id);
    await this.loadData();
  }

  protected async updatePaymentStatus(
    payment: PaymentRecord,
    status: PaymentStatus,
  ): Promise<void> {
    if (!payment.id) return;
    await this.financialService.updatePaymentStatus(payment.id, status);
    await this.loadData();
  }

  protected async generateReceipt(payment: PaymentRecord): Promise<void> {
    if (!payment.id) return;
    const receiptNumber = await this.financialService.generateReceipt(payment.id);
    if (receiptNumber) {
      await this.loadData();
      alert(`Comprobante generado: ${receiptNumber}`);
    } else {
      alert('No fue posible generar el comprobante. Intenta nuevamente.');
    }
  }

  /**
   * Helpers -----------------------------------------------------------------
   */
  protected formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  protected getPendingAmount(payment: PaymentRecord): number {
    return Math.max(payment.amountExpected - payment.amountPaid, 0);
  }

  protected getCategoryLabel(category: FeeCategory): string {
    return this.categoryOptions.find((option) => option.value === category)?.label ?? category;
  }

  private isGooglePayPaymentData(value: unknown): value is GooglePayPaymentData {
    return typeof value === 'object' && value !== null;
  }

  protected getBillingCycleLabel(cycle: BillingCycle): string {
    return this.billingCycleOptions.find((option) => option.value === cycle)?.label ?? cycle;
  }

  protected getPenaltyLabel(config: DueDateConfig): string {
    const base =
      config.penaltyType === 'porcentaje'
        ? `${config.penaltyValue}%`
        : this.formatCurrency(config.penaltyValue, this.getFeeCurrency(config.feeId));
    const suffix = config.applyDailyPenalty ? ' diario' : '';
    return `${base}${suffix}`;
  }

  protected getFeeCurrency(feeId: string): string {
    return this.feeCatalog().find((fee) => fee.id === feeId)?.currency ?? 'MXN';
  }

  protected getPaymentStatusLabel(status: PaymentStatus): string {
    return this.paymentStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected getPaymentStatusClass(status: PaymentStatus): string {
    switch (status) {
      case 'conciliado':
        return 'bg-emerald-100 text-emerald-700';
      case 'pagado':
        return 'bg-blue-100 text-blue-700';
      case 'pendiente':
        return 'bg-amber-100 text-amber-700';
      case 'fallido':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  protected getPaymentDate(payment: PaymentRecord): string {
    if (!payment.paymentDate) return 'Sin registrar';
    const date = new Date(payment.paymentDate);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected getOverdueStatus(payment: PaymentRecord): string {
    const due = new Date(payment.dueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Al corriente';
    return `${diff} dia${diff === 1 ? '' : 's'} en mora`;
  }
}
