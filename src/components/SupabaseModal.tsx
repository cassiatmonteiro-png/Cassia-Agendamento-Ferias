import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Trash2, 
  Key, 
  Globe,
  Sparkles,
  Layers
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveCustomSupabaseConfig, 
  clearCustomSupabaseConfig, 
  testSupabaseConnection,
  SupabaseConfig 
} from '../lib/supabase.ts';
import { vacationStore } from '../lib/storage.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentConfig = getSupabaseConfig();
      setConfig(currentConfig);
      setUrlInput(currentConfig.url || '');
      setKeyInput(currentConfig.anonKey || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) return;

    saveCustomSupabaseConfig(urlInput.trim(), keyInput.trim());
    setConfig(getSupabaseConfig());

    setTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection();
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      // Sincroniza dados
      setSyncing(true);
      await vacationStore.syncWithSupabase();
      setSyncing(false);
      onSyncComplete();
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const res = await vacationStore.syncWithSupabase();
    setSyncing(false);
    setTestResult(res);
    if (res.success) {
      onSyncComplete();
    }
  };

  const handleClear = () => {
    clearCustomSupabaseConfig();
    setConfig(getSupabaseConfig());
    setUrlInput('');
    setKeyInput('');
    setTestResult({ success: true, message: 'Configuração do Supabase removida. O sistema voltou ao modo de persistência local.' });
    onSyncComplete();
  };

  const handleCopyMigrationSql = () => {
    const sql = `-- Script de migração Supabase para FériasCLT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    max_concurrent_vacations INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    registration_number VARCHAR(30) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'FUNCIONARIO',
    department_id INT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    manager_id INT REFERENCES public.employees(id) ON DELETE SET NULL,
    hire_date DATE NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accrual_periods (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    period_number INT NOT NULL,
    acquisitive_start DATE NOT NULL,
    acquisitive_end DATE NOT NULL,
    concessive_start DATE NOT NULL,
    concessive_end DATE NOT NULL,
    total_days_entitled INT DEFAULT 30,
    days_taken INT DEFAULT 0,
    days_sold INT DEFAULT 0,
    days_remaining INT DEFAULT 30,
    status VARCHAR(30) DEFAULT 'EM_ANDAMENTO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.vacation_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    accrual_period_id INT NOT NULL REFERENCES public.accrual_periods(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    installment_number INT NOT NULL DEFAULT 1,
    sell_days INT DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    has_department_overlap BOOLEAN DEFAULT FALSE,
    overlap_days INT DEFAULT 0,
    conflicting_employee_id INT REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accrual_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_all" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "employees_all" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "accrual_periods_all" ON public.accrual_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vacation_requests_all" ON public.vacation_requests FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Conexão com Supabase (PostgreSQL)
                </h2>
                {config.isConfigured ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Configurado ({config.source === 'env' ? '.env' : 'custom'})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    Modo Local
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Persistência em tempo real no banco PostgreSQL gerenciado no Supabase
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

        {/* Status Feedback Message */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
            testResult.success 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <strong>{testResult.success ? 'Status da Conexão:' : 'Erro de Conexão:'}</strong>
              <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Quick Instructions & SQL Editor Helper */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
              Como conectar seu banco Supabase em 3 passos:
            </span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center"
            >
              Abrir Supabase <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
            <li>Copie suas credenciais em <strong>Project Settings &gt; API</strong> no painel do Supabase.</li>
            <li>No menu <strong>SQL Editor</strong> do Supabase, cole e execute o script de tabelas.</li>
            <li>Cole a <strong>URL</strong> e a <strong>Anon Key</strong> abaixo e clique em <strong>Salvar e Testar</strong>!</li>
          </ol>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCopyMigrationSql}
              className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition text-xs shadow-2xs"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Script SQL Copiado para a Área de Transferência!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Copiar Script de Tabelas para o SQL Editor do Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveAndTest} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              Project URL do Supabase:
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzproject.supabase.co"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-white rounded-xl p-2.5 border border-slate-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center">
              <Key className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              Anon Public API Key:
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full bg-white rounded-xl p-2.5 border border-slate-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            {config.isConfigured && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center space-x-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Desconectar do Supabase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl"
              >
                Fechar
              </button>

              <button
                type="submit"
                disabled={testing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Salvar e Conectar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
