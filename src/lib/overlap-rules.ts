/**
 * Motor de Validação de Sobreposição Departamental e Sugestão de Datas Alternativas
 * Regras:
 * - Não permitir sobreposição para o mesmo funcionário
 * - Departamento: Conflito se dois funcionários do mesmo departamento estiverem de férias
 * - Exceção: Permitir sobreposição de no máximo 7 dias (1 semana)
 * - Bloqueio: Se sobreposição > 7 dias, bloquear solicitação
 * - Sugestão: Calcular datas alternativas viáveis
 */

import { 
  Employee, 
  VacationRequest, 
  ConflictCheckResult, 
  AlternativeDateSuggestion 
} from '../types/index.ts';
import { 
  BRAZILIAN_HOLIDAYS_2026, 
  formatDateBR, 
  formatDateISO,
  isValidCLTStartDate,
  getNextValidCLTStartDate
} from './clt-rules.ts';

/**
 * Calcula a sobreposição em dias corridos entre dois intervalos de datas [startA, endA] e [startB, endB]
 */
export function calculateIntervalOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): { overlapDays: number; overlapStart: Date | null; overlapEnd: Date | null } {
  const overlapStart = new Date(Math.max(startA.getTime(), startB.getTime()));
  const overlapEnd = new Date(Math.min(endA.getTime(), endB.getTime()));

  if (overlapStart <= overlapEnd) {
    const diffTime = overlapEnd.getTime() - overlapStart.getTime();
    const overlapDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return { overlapDays, overlapStart, overlapEnd };
  }

  return { overlapDays: 0, overlapStart: null, overlapEnd: null };
}

/**
 * Verifica conflitos departamentais e de mesmo funcionário
 */
export function checkVacationConflicts(params: {
  employeeId: number;
  startDate: string;
  endDate: string;
  allEmployees: Employee[];
  allVacationRequests: VacationRequest[];
  excludeRequestId?: number; // Para caso de edição
}): ConflictCheckResult {
  const currentEmp = params.allEmployees.find(e => e.id === params.employeeId);
  const start = new Date(params.startDate + 'T00:00:00');
  const end = new Date(params.endDate + 'T00:00:00');

  const result: ConflictCheckResult = {
    hasConflict: false,
    allowedByException: false,
    blocked: false,
    overlapDays: 0,
    cltViolations: [],
    warnings: [],
  };

  if (!currentEmp) {
    result.blocked = true;
    result.blockReason = 'Funcionário não encontrado no sistema.';
    return result;
  }

  // Filtra solicitações ativas/relevantes (exceto rejeitadas e canceladas)
  const activeRequests = params.allVacationRequests.filter(r => 
    r.status !== 'REJEITADA' && 
    r.status !== 'CANCELADA' && 
    r.id !== params.excludeRequestId
  );

  // 1. REGRA 2: Não permitir datas sobrepostas para o MESMO funcionário
  for (const req of activeRequests) {
    if (req.employeeId === currentEmp.id) {
      const rStart = new Date(req.startDate + 'T00:00:00');
      const rEnd = new Date(req.endDate + 'T00:00:00');
      const { overlapDays, overlapStart, overlapEnd } = calculateIntervalOverlap(start, end, rStart, rEnd);

      if (overlapDays > 0) {
        result.hasConflict = true;
        result.blocked = true;
        result.overlapDays = overlapDays;
        result.overlapStartDate = formatDateISO(overlapStart!);
        result.overlapEndDate = formatDateISO(overlapEnd!);
        result.blockReason = `Você já possui férias agendadas (${formatDateBR(req.startDate)} a ${formatDateBR(req.endDate)}) que colidem em ${overlapDays} dia(s) com o período selecionado.`;
        return result;
      }
    }
  }

  // 2. REGRA 3, 4 e 5: Sobreposição departamental
  // Buscar colegas do MESMO departamento
  const departmentColleagues = params.allEmployees.filter(
    e => e.departmentId === currentEmp.departmentId && e.id !== currentEmp.id && e.active
  );
  const departmentColleagueIds = new Set(departmentColleagues.map(e => e.id));

  let maxFoundOverlap = 0;
  let worstColleague: Employee | undefined;
  let worstVacation: VacationRequest | undefined;
  let worstOverlapPeriod: { start: Date; end: Date } | null = null;

  for (const req of activeRequests) {
    if (departmentColleagueIds.has(req.employeeId)) {
      const rStart = new Date(req.startDate + 'T00:00:00');
      const rEnd = new Date(req.endDate + 'T00:00:00');
      const { overlapDays, overlapStart, overlapEnd } = calculateIntervalOverlap(start, end, rStart, rEnd);

      if (overlapDays > 0 && overlapDays > maxFoundOverlap) {
        maxFoundOverlap = overlapDays;
        worstColleague = departmentColleagues.find(e => e.id === req.employeeId);
        worstVacation = req;
        worstOverlapPeriod = { start: overlapStart!, end: overlapEnd! };
      }
    }
  }

  if (maxFoundOverlap > 0 && worstColleague && worstVacation) {
    result.hasConflict = true;
    result.overlapDays = maxFoundOverlap;
    result.conflictingEmployee = worstColleague;
    result.conflictingVacation = worstVacation;
    result.overlapStartDate = formatDateISO(worstOverlapPeriod!.start);
    result.overlapEndDate = formatDateISO(worstOverlapPeriod!.end);

    if (maxFoundOverlap <= 7) {
      // Regra 4: Exceção permitida (máximo 7 dias de sobreposição no departamento)
      result.allowedByException = true;
      result.blocked = false;
      result.warnings.push(
        `Atenção: Há sobreposição de ${maxFoundOverlap} dia(s) (${formatDateBR(result.overlapStartDate)} a ${formatDateBR(result.overlapEndDate)}) com o colega ${worstColleague.name}. A solicitação é permitida pela política interna que autoriza sobreposição máxima de até 7 dias (1 semana).`
      );
    } else {
      // Regra 5: Bloquear caso ultrapasse 7 dias
      result.blocked = true;
      result.allowedByException = false;
      result.blockReason = `Bloqueado por política departamental: Há sobreposição de ${maxFoundOverlap} dias com as férias de ${worstColleague.name} (${formatDateBR(worstVacation.startDate)} a ${formatDateBR(worstVacation.endDate)}). O limite máximo de tolerância para o mesmo departamento é de 7 dias corridos.`;
    }
  }

  return result;
}

/**
 * Sugere datas alternativas viáveis respeitando duração e CLT
 */
export function suggestAlternativeDates(params: {
  employeeId: number;
  originalStartDate: string;
  durationDays: number;
  allEmployees: Employee[];
  allVacationRequests: VacationRequest[];
  conflictingVacation?: VacationRequest;
}): AlternativeDateSuggestion[] {
  const suggestions: AlternativeDateSuggestion[] = [];
  const currentEmp = params.allEmployees.find(e => e.id === params.employeeId);
  if (!currentEmp) return suggestions;

  // Sugestão 1: Imediatamente após o colega conflitante terminar as férias
  if (params.conflictingVacation) {
    const conflictEnd = new Date(params.conflictingVacation.endDate + 'T00:00:00');
    // Colega termina, tentamos no dia seguinte ou com 7 dias de antecedência
    const dayAfter = new Date(conflictEnd);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const validStartAfter = getNextValidCLTStartDate(dayAfter);

    const validEndAfter = new Date(validStartAfter);
    validEndAfter.setDate(validEndAfter.getDate() + params.durationDays - 1);

    const testConflictAfter = checkVacationConflicts({
      employeeId: params.employeeId,
      startDate: formatDateISO(validStartAfter),
      endDate: formatDateISO(validEndAfter),
      allEmployees: params.allEmployees,
      allVacationRequests: params.allVacationRequests,
    });

    if (!testConflictAfter.blocked) {
      suggestions.push({
        startDate: formatDateISO(validStartAfter),
        endDate: formatDateISO(validEndAfter),
        durationDays: params.durationDays,
        explanation: `Início logo após o retorno do colega, garantindo que o departamento não fique desassistido.`,
        badge: 'Após Colega'
      });
    }

    // Sugestão 2: Antes do colega, aproveitando a janela permitida de 7 dias de sobreposição
    const conflictStart = new Date(params.conflictingVacation.startDate + 'T00:00:00');
    // Para sobrepor no máximo 7 dias:
    // término = conflictStart + 6 dias
    // início = término - durationDays + 1
    const targetEnd = new Date(conflictStart);
    targetEnd.setDate(targetEnd.getDate() + 6); // exatos 7 dias de interseção

    const targetStart = new Date(targetEnd);
    targetStart.setDate(targetStart.getDate() - params.durationDays + 1);

    // Ajusta para início válido
    const validStartBefore = getNextValidCLTStartDate(targetStart);
    const validEndBefore = new Date(validStartBefore);
    validEndBefore.setDate(validEndBefore.getDate() + params.durationDays - 1);

    const today = new Date();
    if (validStartBefore > today) {
      const testConflictBefore = checkVacationConflicts({
        employeeId: params.employeeId,
        startDate: formatDateISO(validStartBefore),
        endDate: formatDateISO(validEndBefore),
        allEmployees: params.allEmployees,
        allVacationRequests: params.allVacationRequests,
      });

      if (!testConflictBefore.blocked && suggestions.every(s => s.startDate !== formatDateISO(validStartBefore))) {
        suggestions.push({
          startDate: formatDateISO(validStartBefore),
          endDate: formatDateISO(validEndBefore),
          durationDays: params.durationDays,
          explanation: `Inicia antes do colega, com sobreposição controlada de no máximo 7 dias permitida por política.`,
          badge: 'Antes do Colega'
        });
      }
    }
  }

  // Sugestão 3: Janela totalmente livre no mês seguinte
  const origStart = new Date(params.originalStartDate + 'T00:00:00');
  const nextMonthStart = new Date(origStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
  nextMonthStart.setDate(1);

  let searchDate = getNextValidCLTStartDate(nextMonthStart);
  for (let attempt = 0; attempt < 20; attempt++) {
    const testEnd = new Date(searchDate);
    testEnd.setDate(testEnd.getDate() + params.durationDays - 1);

    const testRes = checkVacationConflicts({
      employeeId: params.employeeId,
      startDate: formatDateISO(searchDate),
      endDate: formatDateISO(testEnd),
      allEmployees: params.allEmployees,
      allVacationRequests: params.allVacationRequests,
    });

    if (!testRes.blocked && suggestions.every(s => s.startDate !== formatDateISO(searchDate))) {
      suggestions.push({
        startDate: formatDateISO(searchDate),
        endDate: formatDateISO(testEnd),
        durationDays: params.durationDays,
        explanation: `Período totalmente livre sem concorrência no departamento no mês seguinte.`,
        badge: 'Recomendada'
      });
      break;
    }

    searchDate.setDate(searchDate.getDate() + 7);
    searchDate = getNextValidCLTStartDate(searchDate);
  }

  return suggestions.slice(0, 3);
}
