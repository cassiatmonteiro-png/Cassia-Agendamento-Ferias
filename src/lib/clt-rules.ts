/**
 * Motor de Validação e Regras da Legislação Trabalhista (CLT)
 * Artigos 130, 134, 135, 137 e 143 da CLT
 */

import { AccrualPeriod, VacationRequest } from '../types/index.ts';

// Feriados Nacionais Brasileiros Padrão
export const BRAZILIAN_HOLIDAYS_2026: { date: string; name: string }[] = [
  { date: '2026-01-01', name: 'Confraternização Universal' },
  { date: '2026-02-17', name: 'Carnaval' },
  { date: '2026-04-03', name: 'Sexta-feira Santa' },
  { date: '2026-04-21', name: 'Tiradentes' },
  { date: '2026-05-01', name: 'Dia do Trabalho' },
  { date: '2026-06-04', name: 'Corpus Christi' },
  { date: '2026-09-07', name: 'Independência do Brasil' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2026-11-02', name: 'Finados' },
  { date: '2026-11-15', name: 'Proclamação da República' },
  { date: '2026-11-20', name: 'Dia da Consciência Negra' },
  { date: '2026-12-25', name: 'Natal' },
];

export interface CLTValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Calcula períodos aquisitivos e concessivos a partir da data de admissão
 */
export function calculateAccrualPeriods(hireDateStr: string, employeeId: number): AccrualPeriod[] {
  const periods: AccrualPeriod[] = [];
  const hireDate = new Date(hireDateStr + 'T00:00:00');
  const today = new Date();
  
  let periodNum = 1;
  let currAcqStart = new Date(hireDate);

  // Gera períodos até o atual + 1 futuro
  while (currAcqStart <= today || periodNum === 1) {
    const acqStart = new Date(currAcqStart);
    
    // Período Aquisitivo: 12 meses
    const acqEnd = new Date(currAcqStart);
    acqEnd.setFullYear(acqEnd.getFullYear() + 1);
    acqEnd.setDate(acqEnd.getDate() - 1);
    
    // Período Concessivo: 12 meses após término do aquisitivo
    const concStart = new Date(acqEnd);
    concStart.setDate(concStart.getDate() + 1);
    
    const concEnd = new Date(concStart);
    concEnd.setFullYear(concEnd.getFullYear() + 1);
    concEnd.setDate(concEnd.getDate() - 1);

    const isCurrentAcq = today < acqEnd;
    const isConcessiveActive = today >= concStart && today <= concEnd;
    const isOverdue = today > concEnd;

    periods.push({
      id: periodNum,
      employeeId,
      periodNumber: periodNum,
      acquisitiveStart: formatDateISO(acqStart),
      acquisitiveEnd: formatDateISO(acqEnd),
      concessiveStart: formatDateISO(concStart),
      concessiveEnd: formatDateISO(concEnd),
      totalDaysEntitled: 30,
      daysTaken: 0,
      daysSold: 0,
      daysRemaining: 30,
      status: isOverdue ? 'VENCIDO' : (isConcessiveActive ? 'ADQUIRIDO' : (isCurrentAcq ? 'EM_ANDAMENTO' : 'CONCEDIDO'))
    });

    currAcqStart.setFullYear(currAcqStart.getFullYear() + 1);
    periodNum++;
    
    if (periodNum > 5) break; // limite razoável de segurança
  }

  return periods;
}

/**
 * Valida todas as regras da CLT para uma solicitação de férias
 */
export function validateCLTRules(params: {
  startDate: string;
  endDate: string;
  durationDays: number;
  sellDays: number; // Abono pecuniário (máx 10 dias)
  accrualPeriod: AccrualPeriod;
  existingRequestsForPeriod: VacationRequest[];
  currentDate?: Date;
}): CLTValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = params.currentDate || new Date();

  const start = new Date(params.startDate + 'T00:00:00');
  const end = new Date(params.endDate + 'T00:00:00');

  // 1. Validação básica de datas
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    errors.push('Datas informadas são inválidas.');
    return { isValid: false, errors, warnings };
  }

  if (end < start) {
    errors.push('A data final não pode ser anterior à data de início.');
    return { isValid: false, errors, warnings };
  }

  const calculatedDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (calculatedDays !== params.durationDays) {
    // ajusta ou alerta
  }

  // 2. Art. 134 § 3º CLT: Proibição de início 2 dias antes de DSR (domingo) ou Feriado
  // Dia da semana do início: 0=Domingo, 1=Segunda, ..., 5=Sexta, 6=Sábado
  const dayOfWeek = start.getDay();

  if (dayOfWeek === 5) {
    errors.push('CLT Art. 134 § 3º: É vedado o início das férias na sexta-feira (dois dias que antecedem o Repouso Semanal Remunerado - DSR).');
  } else if (dayOfWeek === 6) {
    errors.push('CLT Art. 134 § 3º: É vedado o início das férias no sábado (dia que antecede o DSR).');
  }

  // Checagem de 2 dias antes de feriados nacionais
  for (const holiday of BRAZILIAN_HOLIDAYS_2026) {
    const holDate = new Date(holiday.date + 'T00:00:00');
    const diffTime = holDate.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      errors.push(`CLT Art. 134 § 3º: As férias não podem iniciar em dia de feriado nacional (${holiday.name} em ${formatDateBR(holiday.date)}).`);
    } else if (diffDays === 1 || diffDays === 2) {
      errors.push(`CLT Art. 134 § 3º: É vedado o início das férias ${diffDays === 1 ? 'um dia' : 'dois dias'} antes de feriado (${holiday.name} em ${formatDateBR(holiday.date)}).`);
    }
  }

  // 3. Art. 143 CLT: Abono pecuniário (máximo 1/3 = 10 dias)
  if (params.sellDays < 0) {
    errors.push('O número de dias de abono pecuniário não pode ser negativo.');
  } else if (params.sellDays > 10) {
    errors.push('CLT Art. 143: O abono pecuniário é limitado a 1/3 do período (máximo de 10 dias).');
  }

  // 4. Saldo disponível no Período Aquisitivo
  const totalDaysUsed = params.accrualPeriod.daysTaken + params.accrualPeriod.daysSold;
  const availableDays = params.accrualPeriod.totalDaysEntitled - totalDaysUsed;
  const requestedTotal = params.durationDays + params.sellDays;

  if (requestedTotal > availableDays) {
    errors.push(`Saldo insuficiente: Você possui ${availableDays} dias restantes neste período, mas solicitou ${requestedTotal} dias (${params.durationDays} de descanso + ${params.sellDays} de abono).`);
  }

  // 5. Art. 134 § 1º CLT: Fracionamento em até 3 períodos
  // Regra A: Um dos períodos não pode ser inferior a 14 dias
  // Regra B: Os demais não podem ser inferiores a 5 dias
  const existingActive = params.existingRequestsForPeriod.filter(r => r.status !== 'REJEITADA' && r.status !== 'CANCELADA');
  const currentFractionNumber = existingActive.length + 1;

  if (currentFractionNumber > 3) {
    errors.push('CLT Art. 134 § 1º: As férias podem ser fracionadas em no máximo 3 (três) períodos. Limite já atingido.');
  }

  // Menor fração permitida é 5 dias
  if (params.durationDays < 5) {
    errors.push('CLT Art. 134 § 1º: Nenhuma fração de férias pode ser inferior a 5 (cinco) dias corridos.');
  }

  // Verificação de período maior ou igual a 14 dias
  const has14DayPeriodAlready = existingActive.some(r => r.durationDays >= 14);
  const isThis14DaysOrMore = params.durationDays >= 14;
  const remainingDaysAfterThis = availableDays - requestedTotal;

  if (!has14DayPeriodAlready && !isThis14DaysOrMore) {
    // Se esta não tem 14 dias, o saldo restante DEVE ser capaz de abrigar um período de 14 dias
    if (remainingDaysAfterThis < 14) {
      errors.push(`CLT Art. 134 § 1º: Pelo menos um período deve ter no mínimo 14 dias. Com esta solicitação de ${params.durationDays} dias, restarão apenas ${remainingDaysAfterThis} dias, impossibilitando cumprir a regra obrigatória de 14 dias.`);
    } else {
      warnings.push(`Aviso CLT: Você ainda não agendou o período obrigatório de pelo menos 14 dias. O saldo restante (${remainingDaysAfterThis} dias) deverá conter ao menos uma fração de 14 dias ou mais.`);
    }
  }

  // 6. Art. 134: Período Concessivo (Gozar antes do término para não dobrar CLT 137)
  const concEnd = new Date(params.accrualPeriod.concessiveEnd + 'T00:00:00');
  if (end > concEnd) {
    warnings.push(`Risco de Pagamento em Dobro (CLT Art. 137): As férias terminam após o final do período concessivo (${formatDateBR(params.accrualPeriod.concessiveEnd)}).`);
  }

  // 7. Art. 135 CLT: Aviso prévio de 30 dias
  const daysInAdvance = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysInAdvance < 0) {
    errors.push('A data de início das férias não pode ser no passado.');
  } else if (daysInAdvance < 30) {
    warnings.push(`Aviso Prévio CLT Art. 135: A solicitação tem ${daysInAdvance} dias de antecedência (a CLT recomenda aviso prévio com no mínimo 30 dias). Requer validação especial do RH.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function isValidCLTStartDate(date: Date): boolean {
  const day = date.getDay();
  // 5 = Sexta, 6 = Sábado
  if (day === 5 || day === 6) return false;

  const dateStr = formatDateISO(date);
  for (const holiday of BRAZILIAN_HOLIDAYS_2026) {
    const hDate = new Date(holiday.date + 'T00:00:00');
    const diff = Math.round((hDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 2) {
      return false; // Feriado, véspera ou antevéspera
    }
  }

  return true;
}

export function getNextValidCLTStartDate(fromDate: Date): Date {
  const curr = new Date(fromDate);
  while (!isValidCLTStartDate(curr)) {
    curr.setDate(curr.getDate() + 1);
  }
  return curr;
}

export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
