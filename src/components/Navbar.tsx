import React from 'react';
import { 
  CalendarDays, 
  Users, 
  BarChart3, 
  FileText, 
  BookOpen, 
  Database, 
  Plus, 
  RotateCcw,
  Shield,
  Briefcase
} from 'lucide-react';
import { Employee, UserRole } from '../types/index.ts';

interface NavbarProps {
  currentTab: 'dashboard' | 'calendar' | 'vacations' | 'employees' | 'clt';
  setCurrentTab: (tab: 'dashboard' | 'calendar' | 'vacations' | 'employees' | 'clt') => void;
  currentUser: Employee;
  allEmployees: Employee[];
  onSelectUser: (employeeId: number) => void;
  onOpenNewVacationModal: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  allEmployees,
  onSelectUser,
  onOpenNewVacationModal,
  onResetData,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-purple-200">Administrador</span>;
      case 'RH':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">Recursos Humanos</span>;
      case 'GESTOR':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">Gestor</span>;
      case 'FUNCIONARIO':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">Funcionário</span>;
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      {/* Top Banner: App Brand & User Simulator Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo and System Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Férias<span className="text-blue-400">CLT</span></span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded">
                CLT Art. 130-145
              </span>
            </div>
            <p className="text-xs text-slate-400">Gestão Corporativa & Regras de Sobreposição</p>
          </div>
        </div>

        {/* User Role Switcher & Primary Action */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Quick Simulation Profile Switcher */}
          <div className="flex items-center bg-slate-800/90 rounded-xl px-3 py-1.5 border border-slate-700">
            <Shield className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <div className="text-xs mr-2 text-slate-300 hidden sm:inline">Perfil Ativo:</div>
            <select
              value={currentUser.id}
              onChange={(e) => onSelectUser(Number(e.target.value))}
              className="bg-slate-900 text-xs text-white rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <optgroup label="Administrador">
                {allEmployees.filter(e => e.role === 'ADMIN').map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.jobTitle})</option>
                ))}
              </optgroup>
              <optgroup label="Recursos Humanos (RH)">
                {allEmployees.filter(e => e.role === 'RH').map(e => (
                  <option key={e.id} value={e.id}>{e.name} (RH)</option>
                ))}
              </optgroup>
              <optgroup label="Gestores de Equipe">
                {allEmployees.filter(e => e.role === 'GESTOR').map(e => (
                  <option key={e.id} value={e.id}>{e.name} (Gestor)</option>
                ))}
              </optgroup>
              <optgroup label="Funcionários / Colaboradores">
                {allEmployees.filter(e => e.role === 'FUNCIONARIO').map(e => (
                  <option key={e.id} value={e.id}>{e.name} - {e.jobTitle}</option>
                ))}
              </optgroup>
            </select>
            <div className="ml-2.5 hidden md:block">
              {getRoleBadge(currentUser.role)}
            </div>
          </div>

          {/* New Vacation Button */}
          <button
            onClick={onOpenNewVacationModal}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Férias</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetData}
            title="Restaurar dados iniciais de teste"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700/60"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="bg-slate-950/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar space-x-1 py-1">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg transition shrink-0 ${
              currentTab === 'dashboard'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Painel & Indicadores</span>
          </button>

          <button
            onClick={() => setCurrentTab('calendar')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg transition shrink-0 ${
              currentTab === 'calendar'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendário Visual</span>
          </button>

          <button
            onClick={() => setCurrentTab('vacations')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg transition shrink-0 ${
              currentTab === 'vacations'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Solicitações & Histórico</span>
          </button>

          <button
            onClick={() => setCurrentTab('employees')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg transition shrink-0 ${
              currentTab === 'employees'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Colaboradores & Períodos</span>
          </button>

          <button
            onClick={() => setCurrentTab('clt')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg transition shrink-0 ${
              currentTab === 'clt'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Regras CLT & Limite 7 Dias</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
