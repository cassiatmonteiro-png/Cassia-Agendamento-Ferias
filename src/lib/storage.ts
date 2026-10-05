import { 
  Department, 
  Employee, 
  AccrualPeriod, 
  VacationRequest, 
  ConflictCheckResult,
  AlternativeDateSuggestion,
  DashboardStats,
  UserRole
} from '../types/index.ts';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_EMPLOYEES, 
  INITIAL_ACCRUAL_PERIODS, 
  INITIAL_VACATION_REQUESTS 
} from './mock-data.ts';
import { checkVacationConflicts, suggestAlternativeDates } from './overlap-rules.ts';
import { validateCLTRules, calculateAccrualPeriods } from './clt-rules.ts';
import { 
  getSupabaseConfig, 
  fetchAllFromSupabase, 
  insertVacationToSupabase, 
  updateVacationStatusInSupabase,
  testSupabaseConnection
} from './supabase.ts';

const STORAGE_KEYS = {
  DEPARTMENTS: 'clt_vacation_departments_v1',
  EMPLOYEES: 'clt_vacation_employees_v1',
  ACCRUAL_PERIODS: 'clt_vacation_accruals_v1',
  VACATIONS: 'clt_vacation_requests_v1',
  CURRENT_USER_ID: 'clt_vacation_current_user_id_v1',
};

class VacationDataStore {
  private departments: Department[] = [];
  private employees: Employee[] = [];
  private accrualPeriods: AccrualPeriod[] = [];
  private vacationRequests: VacationRequest[] = [];
  private currentUserId: number = 1; // Default to Admin Carlos Eduardo

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.departments = [...INITIAL_DEPARTMENTS];
    this.employees = [...INITIAL_EMPLOYEES];
    this.accrualPeriods = [...INITIAL_ACCRUAL_PERIODS];
    this.vacationRequests = [...INITIAL_VACATION_REQUESTS];
    this.currentUserId = 1;

    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const storedDeps = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      if (storedDeps) this.departments = JSON.parse(storedDeps);

      const storedEmps = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (storedEmps) this.employees = JSON.parse(storedEmps);

      const storedAccruals = localStorage.getItem(STORAGE_KEYS.ACCRUAL_PERIODS);
      if (storedAccruals) this.accrualPeriods = JSON.parse(storedAccruals);

      const storedVacations = localStorage.getItem(STORAGE_KEYS.VACATIONS);
      if (storedVacations) this.vacationRequests = JSON.parse(storedVacations);

      const storedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (storedUserId) this.currentUserId = Number(storedUserId);
    } catch {
      this.resetToDefaults();
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(this.departments));
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(this.employees));
      localStorage.setItem(STORAGE_KEYS.ACCRUAL_PERIODS, JSON.stringify(this.accrualPeriods));
      localStorage.setItem(STORAGE_KEYS.VACATIONS, JSON.stringify(this.vacationRequests));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, String(this.currentUserId));
    } catch (e) {
      console.error('Falha ao salvar no localStorage', e);
    }
  }

  public resetToDefaults() {
    this.departments = [...INITIAL_DEPARTMENTS];
    this.employees = [...INITIAL_EMPLOYEES];
    this.accrualPeriods = [...INITIAL_ACCRUAL_PERIODS];
    this.vacationRequests = [...INITIAL_VACATION_REQUESTS];
    this.currentUserId = 1;
    this.saveToStorage();
  }

  // Current User / Session
  public getCurrentUser(): Employee {
    const user = this.employees.find(e => e.id === this.currentUserId);
    return user || this.employees[0];
  }

  public setCurrentUserId(id: number) {
    this.currentUserId = id;
    this.saveToStorage();
  }

  // Departments
  public getDepartments(): Department[] {
    return [...this.departments];
  }

  public addDepartment(dep: Omit<Department, 'id'>): Department {
    const newId = Math.max(0, ...this.departments.map(d => d.id)) + 1;
    const newDep: Department = { id: newId, ...dep };
    this.departments.push(newDep);
    this.saveToStorage();
    return newDep;
  }

  // Employees
  public getEmployees(): Employee[] {
    return [...this.employees];
  }

  public getEmployeeById(id: number): Employee | undefined {
    return this.employees.find(e => e.id === id);
  }

  public addEmployee(data: Omit<Employee, 'id'>): Employee {
    const newId = Math.max(0, ...this.employees.map(e => e.id)) + 1;
    const newEmployee: Employee = { id: newId, ...data };
    this.employees.push(newEmployee);

    // Gera automaticamente períodos aquisitivos e concessivos para o novo colaborador
    const generatedPeriods = calculateAccrualPeriods(newEmployee.hireDate, newEmployee.id);
    this.accrualPeriods.push(...generatedPeriods);

    this.saveToStorage();
    return newEmployee;
  }

  public updateEmployee(id: number, data: Partial<Employee>): Employee | null {
    const idx = this.employees.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.employees[idx] = { ...this.employees[idx], ...data };
    this.saveToStorage();
    return this.employees[idx];
  }

  // Accrual Periods
  public getAccrualPeriods(employeeId?: number): AccrualPeriod[] {
    if (employeeId) {
      return this.accrualPeriods.filter(p => p.employeeId === employeeId);
    }
    return [...this.accrualPeriods];
  }

  public getActiveAccrualPeriod(employeeId: number): AccrualPeriod | undefined {
    const empPeriods = this.accrualPeriods.filter(p => p.employeeId === employeeId);
    // Prioriza períodos adquiridos com saldo disponível
    const acquired = empPeriods.find(p => p.status === 'ADQUIRIDO' && p.daysRemaining > 0);
    if (acquired) return acquired;
    return empPeriods.find(p => p.daysRemaining > 0) || empPeriods[empPeriods.length - 1];
  }

  // Vacation Requests
  public getVacationRequests(filters?: {
    employeeId?: number;
    departmentId?: number;
    status?: string;
  }): VacationRequest[] {
    let list = [...this.vacationRequests];

    if (filters?.employeeId) {
      list = list.filter(r => r.employeeId === filters.employeeId);
    }

    if (filters?.departmentId) {
      const empIds = new Set(
        this.employees.filter(e => e.departmentId === filters.departmentId).map(e => e.id)
      );
      list = list.filter(r => empIds.has(r.employeeId));
    }

    if (filters?.status) {
      list = list.filter(r => r.status === filters.status);
    }

    // Ordena da mais recente para a mais antiga
    return list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  // Check conflicts and validate rules
  public checkConflicts(params: {
    employeeId: number;
    startDate: string;
    endDate: string;
    excludeRequestId?: number;
  }): ConflictCheckResult {
    return checkVacationConflicts({
      employeeId: params.employeeId,
      startDate: params.startDate,
      endDate: params.endDate,
      allEmployees: this.employees,
      allVacationRequests: this.vacationRequests,
      excludeRequestId: params.excludeRequestId,
    });
  }

  // Suggest alternatives
  public suggestDates(params: {
    employeeId: number;
    originalStartDate: string;
    durationDays: number;
    conflictingVacationId?: number;
  }): AlternativeDateSuggestion[] {
    const confVacation = params.conflictingVacationId 
      ? this.vacationRequests.find(v => v.id === params.conflictingVacationId)
      : undefined;

    return suggestAlternativeDates({
      employeeId: params.employeeId,
      originalStartDate: params.originalStartDate,
      durationDays: params.durationDays,
      allEmployees: this.employees,
      allVacationRequests: this.vacationRequests,
      conflictingVacation: confVacation,
    });
  }

  // Create Vacation Request
  public createVacationRequest(data: {
    employeeId: number;
    accrualPeriodId: number;
    startDate: string;
    endDate: string;
    durationDays: number;
    sellDays: number;
    notes?: string;
  }): { success: boolean; request?: VacationRequest; error?: string } {
    const period = this.accrualPeriods.find(p => p.id === data.accrualPeriodId);
    if (!period) {
      return { success: false, error: 'Período aquisitivo não localizado.' };
    }

    // 1. Validação da CLT
    const existingRequests = this.vacationRequests.filter(r => r.accrualPeriodId === period.id);
    const cltCheck = validateCLTRules({
      startDate: data.startDate,
      endDate: data.endDate,
      durationDays: data.durationDays,
      sellDays: data.sellDays,
      accrualPeriod: period,
      existingRequestsForPeriod: existingRequests,
    });

    if (!cltCheck.isValid) {
      return { success: false, error: cltCheck.errors.join(' | ') };
    }

    // 2. Validação de Conflitos e Sobreposição Departamental
    const conflictCheck = this.checkConflicts({
      employeeId: data.employeeId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    if (conflictCheck.blocked) {
      return { success: false, error: conflictCheck.blockReason || 'Solicitação bloqueada devido a sobreposição excessiva de datas.' };
    }

    // 3. Cria a solicitação
    const newId = Math.max(0, ...this.vacationRequests.map(r => r.id)) + 1;
    const installmentNumber = existingRequests.filter(r => r.status !== 'REJEITADA' && r.status !== 'CANCELADA').length + 1;

    const newRequest: VacationRequest = {
      id: newId,
      employeeId: data.employeeId,
      accrualPeriodId: data.accrualPeriodId,
      startDate: data.startDate,
      endDate: data.endDate,
      durationDays: data.durationDays,
      installmentNumber,
      sellDays: data.sellDays,
      status: 'PENDENTE',
      hasDepartmentOverlap: conflictCheck.hasConflict,
      overlapDays: conflictCheck.overlapDays,
      conflictingEmployeeId: conflictCheck.conflictingEmployee?.id || null,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.vacationRequests.unshift(newRequest);

    // Atualiza saldo provisoriamente no período aquisitivo
    period.daysTaken += data.durationDays;
    period.daysSold += data.sellDays;
    period.daysRemaining = Math.max(0, period.totalDaysEntitled - period.daysTaken - period.daysSold);

    this.saveToStorage();

    // Sincroniza em segundo plano com o Supabase se configurado
    insertVacationToSupabase(newRequest).catch(err => {
      console.warn('Sincronização em background com Supabase pendente:', err);
    });

    return { success: true, request: newRequest };
  }

  // Update status (Aprovação por Gestor / RH ou Rejeição)
  public updateRequestStatus(
    requestId: number, 
    newStatus: VacationRequest['status'], 
    rejectionReason?: string
  ): VacationRequest | null {
    const req = this.vacationRequests.find(r => r.id === requestId);
    if (!req) return null;

    const oldStatus = req.status;
    req.status = newStatus;
    req.updatedAt = new Date().toISOString();
    if (rejectionReason) {
      req.rejectionReason = rejectionReason;
    }

    // Se foi rejeitada ou cancelada, devolve os dias ao período aquisitivo
    if ((newStatus === 'REJEITADA' || newStatus === 'CANCELADA') && oldStatus !== 'REJEITADA' && oldStatus !== 'CANCELADA') {
      const period = this.accrualPeriods.find(p => p.id === req.accrualPeriodId);
      if (period) {
        period.daysTaken = Math.max(0, period.daysTaken - req.durationDays);
        period.daysSold = Math.max(0, period.daysSold - req.sellDays);
        period.daysRemaining = period.totalDaysEntitled - period.daysTaken - period.daysSold;
      }
    }

    this.saveToStorage();

    // Sincroniza em segundo plano com o Supabase se configurado
    updateVacationStatusInSupabase(requestId, newStatus, rejectionReason).catch(err => {
      console.warn('Atualização no Supabase pendente:', err);
    });

    return req;
  }

  // Sincroniza dados do Supabase para o estado local
  public async syncWithSupabase(): Promise<{ success: boolean; message: string }> {
    const remoteData = await fetchAllFromSupabase();
    if (!remoteData) {
      return { success: false, message: 'Não foi possível carregar dados do Supabase. Verifique a conexão ou se as tabelas foram criadas.' };
    }

    if (remoteData.departments.length > 0) this.departments = remoteData.departments;
    if (remoteData.employees.length > 0) this.employees = remoteData.employees;
    if (remoteData.accrualPeriods.length > 0) this.accrualPeriods = remoteData.accrualPeriods;
    if (remoteData.vacations.length > 0) this.vacationRequests = remoteData.vacations;

    this.saveToStorage();
    return { success: true, message: `Sincronizado com sucesso! ${this.vacationRequests.length} solicitações e ${this.employees.length} colaboradores carregados do Supabase.` };
  }

  // Dashboard Stats
  public getDashboardStats(): DashboardStats {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const scheduledThisMonth = this.vacationRequests.filter(r => {
      if (r.status === 'REJEITADA' || r.status === 'CANCELADA') return false;
      const start = new Date(r.startDate + 'T00:00:00');
      return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
    }).length;

    const pendingApprovals = this.vacationRequests.filter(r => r.status === 'PENDENTE' || r.status === 'APROVADA_GESTOR').length;

    // Férias com vencimento concessivo próximo (menos de 60 dias) com saldo a gozar
    const expiringCount = this.accrualPeriods.filter(p => {
      if (p.daysRemaining <= 0) return false;
      const concEnd = new Date(p.concessiveEnd + 'T00:00:00');
      const diffDays = (concEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 60;
    }).length;

    const totalSoldDays = this.vacationRequests
      .filter(r => r.status !== 'REJEITADA' && r.status !== 'CANCELADA')
      .reduce((sum, r) => sum + (r.sellDays || 0), 0);

    const departmentStats = this.departments.map(dep => {
      const staff = this.employees.filter(e => e.departmentId === dep.id && e.active);
      const staffIds = new Set(staff.map(e => e.id));
      const onVacation = this.vacationRequests.filter(r => {
        if (!staffIds.has(r.employeeId)) return false;
        if (r.status !== 'APROVADA_RH') return false;
        const s = new Date(r.startDate + 'T00:00:00');
        const e = new Date(r.endDate + 'T00:00:00');
        return today >= s && today <= e;
      }).length;

      return {
        departmentId: dep.id,
        departmentName: dep.name,
        totalStaff: staff.length,
        onVacationCount: onVacation,
      };
    });

    return {
      totalEmployees: this.employees.filter(e => e.active).length,
      scheduledVacationsThisMonth: scheduledThisMonth,
      pendingApprovalsCount: pendingApprovals,
      expiringConcessiveCount: expiringCount,
      soldDaysCount: totalSoldDays,
      departmentStats,
    };
  }
}

export const vacationStore = new VacationDataStore();
