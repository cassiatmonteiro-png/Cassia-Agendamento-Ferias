import React from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  FileDown, 
  CheckCircle2, 
  Building2, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { 
  DashboardStats, 
  Employee, 
  Department, 
  VacationRequest, 
  AccrualPeriod 
} from '../types/index.ts';
import { formatDateBR } from '../lib/clt-rules.ts';
import { exportVacationReportPDF } from '../lib/pdf-export.ts';
import { exportVacationReportExcel } from '../lib/excel-export.ts';

interface DashboardViewProps {
  stats: DashboardStats;
  currentUser: Employee;
  employees: Employee[];
  departments: Department[];
  vacations: VacationRequest[];
  accrualPeriods: AccrualPeriod[];
  onOpenNewVacationModal: () => void;
  onNavigateToTab: (tab: 'calendar' | 'vacations' | 'employees' | 'clt') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  currentUser,
  employees,
  departments,
  vacations,
  accrualPeriods,
  onOpenNewVacationModal,
  onNavigateToTab,
}) => {
  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(departments.map(d => [d.id, d]));

  // Identifica férias com sobreposição
  const overlappingVacations = vacations.filter(v => v.hasDepartmentOverlap);

  // Férias vencendo em breve no concessivo
  const expiringPeriods = accrualPeriods.filter(p => {
    if (p.daysRemaining <= 0) return false;
    const today = new Date();
    const concEnd = new Date(p.concessiveEnd + 'T00:00:00');
    const diffDays = Math.round((concEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 60 && diffDays >= 0;
  });

  const handleExportPDF = () => {
    exportVacationReportPDF({
      title: 'Relatório Executivo de Férias e Conformidade CLT',
      requests: vacations,
      employees,
      departments,
      filterDescription: 'Visão Geral Consolidada da Empresa',
    });
  };

  const handleExportExcel = () => {
    exportVacationReportExcel({
      requests: vacations,
      employees,
      departments,
      accrualPeriods,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Welcome & Reporting Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800/60">
              Painel de Controle CLT
            </span>
            <span className="text-xs text-slate-400">Ano Vigente: 2026</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1.5">
            Olá, {currentUser.name}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-0.5">
            Monitoramento de períodos aquisitivos, prazos concessivos para evitar pagamento em dobro (Art. 137 CLT) e política de sobreposição máxima de 7 dias por departamento.
          </p>
        </div>

        {/* Quick Export & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-700 transition shadow-sm hover:border-slate-600"
          >
            <FileDown className="w-4 h-4 text-rose-400" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition shadow-sm"
          >
            <FileDown className="w-4 h-4 text-emerald-200" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={onOpenNewVacationModal}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            <span>+ Nova Solicitação</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Colaboradores */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Colaboradores Ativos</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEmployees}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{departments.length} Departamentos</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Férias no Mês */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Férias este Mês</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.scheduledVacationsThisMonth}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Programadas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Solicitações Pendentes */}
        <div 
          onClick={() => onNavigateToTab('vacations')}
          className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Aprovações Pendentes</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingApprovalsCount}</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5 flex items-center">
              Requer Análise <ArrowRight className="w-3 h-3 ml-0.5" />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Férias Próximas ao Vencimento Concessivo (CLT 137) */}
        <div 
          onClick={() => onNavigateToTab('employees')}
          className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-rose-400 transition"
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Risco Dobra CLT (137)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.expiringConcessiveCount}</p>
            <p className="text-[11px] text-rose-500 font-medium mt-0.5">&lt; 60 dias para expirar</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Abono Pecuniário */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Dias Vendidos (Abono)</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.soldDaysCount}d</p>
            <p className="text-[11px] text-slate-400 mt-0.5">CLT Art. 143 (1/3)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Departmental Status & CLT Overlap Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Department Distribution & Occupancy */}
        <div className="lg:col-span-2 space-y-6">
          {/* Departmental Availability Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                  Ocupação e Férias por Departamento
                </h2>
                <p className="text-xs text-slate-500">
                  Controle para assegurar que nenhum setor fique desfalcado.
                </p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Limite padrão: máx 1 simultâneo (ou sobreposição &le; 7d)
              </span>
            </div>

            <div className="space-y-4">
              {stats.departmentStats.map(dep => {
                const percentage = dep.totalStaff > 0 ? (dep.onVacationCount / dep.totalStaff) * 100 : 0;
                const isOverLimit = dep.onVacationCount > 1;

                return (
                  <div key={dep.departmentId} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800">{dep.departmentName}</span>
                      <span className="text-slate-600">
                        <strong className="text-slate-900">{dep.onVacationCount}</strong> de {dep.totalStaff} em férias ({Math.round(percentage)}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isOverLimit ? 'bg-amber-500' : (dep.onVacationCount > 0 ? 'bg-blue-600' : 'bg-slate-300')
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Scheduled Vacations Table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <Calendar className="w-5 h-5 text-indigo-600 mr-2" />
                Próximas Férias Programadas
              </h2>
              <button
                onClick={() => onNavigateToTab('vacations')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
              >
                Ver todas ({vacations.length}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2">Colaborador</th>
                    <th className="pb-2">Departamento</th>
                    <th className="pb-2">Período</th>
                    <th className="pb-2">Dias</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Sobreposição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vacations.slice(0, 5).map(v => {
                    const emp = empMap.get(v.employeeId);
                    const dep = emp ? depMap.get(emp.departmentId) : undefined;
                    const confEmp = v.conflictingEmployeeId ? empMap.get(v.conflictingEmployeeId) : undefined;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 font-medium text-slate-900">
                          {emp ? emp.name : `ID #${v.employeeId}`}
                          <div className="text-[10px] text-slate-400">{emp?.jobTitle}</div>
                        </td>
                        <td className="py-2.5 text-slate-600">{dep?.code || '-'}</td>
                        <td className="py-2.5 text-slate-700 font-mono text-[11px]">
                          {formatDateBR(v.startDate)} a {formatDateBR(v.endDate)}
                        </td>
                        <td className="py-2.5 text-slate-700 font-semibold">{v.durationDays}d</td>
                        <td className="py-2.5">
                          {v.status === 'APROVADA_RH' && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Aprovada RH
                            </span>
                          )}
                          {v.status === 'APROVADA_GESTOR' && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Aprov. Gestor
                            </span>
                          )}
                          {v.status === 'PENDENTE' && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Em Análise
                            </span>
                          )}
                          {v.status === 'REJEITADA' && (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Recusada
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          {v.hasDepartmentOverlap ? (
                            <span className="inline-flex items-center text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              <Info className="w-3 h-3 mr-1 text-amber-600" />
                              {v.overlapDays}d com {confEmp?.name?.split(' ')[0]} (&le;7d OK)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sem sobreposição</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: CLT Warnings, Concurrency Rules & Concessive Deadlines */}
        <div className="space-y-6">
          {/* Overlap & 7-Day Rule Enforcement Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-indigo-800">
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Regra de Não-Sobreposição</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Tolerância Departamental de 7 Dias
            </h3>
            <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
              Para preservar a continuidade operacional, dois funcionários do mesmo setor não podem gozar férias simultâneas, <strong>salvo sobreposição máxima autorizada de até 7 dias corridos (1 semana)</strong>. Solicitações com sobreposição superior a 7 dias são bloqueadas automaticamente pelo sistema.
            </p>

            <div className="mt-4 pt-3 border-t border-indigo-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-200">Férias com sobreposição ativa:</span>
                <span className="font-bold text-amber-400">{overlappingVacations.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-200">Status de conformidade:</span>
                <span className="font-bold text-emerald-400 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 100% em conformidade
                </span>
              </div>
            </div>
          </div>

          {/* CLT Article 137 Alert: Concessive Expiration (Risco Pagamento em Dobro) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <AlertTriangle className="w-4 h-4 text-rose-500 mr-2" />
                Alerta de Período Concessivo (CLT 137)
              </h3>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {expiringPeriods.length} Críticos
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Férias não concedidas até o fim do período concessivo devem ser remuneradas em dobro pelo empregador.
            </p>

            {expiringPeriods.length > 0 ? (
              <div className="space-y-2.5">
                {expiringPeriods.map(p => {
                  const emp = empMap.get(p.employeeId);
                  const dep = emp ? depMap.get(emp.departmentId) : undefined;
                  return (
                    <div key={p.id} className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-xs">
                      <div className="flex items-center justify-between font-semibold text-rose-900">
                        <span>{emp?.name}</span>
                        <span className="text-rose-600 font-bold">{p.daysRemaining} dias a gozar</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Setor: {dep?.name} | Vence em: <strong>{formatDateBR(p.concessiveEnd)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                Nenhum colaborador com risco imediato de dobra de férias.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
