/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { vacationStore } from './lib/storage.ts';
import { 
  Employee, 
  Department, 
  AccrualPeriod, 
  VacationRequest, 
  DashboardStats 
} from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { VacationCalendar } from './components/VacationCalendar.tsx';
import { VacationHistoryView } from './components/VacationHistoryView.tsx';
import { EmployeesManagement } from './components/EmployeesManagement.tsx';
import { CLTGuidelinesModal } from './components/CLTGuidelinesModal.tsx';
import { SqlViewerModal } from './components/SqlViewerModal.tsx';
import { VacationRequestModal } from './components/VacationRequestModal.tsx';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'vacations' | 'employees' | 'clt' | 'sql'>('dashboard');

  // Dados do Estado
  const [currentUser, setCurrentUser] = useState<Employee>(vacationStore.getCurrentUser());
  const [employees, setEmployees] = useState<Employee[]>(vacationStore.getEmployees());
  const [departments, setDepartments] = useState<Department[]>(vacationStore.getDepartments());
  const [accrualPeriods, setAccrualPeriods] = useState<AccrualPeriod[]>(vacationStore.getAccrualPeriods());
  const [vacations, setVacations] = useState<VacationRequest[]>(vacationStore.getVacationRequests());
  const [stats, setStats] = useState<DashboardStats>(vacationStore.getDashboardStats());

  // Modal de Nova Solicitação
  const [isNewVacationModalOpen, setIsNewVacationModalOpen] = useState(false);
  const [vacationModalInitialDate, setVacationModalInitialDate] = useState<string | undefined>(undefined);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshState = useCallback(() => {
    setCurrentUser(vacationStore.getCurrentUser());
    setEmployees(vacationStore.getEmployees());
    setDepartments(vacationStore.getDepartments());
    setAccrualPeriods(vacationStore.getAccrualPeriods());
    setVacations(vacationStore.getVacationRequests());
    setStats(vacationStore.getDashboardStats());
  }, []);

  const handleSelectUser = (employeeId: number) => {
    vacationStore.setCurrentUserId(employeeId);
    refreshState();
    const selected = vacationStore.getEmployeeById(employeeId);
    if (selected) {
      showToast(`Perfil alternado para ${selected.name} (${selected.role})`);
    }
  };

  const handleOpenNewVacationModal = (initialDate?: string) => {
    setVacationModalInitialDate(initialDate);
    setIsNewVacationModalOpen(true);
  };

  const handleResetData = () => {
    if (window.confirm('Deseja restaurar os dados de teste padrão? Todas as solicitações criadas nesta sessão serão redefinidas para a carga inicial.')) {
      vacationStore.resetToDefaults();
      refreshState();
      showToast('Dados de teste restaurados com sucesso.');
    }
  };

  const handleUpdateStatus = (requestId: number, newStatus: VacationRequest['status'], reason?: string) => {
    const updated = vacationStore.updateRequestStatus(requestId, newStatus, reason);
    if (updated) {
      refreshState();
      showToast(`Solicitação #${requestId} atualizada para ${newStatus}.`);
    }
  };

  const handleAddEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp = vacationStore.addEmployee(empData);
    refreshState();
    showToast(`Colaborador ${newEmp.name} cadastrado com períodos CLT gerados!`);
  };

  const handleAddDepartment = (deptData: Omit<Department, 'id'>) => {
    const newDept = vacationStore.addDepartment(deptData);
    refreshState();
    showToast(`Departamento ${newDept.name} cadastrado com sucesso!`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar with Profile Simulator Switcher */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        allEmployees={employees}
        onSelectUser={handleSelectUser}
        onOpenNewVacationModal={() => handleOpenNewVacationModal()}
        onResetData={handleResetData}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            currentUser={currentUser}
            employees={employees}
            departments={departments}
            vacations={vacations}
            accrualPeriods={accrualPeriods}
            onOpenNewVacationModal={() => handleOpenNewVacationModal()}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'calendar' && (
          <VacationCalendar
            vacations={vacations}
            employees={employees}
            departments={departments}
            onOpenNewVacationModal={handleOpenNewVacationModal}
          />
        )}

        {currentTab === 'vacations' && (
          <VacationHistoryView
            vacations={vacations}
            employees={employees}
            departments={departments}
            accrualPeriods={accrualPeriods}
            currentUser={currentUser}
            onUpdateStatus={handleUpdateStatus}
            onOpenNewVacationModal={() => handleOpenNewVacationModal()}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeesManagement
            employees={employees}
            departments={departments}
            accrualPeriods={accrualPeriods}
            currentUser={currentUser}
            onAddEmployee={handleAddEmployee}
            onAddDepartment={handleAddDepartment}
          />
        )}

        {currentTab === 'clt' && (
          <CLTGuidelinesModal />
        )}

        {currentTab === 'sql' && (
          <SqlViewerModal />
        )}
      </main>

      {/* Modal de Solicitação de Férias */}
      <VacationRequestModal
        isOpen={isNewVacationModalOpen}
        onClose={() => setIsNewVacationModalOpen(false)}
        currentUser={currentUser}
        allEmployees={employees}
        allAccrualPeriods={accrualPeriods}
        allVacationRequests={vacations}
        initialStartDate={vacationModalInitialDate}
        onSuccess={() => {
          refreshState();
          showToast('Solicitação de férias enviada com sucesso para aprovação!');
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>FériasCLT</strong> — Sistema Corporativo de Agendamento em Conformidade com a CLT e Tolerância Departamental de 7 Dias.
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            PostgreSQL DDL & REST APIs integradas
          </span>
        </div>
      </footer>
    </div>
  );
}
