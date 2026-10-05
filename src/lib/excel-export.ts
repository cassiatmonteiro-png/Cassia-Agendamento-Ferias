import * as XLSX from 'xlsx';
import { VacationRequest, Employee, Department, AccrualPeriod } from '../types/index.ts';
import { formatDateBR } from './clt-rules.ts';

export function exportVacationReportExcel(params: {
  requests: VacationRequest[];
  employees: Employee[];
  departments: Department[];
  accrualPeriods: AccrualPeriod[];
}) {
  const empMap = new Map(params.employees.map(e => [e.id, e]));
  const depMap = new Map(params.departments.map(d => [d.id, d]));
  const periodMap = new Map(params.accrualPeriods.map(p => [p.id, p]));

  // Planilha 1: Agendamentos de Férias
  const rows = params.requests.map((r, i) => {
    const emp = empMap.get(r.employeeId);
    const dep = emp ? depMap.get(emp.departmentId) : undefined;
    const period = periodMap.get(r.accrualPeriodId);
    const confEmp = r.conflictingEmployeeId ? empMap.get(r.conflictingEmployeeId) : undefined;

    let statusPt: string = r.status;
    if (r.status === 'APROVADA_RH') statusPt = 'Aprovada (RH)';
    else if (r.status === 'APROVADA_GESTOR') statusPt = 'Aprovada (Gestor)';
    else if (r.status === 'PENDENTE') statusPt = 'Pendente';
    else if (r.status === 'REJEITADA') statusPt = 'Rejeitada';
    else if (r.status === 'CANCELADA') statusPt = 'Cancelada';

    return {
      '#': i + 1,
      'Colaborador': emp ? emp.name : `ID #${r.employeeId}`,
      'Matrícula': emp ? emp.registrationNumber : '',
      'Cargo': emp ? emp.jobTitle : '',
      'Departamento': dep ? dep.name : '',
      'Início': formatDateBR(r.startDate),
      'Término': formatDateBR(r.endDate),
      'Dias de Descanso': r.durationDays,
      'Abono Pecuniário (Dias)': r.sellDays || 0,
      'Status': statusPt,
      'Sobreposição Departamental': r.hasDepartmentOverlap ? 'SIM' : 'NÃO',
      'Dias de Sobreposição': r.overlapDays || 0,
      'Colega Sobreposto': confEmp ? confEmp.name : '',
      'Regra Limite 7 Dias': r.overlapDays === 0 ? 'Sem conflito' : (r.overlapDays <= 7 ? 'Dentro do Limite (<= 7 dias)' : 'Bloqueado (> 7 dias)'),
      'Período Aquisitivo Início': period ? formatDateBR(period.acquisitiveStart) : '',
      'Período Aquisitivo Fim': period ? formatDateBR(period.acquisitiveEnd) : '',
      'Limite Período Concessivo': period ? formatDateBR(period.concessiveEnd) : '',
      'Observações': r.notes || '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows);

  // Define larguras das colunas
  ws1['!cols'] = [
    { wch: 5 },  // #
    { wch: 28 }, // Colaborador
    { wch: 14 }, // Matrícula
    { wch: 26 }, // Cargo
    { wch: 24 }, // Departamento
    { wch: 12 }, // Início
    { wch: 12 }, // Término
    { wch: 16 }, // Dias de Descanso
    { wch: 22 }, // Abono
    { wch: 18 }, // Status
    { wch: 26 }, // Sobreposição
    { wch: 20 }, // Dias sobrep
    { wch: 24 }, // Colega
    { wch: 30 }, // Limite 7 dias
    { wch: 22 }, // Acq Inicio
    { wch: 22 }, // Acq Fim
    { wch: 24 }, // Limite Conc
    { wch: 30 }, // Obs
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Agendamento de Férias');

  // Planilha 2: Saldo dos Colaboradores (Períodos Aquisitivos e Concessivos)
  const balanceRows = params.accrualPeriods.map((p, i) => {
    const emp = empMap.get(p.employeeId);
    const dep = emp ? depMap.get(emp.departmentId) : undefined;
    return {
      '#': i + 1,
      'Colaborador': emp ? emp.name : `ID #${p.employeeId}`,
      'Departamento': dep ? dep.name : '',
      'Período Nº': p.periodNumber,
      'Início Aquisitivo': formatDateBR(p.acquisitiveStart),
      'Fim Aquisitivo': formatDateBR(p.acquisitiveEnd),
      'Início Concessivo': formatDateBR(p.concessiveStart),
      'Fim Concessivo (Limite CLT)': formatDateBR(p.concessiveEnd),
      'Direito Total': p.totalDaysEntitled,
      'Dias Gozados': p.daysTaken,
      'Dias Vendidos (Abono)': p.daysSold,
      'Saldo Restante': p.daysRemaining,
      'Status Período': p.status,
    };
  });

  const ws2 = XLSX.utils.json_to_sheet(balanceRows);
  ws2['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Saldos e Concessivos CLT');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `relatorio-ferias-${todayStr}.xlsx`);
}
