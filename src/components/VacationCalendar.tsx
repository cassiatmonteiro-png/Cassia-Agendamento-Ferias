import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  AlertCircle, 
  Info,
  Calendar as CalendarIcon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { 
  VacationRequest, 
  Employee, 
  Department 
} from '../types/index.ts';
import { BRAZILIAN_HOLIDAYS_2026, formatDateBR, formatDateISO } from '../lib/clt-rules.ts';

interface VacationCalendarProps {
  vacations: VacationRequest[];
  employees: Employee[];
  departments: Department[];
  onOpenNewVacationModal: (initialDate?: string) => void;
}

export const VacationCalendar: React.FC<VacationCalendarProps> = ({
  vacations,
  employees,
  departments,
  onOpenNewVacationModal,
}) => {
  // Estado de navegação do calendário (Inicia em Outubro de 2026 para visualizar os dados de teste)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 10, 1)); // Novembro 2026
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    vacations: VacationRequest[];
    holiday?: { date: string; name: string };
    isForbiddenStart: boolean;
    forbiddenReason?: string;
  } | null>(null);

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(departments.map(d => [d.id, d]));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date(2026, 10, 1)); // Retorna a Novembro 2026
  };

  // Cálculo das células do mês
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Dom, 1=Seg...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Filtra as férias
  const filteredVacations = vacations.filter(v => {
    if (v.status === 'REJEITADA' || v.status === 'CANCELADA') return false;
    if (selectedStatus !== 'ALL' && v.status !== selectedStatus) return false;
    if (selectedDepartmentId !== 'ALL') {
      const emp = empMap.get(v.employeeId);
      if (!emp || emp.departmentId !== selectedDepartmentId) return false;
    }
    return true;
  });

  // Função para verificar se um dia tem férias
  const getVacationsForDay = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredVacations.filter(v => {
      return dStr >= v.startDate && dStr <= v.endDate;
    });
  };

  // Feriado no dia
  const getHolidayForDay = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return BRAZILIAN_HOLIDAYS_2026.find(h => h.date === dStr);
  };

  // Verifica se o dia é vedado para INÍCIO de férias conforme CLT Art. 134 § 3º
  const checkForbiddenStart = (day: number) => {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5) return { forbidden: true, reason: 'Sexta-feira (2 dias antes do DSR domingo)' };
    if (dayOfWeek === 6) return { forbidden: true, reason: 'Sábado (véspera de DSR domingo)' };

    const dStr = formatDateISO(d);
    for (const h of BRAZILIAN_HOLIDAYS_2026) {
      const hDate = new Date(h.date + 'T00:00:00');
      const diff = Math.round((hDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return { forbidden: true, reason: `Feriado Nacional: ${h.name}` };
      if (diff === 1 || diff === 2) return { forbidden: true, reason: `${diff === 1 ? 'Véspera' : 'Antevéspera'} do feriado ${h.name}` };
    }

    return { forbidden: false };
  };

  const handleCellClick = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayVacations = getVacationsForDay(day);
    const holiday = getHolidayForDay(day);
    const forbidden = checkForbiddenStart(day);

    setSelectedDayEvents({
      dateStr: dStr,
      vacations: dayVacations,
      holiday,
      isForbiddenStart: forbidden.forbidden,
      forbiddenReason: forbidden.reason,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Month Selector Controls */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={handleCurrentMonth}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-lg transition"
              >
                Nov/2026 (Demo)
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Visualização de escalas e sobreposições departamentais
            </p>
          </div>
        </div>

        {/* Month navigation buttons and filters */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-200 text-slate-600 transition"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-xs font-semibold text-slate-700">
              {monthNames[month].slice(0, 3)}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-200 text-slate-600 transition"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">Todos os Departamentos</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="APROVADA_RH">Aprovadas (RH)</option>
              <option value="APROVADA_GESTOR">Aprovadas (Gestor)</option>
              <option value="PENDENTE">Em Análise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend & CLT Reminder */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
            <span>Aprovada RH</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>
            <span>Aprovada Gestor</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 inline-block"></span>
            <span>Em Análise</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 inline-block"></span>
            <span className="font-semibold text-amber-800">Sobreposição Departamental (&le; 7 dias)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Feriado Nacional</span>
          </div>
        </div>
        <div className="text-slate-500 flex items-center">
          <Info className="w-3.5 h-3.5 text-blue-500 mr-1" />
          <span>Sexta e sábado são vedados para início de férias (CLT Art. 134 § 3º)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center py-2.5 text-xs font-bold text-slate-700">
          <div className="text-rose-600">DOM</div>
          <div>SEG</div>
          <div>TER</div>
          <div>QUA</div>
          <div>QUI</div>
          <div className="text-amber-700">SEX (Vedado Início)</div>
          <div className="text-amber-700">SÁB (Vedado Início)</div>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[560px]">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-slate-50/50 p-2 min-h-[95px]" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayVacations = getVacationsForDay(day);
            const holiday = getHolidayForDay(day);
            const forbidden = checkForbiddenStart(day);
            const isWeekend = (firstDayOfMonth + index) % 7 === 0 || (firstDayOfMonth + index) % 7 === 6;

            // Checa se há múltiplos funcionários do MESMO departamento de férias neste dia
            const depCounts = new Map<number, number>();
            dayVacations.forEach(v => {
              const emp = empMap.get(v.employeeId);
              if (emp) {
                depCounts.set(emp.departmentId, (depCounts.get(emp.departmentId) || 0) + 1);
              }
            });
            const hasDepartmentOverlap = Array.from(depCounts.values()).some(count => count > 1);

            return (
              <div
                key={`day-${day}`}
                onClick={() => handleCellClick(day)}
                className={`p-1.5 sm:p-2 min-h-[95px] flex flex-col justify-between transition cursor-pointer hover:bg-blue-50/40 relative ${
                  isWeekend ? 'bg-slate-50/60' : 'bg-white'
                } ${hasDepartmentOverlap ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/30' : ''}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                    holiday ? 'bg-rose-500 text-white' : (isWeekend ? 'text-slate-400' : 'text-slate-700')
                  }`}>
                    {day}
                  </span>

                  {/* Overlap badge */}
                  {hasDepartmentOverlap && (
                    <span 
                      title="Sobreposição departamental neste dia (exceção autorizada até 7 dias)"
                      className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold px-1 py-0.2 rounded"
                    >
                      Sobrep. Dep.
                    </span>
                  )}

                  {/* Forbidden Start Badge for Friday/Saturday/Holiday */}
                  {forbidden.forbidden && (
                    <span 
                      title={`Vedado iniciar férias: ${forbidden.reason}`}
                      className="text-[9px] text-amber-700/80 font-medium hidden sm:inline"
                    >
                      {forbidden.reason?.includes('Sexta') ? 'Sex' : (forbidden.reason?.includes('Sábado') ? 'Sáb' : 'Feriado')}
                    </span>
                  )}
                </div>

                {/* Holiday label */}
                {holiday && (
                  <div className="text-[10px] text-rose-600 font-semibold truncate my-0.5" title={holiday.name}>
                    ★ {holiday.name}
                  </div>
                )}

                {/* Vacation entries list */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {dayVacations.slice(0, 3).map(v => {
                    const emp = empMap.get(v.employeeId);
                    const dep = emp ? depMap.get(emp.departmentId) : undefined;

                    let bgClass = 'bg-blue-100 text-blue-800 border-blue-200';
                    if (v.status === 'APROVADA_RH') {
                      bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    } else if (v.status === 'PENDENTE') {
                      bgClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    }

                    return (
                      <div
                        key={v.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium truncate flex items-center justify-between ${bgClass}`}
                        title={`${emp?.name} (${dep?.code}): ${formatDateBR(v.startDate)} a ${formatDateBR(v.endDate)} - ${v.status}`}
                      >
                        <span className="truncate">{emp?.name.split(' ')[0]}</span>
                        <span className="text-[8px] font-bold opacity-75 ml-1">{dep?.code}</span>
                      </div>
                    );
                  })}
                  {dayVacations.length > 3 && (
                    <div className="text-[9px] text-slate-500 font-semibold text-center">
                      +{dayVacations.length - 3} mais
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-400 opacity-0 hover:opacity-100 transition">
                    + agendar
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Modal / Drawer */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Dia {formatDateBR(selectedDayEvents.dateStr)}
                </h3>
                <p className="text-xs text-slate-500">Detalhes da escala e conformidade CLT</p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Holiday or Forbidden Start Info */}
            {selectedDayEvents.holiday && (
              <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 text-xs flex items-center">
                <AlertCircle className="w-4 h-4 text-rose-600 mr-2 shrink-0" />
                <div>
                  <strong>Feriado Nacional:</strong> {selectedDayEvents.holiday.name}
                  <div className="text-[11px] text-rose-700">Vedado o início de férias neste dia (CLT Art. 134 § 3º).</div>
                </div>
              </div>
            )}

            {selectedDayEvents.isForbiddenStart && !selectedDayEvents.holiday && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-xs flex items-center">
                <Info className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
                <div>
                  <strong>Regra de Início CLT (Art. 134 § 3º):</strong>
                  <div className="text-[11px] text-amber-900">{selectedDayEvents.forbiddenReason}</div>
                </div>
              </div>
            )}

            {/* Vacations on this day */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Colaboradores de Férias neste dia ({selectedDayEvents.vacations.length})
              </h4>
              {selectedDayEvents.vacations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum colaborador com férias agendadas nesta data.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedDayEvents.vacations.map(v => {
                    const emp = empMap.get(v.employeeId);
                    const dep = emp ? depMap.get(emp.departmentId) : undefined;
                    const confEmp = v.conflictingEmployeeId ? empMap.get(v.conflictingEmployeeId) : undefined;

                    return (
                      <div key={v.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{emp?.name}</span>
                          <span className="text-blue-600 font-semibold">{dep?.name}</span>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Período: {formatDateBR(v.startDate)} a {formatDateBR(v.endDate)} ({v.durationDays} dias)
                        </div>
                        {v.hasDepartmentOverlap && (
                          <div className="text-amber-800 text-[10px] bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                            Sobreposição departamental de {v.overlapDays}d com {confEmp?.name} (permitida dentro de 7d).
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500">
                          Status: <strong>{v.status}</strong> {v.sellDays > 0 && `| Abono: ${v.sellDays} dias`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setSelectedDayEvents(null);
                  onOpenNewVacationModal(selectedDayEvents.dateStr);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-md shadow-blue-500/20"
              >
                Solicitar Férias a partir desta data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
