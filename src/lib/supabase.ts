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
 * Salva uma nova solicitação de férias diretamente no Supabase
 */
export async function insertVacationToSupabase(vac: VacationRequest): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('vacation_requests').insert({
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
    });

    if (error) {
      console.warn('Erro ao inserir férias no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de conexão com Supabase:', err);
    return false;
  }
}

/**
 * Atualiza status no Supabase
 */
export async function updateVacationStatusInSupabase(
  id: number, 
  status: VacationRequest['status'], 
  rejectionReason?: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (rejectionReason) {
      updatePayload.rejection_reason = rejectionReason;
    }

    const { error } = await client
      .from('vacation_requests')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.warn('Erro ao atualizar status no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao atualizar no Supabase:', err);
    return false;
  }
}
