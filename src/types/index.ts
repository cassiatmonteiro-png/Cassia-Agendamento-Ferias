/**
 * Definições de Tipos para o Sistema de Férias CLT
 */

export type UserRole = 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

export type RequestStatus = 
  | 'PENDENTE' 
  | 'APROVADA_GESTOR' 
  | 'APROVADA_RH' 
  | 'REJEITADA' 
  | 'CANCELADA';

export type PeriodStatus = 
  | 'EM_ANDAMENTO' 
  | 'ADQUIRIDO' 
  | 'CONCEDIDO' 
  | 'VENCIDO';

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  maxConcurrentVacations: number;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  cpf: string;
  registrationNumber: string; // Matrícula
  role: UserRole;
  departmentId: number;
  managerId: number | null;
  hireDate: string; // YYYY-MM-DD
  jobTitle: string;
  active: boolean;
}

export interface AccrualPeriod {
  id: number;
  employeeId: number;
  periodNumber: number; // 1º ano, 2º ano...
  acquisitiveStart: string; // YYYY-MM-DD
  acquisitiveEnd: string;
  concessiveStart: string;
  concessiveEnd: string;
  totalDaysEntitled: number; // normalmente 30
  daysTaken: number;
  daysSold: number; // abono pecuniário (máx 10)
  daysRemaining: number;
  status: PeriodStatus;
}

export interface VacationRequest {
  id: number;
  employeeId: number;
  accrualPeriodId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  installmentNumber: number; // 1, 2 ou 3
  sellDays: number; // 0 ou até 10 (abono pecuniário)
  status: RequestStatus;
  
  // Regras de Sobreposição
  hasDepartmentOverlap: boolean;
  overlapDays: number;
  conflictingEmployeeId: number | null;
  
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VacationApproval {
  id: number;
  vacationRequestId: number;
  approvedBy: number;
  action: 'APROVADO_GESTOR' | 'APROVADO_RH' | 'REJEITADO';
  comment?: string;
  timestamp: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  allowedByException: boolean; // se sobreposição <= 7 dias
  blocked: boolean; // se sobreposição > 7 dias ou mesmo funcionário
  blockReason?: string;
  conflictingEmployee?: Employee;
  conflictingVacation?: VacationRequest;
  overlapDays: number;
  overlapStartDate?: string;
  overlapEndDate?: string;
  cltViolations: string[];
  warnings: string[];
}

export interface AlternativeDateSuggestion {
  startDate: string;
  endDate: string;
  durationDays: number;
  explanation: string;
  badge: 'Recomendada' | 'Após Colega' | 'Antes do Colega' | 'Próximo Mês';
}

export interface NationalHoliday {
  date: string;
  name: string;
}

export interface DashboardStats {
  totalEmployees: number;
  scheduledVacationsThisMonth: number;
  pendingApprovalsCount: number;
  expiringConcessiveCount: number; // Férias no limite concessivo (risco CLT dobra)
  soldDaysCount: number; // Total de dias em abono
  departmentStats: {
    departmentId: number;
    departmentName: string;
    totalStaff: number;
    onVacationCount: number;
  }[];
}
