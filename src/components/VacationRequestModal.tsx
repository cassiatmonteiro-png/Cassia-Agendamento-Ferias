import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  DollarSign, 
  Info, 
  ShieldAlert,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  Employee, 
  AccrualPeriod, 
  VacationRequest, 
  ConflictCheckResult, 
  AlternativeDateSuggestion 
} from '../types/index.ts';
import { 
  validateCLTRules, 
  formatDateBR, 
  formatDateISO, 
  getNextValidCLTStartDate 
} from '../lib/clt-rules.ts';
import { vacationStore } from '../lib/storage.ts';

interface VacationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  allEmployees: Employee[];
  allAccrualPeriods: AccrualPeriod[];
  allVacationRequests: VacationRequest[];
  initialStartDate?: string;
  onSuccess: () => void;
}

export const VacationRequestModal: React.FC<VacationRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allEmployees,
  allAccrualPeriods,
  allVacationRequests,
  initialStartDate,
  onSuccess,
}) => {
  // Se o usuário for FUNCIONARIO, fixa nele; se for GESTOR/RH/ADMIN, pode selecionar outros
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(currentUser.id);
  const [startDate, setStartDate] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(15);
  const [sellDays, setSellDays] = useState<number>(0); // Abono pecuniário
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializa data inicial padrão válida (evita sexta/sábado)
  useEffect(() => {
    if (initialStartDate) {
      setStartDate(initialStartDate);
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 35); // 35 dias à frente (respeitando aviso prévio CLT 135)
      const validDate = getNextValidCLTStartDate(defaultDate);
      setStartDate(formatDateISO(validDate));
    }
  }, [initialStartDate, isOpen]);

  // Sempre que mudar currentUser, ajusta selectedEmployeeId
  useEffect(() => {
    setSelectedEmployeeId(currentUser.id);
  }, [currentUser]);

  const selectedEmployee = useMemo(() => {
    return allEmployees.find(e => e.id === selectedEmployeeId) || currentUser;
  }, [allEmployees, selectedEmployeeId, currentUser]);

  // Período aquisitivo ativo do colaborador selecionado
  const activePeriod = useMemo(() => {
    return vacationStore.getActiveAccrualPeriod(selectedEmployee.id) || allAccrualPeriods.find(p => p.employeeId === selectedEmployee.id);
  }, [selectedEmployee, allAccrualPeriods]);

  // Calcula data final
  const endDate = useMemo(() => {
    if (!startDate || durationDays <= 0) return '';
    const s = new Date(startDate + 'T00:00:00');
    if (isNaN(s.getTime())) return '';
    const e = new Date(s);
    e.setDate(e.getDate() + durationDays - 1);
    return formatDateISO(e);
  }, [startDate, durationDays]);

  // Validação em Tempo Real das Regras da CLT
  const cltValidation = useMemo(() => {
    if (!startDate || !endDate || !activePeriod) {
      return { isValid: false, errors: ['Preencha os campos de data.'], warnings: [] };
    }

    const existingRequests = allVacationRequests.filter(r => r.accrualPeriodId === activePeriod.id);
    return validateCLTRules({
      startDate,
      endDate,
      durationDays,
      sellDays,
      accrualPeriod: activePeriod,
      existingRequestsForPeriod: existingRequests,
    });
  }, [startDate, endDate, durationDays, sellDays, activePeriod, allVacationRequests]);

  // Validação em Tempo Real de Sobreposição e Conflitos Departamentais
  const conflictResult: ConflictCheckResult = useMemo(() => {
    if (!startDate || !endDate) {
      return {
        hasConflict: false,
        allowedByException: false,
        blocked: false,
        overlapDays: 0,
        cltViolations: [],
        warnings: [],
      };
    }

    return vacationStore.checkConflicts({
      employeeId: selectedEmployee.id,
      startDate,
      endDate,
    });
  }, [selectedEmployee, startDate, endDate]);

  // Sugestões de Datas Alternativas quando há bloqueio ou sobreposição
  const alternativeSuggestions: AlternativeDateSuggestion[] = useMemo(() => {
    if (!conflictResult.hasConflict || !startDate) return [];

    return vacationStore.suggestDates({
      employeeId: selectedEmployee.id,
      originalStartDate: startDate,
      durationDays,
      conflictingVacationId: conflictResult.conflictingVacation?.id,
    });
  }, [conflictResult, selectedEmployee, startDate, durationDays]);

  const canSubmit = cltValidation.isValid && !conflictResult.blocked && !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !activePeriod) return;

    setSubmitting(true);
    setErrorMessage(null);

    const result = vacationStore.createVacationRequest({
      employeeId: selectedEmployee.id,
      accrualPeriodId: activePeriod.id,
      startDate,
      endDate,
      durationDays,
      sellDays,
      notes,
    });

    setSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMessage(result.error || 'Erro ao processar a solicitação de férias.');
    }
  };

  const applySuggestion = (sug: AlternativeDateSuggestion) => {
    setStartDate(sug.startDate);
    setDurationDays(sug.durationDays);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Nova Solicitação de Férias
              </h2>
              <p className="text-xs text-slate-500">
                Validação automática CLT Art. 130 a 145 e checagem de sobreposição
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center">
            <AlertTriangle className="w-4 h-4 text-rose-600 mr-2 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection & Accrual Balance Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                Colaborador Solicitante:
              </label>

              {currentUser.role === 'FUNCIONARIO' ? (
                <span className="text-xs font-semibold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                  {currentUser.name} ({currentUser.jobTitle})
                </span>
              ) : (
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                  className="bg-white text-xs text-slate-900 font-semibold rounded-lg px-3 py-1.5 border border-slate-300 focus:ring-1 focus:ring-blue-500"
                >
                  {allEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.jobTitle}) - {e.role}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Accrual Period Badge */}
            {activePeriod ? (
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Período Aquisitivo ({activePeriod.periodNumber}º Período):
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatDateBR(activePeriod.acquisitiveStart)} a {formatDateBR(activePeriod.acquisitiveEnd)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Limite Concessivo (CLT Art. 134):
                  </span>
                  <span className="font-bold text-indigo-700">
                    {formatDateBR(activePeriod.concessiveEnd)}
                  </span>
                </div>

                {/* Balances pills */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-1 rounded">
                    <span className="text-[10px] text-slate-400 block">Direito</span>
                    <strong className="text-slate-700">{activePeriod.totalDaysEntitled}d</strong>
                  </div>
                  <div className="bg-slate-50 p-1 rounded">
                    <span className="text-[10px] text-slate-400 block">Gozados</span>
                    <strong className="text-slate-700">{activePeriod.daysTaken}d</strong>
                  </div>
                  <div className="bg-slate-50 p-1 rounded">
                    <span className="text-[10px] text-slate-400 block">Vendidos</span>
                    <strong className="text-slate-700">{activePeriod.daysSold}d</strong>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-1 rounded">
                    <span className="text-[10px] text-emerald-700 font-medium block">Saldo Restante</span>
                    <strong className="text-emerald-800">{activePeriod.daysRemaining}d</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600">Nenhum período aquisitivo ativo localizado.</p>
            )}
          </div>

          {/* Dates & Duration Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data de Início das Férias:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-white text-xs font-semibold text-slate-900 rounded-xl px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Não pode iniciar na sexta, sábado ou véspera de feriado.
              </span>
            </div>

            {/* Duration Days */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Duração (Dias Corridos):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  required
                  className="w-24 bg-white text-xs font-semibold text-slate-900 rounded-xl px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Presets */}
                <div className="flex items-center space-x-1">
                  {[10, 14, 15, 20, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDurationDays(days)}
                      className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition ${
                        durationDays === days
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Término calculado: <strong>{formatDateBR(endDate) || '-'}</strong>
              </span>
            </div>
          </div>

          {/* Abono Pecuniário (CLT Art. 143) */}
          <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-900 flex items-center">
                <DollarSign className="w-4 h-4 text-indigo-600 mr-1" />
                Abono Pecuniário (Conversão de 1/3 em Dinheiro)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSellDays(sellDays === 10 ? 0 : 10)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                    sellDays === 10
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {sellDays === 10 ? '✓ Vender 10 Dias' : 'Vender 10 Dias'}
                </button>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={sellDays}
                  onChange={(e) => setSellDays(Math.min(10, Math.max(0, Number(e.target.value))))}
                  className="w-16 bg-white text-xs font-bold text-center text-slate-900 rounded-lg p-1 border border-indigo-200"
                />
              </div>
            </div>
            <p className="text-[11px] text-indigo-800 leading-tight">
              A CLT faculta a venda de até 10 dias das férias. Solicitando {durationDays} dias de descanso + {sellDays} dias de abono, totaliza <strong>{durationDays + sellDays} dias consumidos</strong> do período.
            </p>
          </div>

          {/* Conflict & Department Overlap Banner */}
          {conflictResult.hasConflict && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              conflictResult.blocked 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-start">
                {conflictResult.blocked ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 mr-2 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-amber-600 mr-2 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block text-sm">
                    {conflictResult.blocked ? 'SOLICITAÇÃO BLOQUEADA POR CONFLITO' : 'SOBREPOSIÇÃO AUTORIZADA POR EXCEÇÃO'}
                  </strong>
                  <p className="mt-1 leading-relaxed">
                    {conflictResult.blockReason || conflictResult.warnings[0]}
                  </p>
                  {conflictResult.overlapStartDate && (
                    <div className="mt-1 font-mono text-[11px]">
                      Período de coincidência: {formatDateBR(conflictResult.overlapStartDate)} a {formatDateBR(conflictResult.overlapEndDate || '')} ({conflictResult.overlapDays} dias)
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions Box if Blocked */}
              {conflictResult.blocked && alternativeSuggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-rose-200/80 space-y-2">
                  <div className="flex items-center text-xs font-bold text-rose-800">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    <span>Datas Alternativas Sugeridas (Sem Bloqueio):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {alternativeSuggestions.map((sug, i) => (
                      <div
                        key={i}
                        onClick={() => applySuggestion(sug)}
                        className="bg-white p-2.5 rounded-lg border border-rose-200 hover:border-blue-500 hover:shadow-sm cursor-pointer transition text-[11px] group"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800 group-hover:text-blue-600">
                          <span>{formatDateBR(sug.startDate)} a {formatDateBR(sug.endDate)}</span>
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            {sug.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {sug.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CLT Checklist Live Indicators */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
              Conformidade com a Legislação Trabalhista (CLT):
            </span>

            {/* Rule 1: Forbidden start */}
            <div className="flex items-center space-x-2">
              {cltValidation.errors.some(e => e.includes('vedado o início') || e.includes('feriado')) ? (
                <X className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className={cltValidation.errors.some(e => e.includes('vedado o início') || e.includes('feriado')) ? 'text-rose-700 font-medium' : 'text-slate-600'}>
                Início fora de sexta-feira, sábado e feriados (CLT Art. 134 § 3º)
              </span>
            </div>

            {/* Rule 2: Minimum fraction & 14-day requirement */}
            <div className="flex items-center space-x-2">
              {cltValidation.errors.some(e => e.includes('14 dias') || e.includes('5 (cinco) dias')) ? (
                <X className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className={cltValidation.errors.some(e => e.includes('14 dias') || e.includes('5 (cinco) dias')) ? 'text-rose-700 font-medium' : 'text-slate-600'}>
                Fracionamento CLT: Mínimo de 5 dias e garantia de fração &ge; 14 dias (Art. 134 § 1º)
              </span>
            </div>

            {/* Rule 3: Balance check */}
            <div className="flex items-center space-x-2">
              {cltValidation.errors.some(e => e.includes('Saldo insuficiente')) ? (
                <X className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className={cltValidation.errors.some(e => e.includes('Saldo insuficiente')) ? 'text-rose-700 font-medium' : 'text-slate-600'}>
                Saldo disponível compatível no período aquisitivo
              </span>
            </div>

            {/* Rule 4: Overlap rule */}
            <div className="flex items-center space-x-2">
              {conflictResult.blocked ? (
                <X className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className={conflictResult.blocked ? 'text-rose-700 font-medium' : 'text-slate-600'}>
                Não-sobreposição departamental (tolerância máxima autorizada de até 7 dias)
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações / Justificativa (Opcional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: 1ª fração de férias do ano de 2026..."
              className="w-full bg-white text-xs text-slate-900 rounded-xl p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl text-white transition shadow-md flex items-center space-x-1.5 ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span>{conflictResult.blocked ? 'Solicitação Bloqueada' : 'Enviar Solicitação de Férias'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
