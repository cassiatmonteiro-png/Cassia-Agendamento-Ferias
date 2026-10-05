import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Department, Employee, AccrualPeriod, VacationRequest } from '../types/index.ts';

const SUPABASE_STORAGE_KEYS = {
  URL: 'clt_supabase_url_custom',
  KEY: 'clt_supabase_key_custom',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey && !envUrl.includes('your-project.supabase.co')) {
    return { url: envUrl, anonKey: envKey, isConfigured: true, source: 'env' };
  }

  // Permite também configuração rápida via UI para facilitar o teste imediato
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const customUrl = localStorage.getItem(SUPABASE_STORAGE_KEYS.URL) || '';
    const customKey = localStorage.getItem(SUPABASE_STORAGE_KEYS.KEY) || '';
    if (customUrl && customKey) {
      return { url: customUrl, anonKey: customKey, isConfigured: true, source: 'custom' };
    }
  }

  return { url: '', anonKey: '', isConfigured: false, source: 'none' };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(SUPABASE_STORAGE_KEYS.URL, url.trim());
    localStorage.setItem(SUPABASE_STORAGE_KEYS.KEY, anonKey.trim());
    _clientInstance = null; // recria cliente
  }
}

export function clearCustomSupabaseConfig() {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(SUPABASE_STORAGE_KEYS.URL);
    localStorage.removeItem(SUPABASE_STORAGE_KEYS.KEY);
    _clientInstance = null;
  }
}

let _clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_clientInstance) return _clientInstance;

  const config = getSupabaseConfig();
  if (!config.isConfigured || !config.url || !config.anonKey) {
    return null;
  }

  try {
    _clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return _clientInstance;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

/**
 * Testa a conexão com o banco de dados Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; tableCount?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL ou Chave Anon do Supabase não configuradas.' };
  }

  try {
    const { data, error } = await client.from('departments').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        return { 
          success: false, 
          message: 'Conectado ao Supabase, mas a tabela "departments" ainda não existe. Execute o script de migração SQL no SQL Editor do Supabase.' 
        };
      }
      return { success: false, message: `Erro do Supabase: ${error.message}` };
    }

    return { 
      success: true, 
      message: 'Conexão ativa com o banco PostgreSQL no Supabase com sucesso!',
      tableCount: data as any
    };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err.message}` };
  }
}

/**
 * Funções de sincronização de dados com Supabase
 */
export async function fetchAllFromSupabase(): Promise<{
  departments: Department[];
  employees: Employee[];
  accrualPeriods: AccrualPeriod[];
  vacations: VacationRequest[];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [depRes, empRes, accRes, vacRes] = await Promise.all([
      client.from('departments').select('*').order('id'),
      client.from('employees').select('*').order('id'),
      client.from('accrual_periods').select('*').order('id'),
      client.from('vacation_requests').select('*').order('id', { ascending: false }),
    ]);

    if (depRes.error || empRes.error || accRes.error || vacRes.error) {
      console.warn('Erro ao consultar tabelas do Supabase:', depRes.error || empRes.error || accRes.error || vacRes.error);
      return null;
    }

    // Mapeia colunas snake_case do Postgres para camelCase do TypeScript
    const departments: Department[] = (depRes.data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description || '',
      maxConcurrentVacations: d.max_concurrent_vacations || 1,
    }));

    const employees: Employee[] = (empRes.data || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      cpf: e.cpf,
      registrationNumber: e.registration_number,
      role: e.role,
      departmentId: e.department_id,
      managerId: e.manager_id,
      hireDate: e.hire_date,
      jobTitle: e.job_title,
      active: e.active !== false,
    }));

    const accrualPeriods: AccrualPeriod[] = (accRes.data || []).map((a: any) => ({
      id: a.id,
      employeeId: a.employee_id,
      periodNumber: a.period_number,
      acquisitiveStart: a.acquisitive_start,
      acquisitiveEnd: a.acquisitive_end,
      concessiveStart: a.concessive_start,
      concessiveEnd: a.concessive_end,
      totalDaysEntitled: a.total_days_entitled || 30,
      daysTaken: a.days_taken || 0,
      daysSold: a.days_sold || 0,
      daysRemaining: a.days_remaining || 30,
      status: a.status,
    }));

    const vacations: VacationRequest[] = (vacRes.data || []).map((v: any) => ({
      id: v.id,
      employeeId: v.employee_id,
      accrualPeriodId: v.accrual_period_id,
      startDate: v.start_date,
      endDate: v.end_date,
      durationDays: v.duration_days,
      installmentNumber: v.installment_number || 1,
      sellDays: v.sell_days || 0,
      status: v.status,
      hasDepartmentOverlap: v.has_department_overlap || false,
      overlapDays: v.overlap_days || 0,
      conflictingEmployeeId: v.conflicting_employee_id || null,
      notes: v.notes || '',
      rejectionReason: v.rejection_reason || '',
      createdAt: v.created_at || new Date().toISOString(),
      updatedAt: v.updated_at || new Date().toISOString(),
    }));

    return { departments, employees, accrualPeriods, vacations };
  } catch (err) {
    console.error('Falha geral ao sincronizar com Supabase:', err);
    return null;
  }
}

/**
 * Salva um departamento no Supabase
 */
export async function insertDepartmentToSupabase(dep: Department): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  try {
    const { error } = await client.from('departments').upsert({
      id: dep.id,
      name: dep.name,
      code: dep.code,
      description: dep.description || null,
      max_concurrent_vacations: dep.maxConcurrentVacations || 1,
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar departamento no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Falha de conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Salva um colaborador no Supabase
 */
export async function insertEmployeeToSupabase(emp: Employee): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  try {
    const { error } = await client.from('employees').upsert({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      cpf: emp.cpf,
      registration_number: emp.registrationNumber,
      role: emp.role,
      department_id: emp.departmentId,
      manager_id: emp.managerId || null,
      hire_date: emp.hireDate,
      job_title: emp.jobTitle,
      active: emp.active !== false,
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar colaborador no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Falha de conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza um colaborador no Supabase
 */
export async function updateEmployeeInSupabase(id: number, data: Partial<Employee>): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) payload.name = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.cpf !== undefined) payload.cpf = data.cpf;
    if (data.registrationNumber !== undefined) payload.registration_number = data.registrationNumber;
    if (data.role !== undefined) payload.role = data.role;
    if (data.departmentId !== undefined) payload.department_id = data.departmentId;
    if (data.managerId !== undefined) payload.manager_id = data.managerId || null;
    if (data.hireDate !== undefined) payload.hire_date = data.hireDate;
    if (data.jobTitle !== undefined) payload.job_title = data.jobTitle;
    if (data.active !== undefined) payload.active = data.active;

    const { error } = await client.from('employees').update(payload).eq('id', id);
    if (error) {
      console.warn('Erro ao atualizar colaborador no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Falha de conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Salva períodos aquisitivos no Supabase
 */
export async function insertAccrualPeriodsToSupabase(periods: AccrualPeriod[]): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || periods.length === 0) return { success: false, error: 'Supabase não configurado ou períodos vazios' };

  try {
    const payload = periods.map(p => ({
      id: p.id,
      employee_id: p.employeeId,
      period_number: p.periodNumber,
      acquisitive_start: p.acquisitiveStart,
      acquisitive_end: p.acquisitiveEnd,
      concessive_start: p.concessiveStart,
      concessive_end: p.concessiveEnd,
      total_days_entitled: p.totalDaysEntitled || 30,
      days_taken: p.daysTaken || 0,
      days_sold: p.daysSold || 0,
      days_remaining: p.daysRemaining || 30,
      status: p.status,
    }));

    const { error } = await client.from('accrual_periods').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao salvar períodos no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Falha de conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza saldo do período aquisitivo no Supabase
 */
export async function updateAccrualPeriodInSupabase(period: AccrualPeriod): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  try {
    const { error } = await client.from('accrual_periods').update({
      days_taken: period.daysTaken,
      days_sold: period.daysSold,
      days_remaining: period.daysRemaining,
      status: period.status,
      updated_at: new Date().toISOString(),
    }).eq('id', period.id);

    if (error) {
      console.warn('Erro ao atualizar período no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Falha de conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Salva uma nova solicitação de férias diretamente no Supabase
 */
export async function insertVacationToSupabase(vac: VacationRequest): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  try {
    const { error } = await client.from('vacation_requests').upsert({
      id: vac.id,
      employee_id: vac.employeeId,
      accrual_period_id: vac.accrualPeriodId,
      start_date: vac.startDate,
      end_date: vac.endDate,
      duration_days: vac.durationDays,
      installment_number: vac.installmentNumber,
      sell_days: vac.sellDays,
      status: vac.status,
      has_department_overlap: vac.hasDepartmentOverlap,
      overlap_days: vac.overlapDays,
      conflicting_employee_id: vac.conflictingEmployeeId,
      notes: vac.notes || null,
      created_at: vac.createdAt,
      updated_at: vac.updatedAt,
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao inserir férias no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Erro de conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza status no Supabase
 */
export async function updateVacationStatusInSupabase(
  id: number, 
  status: VacationRequest['status'], 
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  try {
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (rejectionReason !== undefined) {
      updatePayload.rejection_reason = rejectionReason;
    }

    const { error } = await client
      .from('vacation_requests')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.warn('Erro ao atualizar status no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao atualizar no Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Envia todos os dados locais para as tabelas do Supabase (Upsert em massa)
 */
export async function pushAllLocalDataToSupabase(params: {
  departments: Department[];
  employees: Employee[];
  accrualPeriods: AccrualPeriod[];
  vacations: VacationRequest[];
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não conectado. Informe a URL e a Anon Key nas configurações.' };
  }

  try {
    // 1. Departamentos
    if (params.departments.length > 0) {
      const depsPayload = params.departments.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        max_concurrent_vacations: d.maxConcurrentVacations
      }));
      const { error: dErr } = await client.from('departments').upsert(depsPayload, { onConflict: 'id' });
      if (dErr) throw dErr;
    }

    // 2. Colaboradores
    if (params.employees.length > 0) {
      const empsPayload = params.employees.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        cpf: e.cpf,
        registration_number: e.registrationNumber,
        role: e.role,
        department_id: e.departmentId,
        manager_id: e.managerId,
        hire_date: e.hireDate,
        job_title: e.jobTitle,
        active: e.active
      }));
      const { error: eErr } = await client.from('employees').upsert(empsPayload, { onConflict: 'id' });
      if (eErr) throw eErr;
    }

    // 3. Períodos Aquisitivos
    if (params.accrualPeriods.length > 0) {
      const accsPayload = params.accrualPeriods.map(a => ({
        id: a.id,
        employee_id: a.employeeId,
        period_number: a.periodNumber,
        acquisitive_start: a.acquisitiveStart,
        acquisitive_end: a.acquisitiveEnd,
        concessive_start: a.concessiveStart,
        concessive_end: a.concessiveEnd,
        total_days_entitled: a.totalDaysEntitled,
        days_taken: a.daysTaken,
        days_sold: a.daysSold,
        days_remaining: a.daysRemaining,
        status: a.status
      }));
      const { error: aErr } = await client.from('accrual_periods').upsert(accsPayload, { onConflict: 'id' });
      if (aErr) throw aErr;
    }

    // 4. Solicitações de Férias
    if (params.vacations.length > 0) {
      const vacsPayload = params.vacations.map(v => ({
        id: v.id,
        employee_id: v.employeeId,
        accrual_period_id: v.accrualPeriodId,
        start_date: v.startDate,
        end_date: v.endDate,
        duration_days: v.durationDays,
        installment_number: v.installmentNumber,
        sell_days: v.sellDays,
        status: v.status,
        has_department_overlap: v.hasDepartmentOverlap,
        overlap_days: v.overlapDays,
        conflicting_employee_id: v.conflictingEmployeeId,
        notes: v.notes || null,
        rejection_reason: v.rejectionReason || null,
        created_at: v.createdAt,
        updated_at: v.updatedAt
      }));
      const { error: vErr } = await client.from('vacation_requests').upsert(vacsPayload, { onConflict: 'id' });
      if (vErr) throw vErr;
    }

    return { 
      success: true, 
      message: `Sucesso! ${params.departments.length} departamentos, ${params.employees.length} colaboradores, ${params.accrualPeriods.length} períodos e ${params.vacations.length} solicitações de férias foram sincronizados com o Supabase!` 
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao enviar dados para o Supabase: ${err.message}` };
  }
}
