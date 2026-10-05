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
import { VacationRequestModal } from './components/VacationRequestModal.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { getSupabaseConfig, testSupabaseConnection } from './lib/supabase.ts';
import { CheckCircle2, Database, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'vacations' | 'employees' | 'clt'>('dashboard');

  // Supabase State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

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
    }, 4500);
  };

  const refreshState = useCallback(() => {
    setCurrentUser(vacationStore.getCurrentUser());
    setEmployees(vacationStore.getEmployees());
    setDepartments(vacationStore.getDepartments());
    setAccrualPeriods(vacationStore.getAccrualPeriods());
    setVacations(vacationStore.getVacationRequests());
    setStats(vacationStore.getDashboardStats());
  }, []);

  // Tenta sincronizar automaticamente no carregamento se o Supabase estiver configurado
  useEffect(() => {
    const initSupabase = async () => {
      const cfg = getSupabaseConfig();
      setSupabaseConfig(cfg);
      if (cfg.isConfigured) {
        const testRes = await testSupabaseConnection();
        if (testRes.success) {
          const syncRes = await vacationStore.syncWithSupabase();
          if (syncRes.success) {
            // Se o banco remoto ainda estiver vazio, envia a carga inicial
            if (vacationStore.getDepartments().length === 0) {
              await vacationStore.pushAllToSupabase();
            }
            refreshState();
          }
        }
      }
    };
    initSupabase();
  }, [refreshState]);

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
      showToast(`Solicitação #${requestId} atualizada para ${newStatus}${supabaseConfig.isConfigured ? ' e salva no Supabase' : ''}.`);
    }
  };

  const handleAddEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp = vacationStore.addEmployee(empData);
    refreshState();
    showToast(`Colaborador ${newEmp.name} cadastrado com sucesso${supabaseConfig.isConfigured ? ' e sincronizado com o Supabase' : ''}!`);
  };

  const handleAddDepartment = (deptData: Omit<Department, 'id'>) => {
    const newDept = vacationStore.addDepartment(deptData);
    refreshState();
    showToast(`Departamento ${newDept.name} cadastrado com sucesso${supabaseConfig.isConfigured ? ' e sincronizado com o Supabase' : ''}!`);
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
        {/* Banner informativo quando o Supabase ainda não está conectado */}
        {!supabaseConfig.isConfigured && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start space-x-3 text-amber-950">
              <div className="w-9 h-9 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Seus dados ainda não estão indo para o Supabase
                </h4>
                <p className="text-[11px] text-amber-800/90 mt-0.5 max-w-2xl leading-relaxed">
                  O sistema está em modo local. Para que colaboradores, férias e aprovações sejam salvos permanentemente no seu banco PostgreSQL no Supabase, conecte informando a <strong>Project URL</strong> e <strong>Anon Key</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0 flex items-center space-x-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Conectar ao Supabase Agora</span>
            </button>
          </div>
        )}

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
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-left">
            <span>
              <strong>FériasCLT</strong> — Sistema Corporativo de Agendamento em Conformidade com a CLT e Tolerância Departamental de 7 Dias.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {supabaseConfig.isConfigured ? (
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-semibold transition cursor-pointer"
                title="Supabase Conectado! Clique para sincronizar ou gerenciar dados"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Supabase Conectado</span>
                <span className="text-emerald-600 underline font-normal ml-0.5">Sincronizar</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-semibold transition cursor-pointer"
                title="Clique para configurar o Supabase e salvar seus dados"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Supabase Desconectado — Conectar</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modal de Conexão com Supabase */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSyncComplete={() => {
          setSupabaseConfig(getSupabaseConfig());
          refreshState();
          showToast('Sincronização com o Supabase realizada com sucesso!');
        }}
      />
    </div>
  );
}
