import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Briefcase,
  Mail,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { 
  Employee, 
  Department, 
  AccrualPeriod, 
  UserRole 
} from '../types/index.ts';
import { formatDateBR } from '../lib/clt-rules.ts';

interface EmployeesManagementProps {
  employees: Employee[];
  departments: Department[];
  accrualPeriods: AccrualPeriod[];
  currentUser: Employee;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onAddDepartment: (dep: Omit<Department, 'id'>) => void;
}

export const EmployeesManagement: React.FC<EmployeesManagementProps> = ({
  employees,
  departments,
  accrualPeriods,
  currentUser,
  onAddEmployee,
  onAddDepartment,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(employees[0]?.id || 1);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);

  // Formulário Novo Funcionário
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newHireDate, setNewHireDate] = useState('2024-01-15');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('FUNCIONARIO');
  const [newDeptId, setNewDeptId] = useState<number>(departments[0]?.id || 1);

  // Formulário Novo Departamento
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const depMap = new Map(departments.map(d => [d.id, d]));
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];
  const selectedEmpPeriods = accrualPeriods.filter(p => p.employeeId === selectedEmployee?.id);

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newCpf || !newHireDate || !newJobTitle) return;

    onAddEmployee({
      name: newName,
      email: newEmail,
      cpf: newCpf,
      registrationNumber: `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
      role: newRole,
      departmentId: Number(newDeptId),
      managerId: null,
      hireDate: newHireDate,
      jobTitle: newJobTitle,
      active: true,
    });

    setIsAddEmployeeModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewCpf('');
    setNewJobTitle('');
  };

  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;

    onAddDepartment({
      name: deptName,
      code: deptCode.toUpperCase(),
      description: deptDesc,
      maxConcurrentVacations: 1,
    });

    setIsAddDeptModalOpen(false);
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            Quadro de Colaboradores e Períodos Aquisitivos
          </h2>
          <p className="text-xs text-slate-500">
            Cálculo automático de ciclos aquisitivos (12 meses) e limites concessivos (CLT Art. 134/137).
          </p>
        </div>

        {/* Action Buttons for RH & Admin */}
        {(currentUser.role === 'ADMIN' || currentUser.role === 'RH') && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddDeptModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
            >
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>+ Novo Departamento</span>
            </button>

            <button
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Colaborador</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Employee List on Left, Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Employee List */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Colaboradores Cadastrados ({employees.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Selecione para ver os períodos</span>
          </div>

          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {employees.map(emp => {
              const dep = depMap.get(emp.departmentId);
              const isSelected = emp.id === selectedEmployee?.id;

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`p-3 rounded-xl cursor-pointer transition text-xs border ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{emp.name}</span>
                    <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                      {dep?.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>{emp.jobTitle}</span>
                    <span className="font-mono text-[10px]">{emp.registrationNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Selected Employee Detail & Accrual Periods */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEmployee ? (
            <>
              {/* Profile Header Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-slate-900">{selectedEmployee.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                        {selectedEmployee.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedEmployee.jobTitle} • Departamento: <strong>{depMap.get(selectedEmployee.departmentId)?.name}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Admissão</span>
                      <strong className="text-slate-800">{formatDateBR(selectedEmployee.hireDate)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Matrícula</span>
                      <strong className="text-slate-800 font-mono">{selectedEmployee.registrationNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">CPF</span>
                      <strong className="text-slate-800 font-mono">{selectedEmployee.cpf}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accrual Periods List */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center">
                      <Clock className="w-4 h-4 text-indigo-600 mr-2" />
                      Histórico de Períodos Aquisitivos e Concessivos (CLT)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Direito a 30 dias a cada 12 meses de trabalho (Art. 130) e prazo de gozo de 12 meses (Art. 134).
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedEmpPeriods.map(period => {
                    const isConcessiveOverdue = period.status === 'VENCIDO';
                    const isCompleted = period.daysRemaining === 0;

                    return (
                      <div
                        key={period.id}
                        className={`p-4 rounded-xl border text-xs space-y-3 ${
                          isConcessiveOverdue
                            ? 'bg-rose-50/50 border-rose-200'
                            : (isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/30 border-blue-200')
                        }`}
                      >
                        {/* Period Title & Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {period.periodNumber}º Período Aquisitivo
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              period.status === 'CONCEDIDO'
                                ? 'bg-slate-200 text-slate-700'
                                : (period.status === 'ADQUIRIDO' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                            }`}>
                              {period.status}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-slate-500 mr-1">Saldo restante:</span>
                            <strong className="text-sm font-extrabold text-blue-700">
                              {period.daysRemaining} dias
                            </strong>
                          </div>
                        </div>

                        {/* Dates grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80">
                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              1. Período Aquisitivo (12 meses trabalhados):
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatDateBR(period.acquisitiveStart)} a {formatDateBR(period.acquisitiveEnd)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              2. Período Concessivo (Limite CLT p/ gozar):
                            </span>
                            <span className={`font-semibold ${isConcessiveOverdue ? 'text-rose-600 font-bold' : 'text-indigo-800'}`}>
                              {formatDateBR(period.concessiveStart)} a {formatDateBR(period.concessiveEnd)}
                            </span>
                          </div>
                        </div>

                        {/* Days Progress Bar */}
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span>Gozados: <strong>{period.daysTaken}d</strong></span>
                            <span>Abono (Vendidos): <strong>{period.daysSold}d</strong></span>
                            <span>Restantes: <strong>{period.daysRemaining}d</strong> de {period.totalDaysEntitled}d</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                            <div 
                              className="bg-emerald-500 h-2" 
                              style={{ width: `${(period.daysTaken / period.totalDaysEntitled) * 100}%` }} 
                              title={`Gozados: ${period.daysTaken} dias`}
                            />
                            <div 
                              className="bg-indigo-500 h-2" 
                              style={{ width: `${(period.daysSold / period.totalDaysEntitled) * 100}%` }} 
                              title={`Abono: ${period.daysSold} dias`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
              Selecione um colaborador na lista ao lado.
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Colaborador */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Colaborador</h3>
              <button onClick={() => setIsAddEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Amanda Ribeiro"
                  className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo:</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="amanda@empresa.com.br"
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF:</label>
                  <input
                    type="text"
                    required
                    value={newCpf}
                    onChange={(e) => setNewCpf(e.target.value)}
                    placeholder="123.456.789-00"
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Admissão:</label>
                  <input
                    type="date"
                    required
                    value={newHireDate}
                    onChange={(e) => setNewHireDate(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo:</label>
                  <input
                    type="text"
                    required
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="Ex: Engenheira de Software"
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento:</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(Number(e.target.value))}
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil de Acesso:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                  >
                    <option value="FUNCIONARIO">Funcionário</option>
                    <option value="GESTOR">Gestor</option>
                    <option value="RH">RH</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
                >
                  Salvar e Gerar Períodos CLT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Departamento */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Cadastrar Departamento</h3>
              <button onClick={() => setIsAddDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeptSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Departamento:</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Ex: Jurídico e Compliance"
                  className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sigla / Código:</label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="Ex: JUR"
                  className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição:</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Responsável por contratos e assessoria jurídica..."
                  className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
                >
                  Salvar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
