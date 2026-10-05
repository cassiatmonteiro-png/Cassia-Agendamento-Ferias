import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VacationRequest, Employee, Department } from '../types/index.ts';
import { formatDateBR } from './clt-rules.ts';

export function exportVacationReportPDF(params: {
  title: string;
  requests: VacationRequest[];
  employees: Employee[];
  departments: Department[];
  filterDescription?: string;
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Header Corporativo
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FÉRIASCLT - RELATÓRIO EXECUTIVO DE PROGRAMAÇÃO DE FÉRIAS', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 235, 15);

  // Subheader & Filtros
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(params.title, 14, 32);

  if (params.filterDescription) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Parâmetros: ${params.filterDescription}`, 14, 37);
  }

  // Prepara dados da tabela
  const empMap = new Map(params.employees.map(e => [e.id, e]));
  const depMap = new Map(params.departments.map(d => [d.id, d]));

  const tableData = params.requests.map((r, index) => {
    const emp = empMap.get(r.employeeId);
    const dep = emp ? depMap.get(emp.departmentId) : undefined;
    const confEmp = r.conflictingEmployeeId ? empMap.get(r.conflictingEmployeeId) : undefined;

    let statusLabel: string = r.status;
    if (r.status === 'APROVADA_RH') statusLabel = 'Aprovada (RH)';
    else if (r.status === 'APROVADA_GESTOR') statusLabel = 'Aprovada (Gestor)';
    else if (r.status === 'PENDENTE') statusLabel = 'Em Análise';
    else if (r.status === 'REJEITADA') statusLabel = 'Recusada';
    else if (r.status === 'CANCELADA') statusLabel = 'Cancelada';

    let overlapInfo = 'Sem sobreposição';
    if (r.hasDepartmentOverlap) {
      overlapInfo = `Sobrep. ${r.overlapDays}d com ${confEmp ? confEmp.name : 'Colega'} (${r.overlapDays <= 7 ? 'Exceção OK' : 'Alerta'})`;
    }

    return [
      String(index + 1),
      emp ? emp.name : `ID #${r.employeeId}`,
      emp ? emp.registrationNumber : '-',
      dep ? dep.code : '-',
      formatDateBR(r.startDate),
      formatDateBR(r.endDate),
      `${r.durationDays} dias`,
      r.sellDays > 0 ? `${r.sellDays} dias` : 'Não',
      statusLabel,
      overlapInfo,
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [[
      '#',
      'Colaborador',
      'Matrícula',
      'Dep.',
      'Início',
      'Término',
      'Duração',
      'Abono CLT',
      'Status',
      'Regra Sobreposição (Máx 7d)',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 42 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 28 },
      9: { cellWidth: 70 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Sistema FériasCLT - Em conformidade com o Decreto-Lei nº 5.452/1943 (CLT) e Políticas Internas de Não-Sobreposição.',
        14,
        200
      );
      doc.text(`Página ${data.pageNumber}`, 275, 200);
    }
  });

  doc.save(`relatorio-ferias-${formatDateBR(new Date().toISOString().split('T')[0]).replace(/\//g, '-')}.pdf`);
}
