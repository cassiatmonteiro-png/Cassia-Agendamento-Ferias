import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertCircle, 
  FileDown, 
  Building2, 
  User, 
  Calendar,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  VacationRequest, 
  Employee, 
  Department, 
  AccrualPeriod 
} from '../types/index.ts';
import { formatDateBR } from '../lib/clt-rules.ts';
import { exportVacationReportPDF } from '../lib/pdf-export.ts';
import { exportVacationReportExcel } from '../lib/excel-export.ts';

interface VacationHistoryViewProps {
  vacations: VacationRequest[];
  employees: Employee[];
  departments: Department[];
  accrualPeriods: AccrualPeriod[];
  currentUser: Employee;
  onUpdateStatus: (requestId: number, newStatus: VacationRequest['status'], reason?: string) => void;
  onOpenNewVacationModal: () => void;
}

export const VacationHistoryView: React.FC<VacationHistoryViewProps> = ({
  vacations,
  employees,
  departments,
  accrualPeriods,
  currentUser,
  onUpdateStatus,
  onOpenNewVacationModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MINE' | 'MY_TEAM'>('ALL');

  // Modal de Rejeição com justificativa
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const depMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);

  // Filtra as solicitações
  const filteredList = useMemo(() => {
    return vacations.filter(v => {
      const emp = empMap.get(v.employeeId);
      if (!emp) return false;

      // Filtro de Escopo (Minhas / Da Minha Equipe / Todas)
      if (scopeFilter === 'MINE' && v.employeeId !== currentUser.id) {
        return false;
      }
      if (scopeFilter === 'MY_TEAM') {
        if (emp.managerId !== currentUser.id && emp.departmentId !== currentUser.departmentId) {
          return false;
        }
      }

      // Filtro de Departamento
      if (departmentFilter !== 'ALL' && emp.departmentId !== departmentFilter) {
        return false;
      }

      // Filtro de Status
      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      // Busca textual por nome ou matrícula
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesMatr = emp.registrationNumber.toLowerCase().includes(query);
        const matchesRole = emp.jobTitle.toLowerCase().includes(query);
        if (!matchesName && !matchesMatr && !matchesRole) return false;
      }

      return true;
    });
  }, [vacations, empMap, scopeFilter, currentUser, departmentFilter, statusFilter, searchTerm]);

  const handleConfirmRejection = () => {
    if (!rejectingRequestId) return;
    onUpdateStatus(rejectingRequestId, 'REJEITADA', rejectionReason || 'Solicitação indeferida pela gestão.');
    setRejectingRequestId(null);
    setRejectionReason('');
  };

  const handleExportPDF = () => {
    exportVacationReportPDF({
      title: 'Relatório de Solicitações e Histórico de Férias',
      requests: filteredList,
      employees,
      departments,
      filterDescription: `Filtros aplicados: ${statusFilter !== 'ALL' ? statusFilter : 'Todos os status'}, ${departmentFilter !== 'ALL' ? depMap.get(departmentFilter)?.name : 'Todos os setores'}`,
    });
  };

  const handleExportExcel = () => {
    exportVacationReportExcel({
      requests: filteredList,
      employees,
      departments,
      accrualPeriods,
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Reporting Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <FileText className="w-5 h-5 text-blue-600 mr-2" />
            Solicitações e Histórico de Férias
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe o fluxo de aprovação por Gestor e RH, auditoria CLT e prazos de gozo.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <FileDown className="w-4 h-4 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <FileDown className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={onOpenNewVacationModal}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            <span>+ Solicitar Férias</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Scope Pill Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setScopeFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              scopeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({vacations.length})
          </button>
          <button
            onClick={() => setScopeFilter('MINE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              scopeFilter === 'MINE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Minhas Férias ({vacations.filter(v => v.employeeId === currentUser.id).length})
          </button>
          {(currentUser.role === 'GESTOR' || currentUser.role === 'RH' || currentUser.role === 'ADMIN') && (
            <button
              onClick={() => setScopeFilter('MY_TEAM')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                scopeFilter === 'MY_TEAM' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Meu Setor / Equipe
            </button>
          )}
        </div>

        {/* Search, Dept and Status */}
        <div className="flex items-center flex-wrap gap-2.5 flex-1 justify-end">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-xs rounded-xl pl-9 pr-3 py-1.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Department */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="bg-slate-50 text-xs text-slate-700 rounded-xl px-2.5 py-1.5 border border-slate-200 focus:outline-none"
          >
            <option value="ALL">Todos os Setores</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 text-xs text-slate-700 rounded-xl px-2.5 py-1.5 border border-slate-200 focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Em Análise</option>
            <option value="APROVADA_GESTOR">Aprovada (Gestor)</option>
            <option value="APROVADA_RH">Aprovada (RH)</option>
            <option value="REJEITADA">Recusada</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-3">Departamento</th>
                <th className="py-3 px-3">Período de Férias</th>
                <th className="py-3 px-3 text-center">Duração</th>
                <th className="py-3 px-3 text-center">Abono (CLT 143)</th>
                <th className="py-3 px-3">Sobreposição (Máx 7d)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Nenhuma solicitação encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                filteredList.map(r => {
                  const emp = empMap.get(r.employeeId);
                  const dep = emp ? depMap.get(emp.departmentId) : undefined;
                  const confEmp = r.conflictingEmployeeId ? empMap.get(r.conflictingEmployeeId) : undefined;

                  const isPending = r.status === 'PENDENTE';
                  const isManagerApproved = r.status === 'APROVADA_GESTOR';
                  const isFullyApproved = r.status === 'APROVADA_RH';
                  const isRejected = r.status === 'REJEITADA';

                  // Permissões de Ação
                  const canGestorApprove = (currentUser.role === 'GESTOR' || currentUser.role === 'ADMIN') && isPending;
                  const canRhApprove = (currentUser.role === 'RH' || currentUser.role === 'ADMIN') && (isPending || isManagerApproved);
                  const canCancel = (currentUser.id === r.employeeId || currentUser.role === 'ADMIN') && isPending;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      {/* Colaborador */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{emp?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Matrícula: {emp?.registrationNumber} | {emp?.jobTitle}
                        </div>
                      </td>

                      {/* Departamento */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {dep?.name || '-'}
                        </span>
                      </td>

                      {/* Período */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-800 font-semibold text-[11px]">
                          {formatDateBR(r.startDate)} a {formatDateBR(r.endDate)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.installmentNumber}ª Fração CLT
                        </div>
                      </td>

                      {/* Duração */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                          {r.durationDays} dias
                        </span>
                      </td>

                      {/* Abono CLT 143 */}
                      <td className="py-3 px-3 text-center">
                        {r.sellDays > 0 ? (
                          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px]">
                            {r.sellDays} dias vendidos
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Não</span>
                        )}
                      </td>

                      {/* Sobreposição Departamental */}
                      <td className="py-3 px-3">
                        {r.hasDepartmentOverlap ? (
                          <div className="text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                            <span className="font-bold text-amber-700">{r.overlapDays}d</span> sobrep. com {confEmp?.name?.split(' ')[0]}
                            <span className="block text-[9px] text-amber-600">
                              (Exceção autorizada &le; 7 dias)
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 text-[11px] flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sem sobreposição
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {isFullyApproved && (
                          <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovada RH
                          </span>
                        )}
                        {isManagerApproved && (
                          <span className="inline-flex items-center bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3 mr-1" /> Aprov. Gestor
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3 mr-1" /> Em Análise
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <X className="w-3 h-3 mr-1" /> Recusada
                            </span>
                            {r.rejectionReason && (
                              <p className="text-[10px] text-rose-600 mt-1 max-w-[140px] truncate" title={r.rejectionReason}>
                                {r.rejectionReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Botão Aprovar Gestor */}
                          {canGestorApprove && (
                            <button
                              onClick={() => onUpdateStatus(r.id, 'APROVADA_GESTOR')}
                              title="Aprovar como Gestor"
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg transition"
                            >
                              Aprovar (Gestor)
                            </button>
                          )}

                          {/* Botão Aprovação Final RH */}
                          {canRhApprove && (
                            <button
                              onClick={() => onUpdateStatus(r.id, 'APROVADA_RH')}
                              title="Aprovação Final pelo RH"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition"
                            >
                              Aprovar (RH)
                            </button>
                          )}

                          {/* Botão Recusar */}
                          {(canGestorApprove || canRhApprove) && (
                            <button
                              onClick={() => setRejectingRequestId(r.id)}
                              title="Recusar Solicitação"
                              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-semibold rounded-lg transition"
                            >
                              Recusar
                            </button>
                          )}

                          {/* Cancelar pelo Funcionário */}
                          {canCancel && !canGestorApprove && !canRhApprove && (
                            <button
                              onClick={() => onUpdateStatus(r.id, 'CANCELADA')}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Rejeição de Férias */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Recusar Solicitação de Férias
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Informe a justificativa para que o colaborador compreenda o motivo do indeferimento e possa propor novas datas.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Alta demanda de fechamento contábil no período ou necessidade de cobertura presencial..."
              className="w-full bg-slate-50 text-xs rounded-xl p-3 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectingRequestId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition shadow-md shadow-rose-500/20"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
