import React, { useState } from 'react';
import { Database, Download, Copy, Check, FileCode, Sparkles } from 'lucide-react';

const COMPLETE_DATABASE_SQL = `-- ============================================================================
-- SCRIPT SQL CONSOLIDADO COMPLETO (DDL + SEED + RLS)
-- SISTEMA DE GESTÃO E AGENDAMENTO DE FÉRIAS CLT
-- Compatível com PostgreSQL 14+, Cloud SQL e Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('PENDENTE', 'APROVADA_GESTOR', 'APROVADA_RH', 'REJEITADA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE period_status AS ENUM ('EM_ANDAMENTO', 'ADQUIRIDO', 'CONCEDIDO', 'VENCIDO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELA DE DEPARTAMENTOS
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    max_concurrent_vacations INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    registration_number VARCHAR(30) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'FUNCIONARIO',
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    manager_id INT REFERENCES employees(id) ON DELETE SET NULL,
    hire_date DATE NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

-- 4. TABELA DE PERÍODOS AQUISITIVOS E CONCESSIVOS (CLT Art. 130 e 134)
CREATE TABLE IF NOT EXISTS accrual_periods (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_concessive_after_acquisitive CHECK (concessive_start > acquisitive_start)
);

CREATE INDEX IF NOT EXISTS idx_accrual_employee ON accrual_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_accrual_concessive_end ON accrual_periods(concessive_end);

-- 5. TABELA DE SOLICITAÇÕES DE FÉRIAS
CREATE TABLE IF NOT EXISTS vacation_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    accrual_period_id INT NOT NULL REFERENCES accrual_periods(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    installment_number INT NOT NULL DEFAULT 1,
    sell_days INT DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    has_department_overlap BOOLEAN DEFAULT FALSE,
    overlap_days INT DEFAULT 0,
    conflicting_employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vacation_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_installment_range CHECK (installment_number BETWEEN 1 AND 3),
    CONSTRAINT chk_sell_days_limit CHECK (sell_days BETWEEN 0 AND 10),
    CONSTRAINT chk_min_duration CHECK (duration_days >= 5)
);

CREATE INDEX IF NOT EXISTS idx_vacations_employee ON vacation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_dates ON vacation_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON vacation_requests(status);

-- 6. TABELA DE AUDITORIA E APROVAÇÕES
CREATE TABLE IF NOT EXISTS vacation_approvals (
    id SERIAL PRIMARY KEY,
    vacation_request_id INT NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
    approved_by INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    comment TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE FERIADOS NACIONAIS (Para CLT Art. 134 § 3º)
CREATE TABLE IF NOT EXISTS national_holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

-- 8. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE accrual_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "permitir_todos_departments" ON departments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "permitir_todos_employees" ON employees FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "permitir_todos_accruals" ON accrual_periods FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "permitir_todos_vacations" ON vacation_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 9. CARGA DE DADOS DE TESTE (SEED)
INSERT INTO departments (id, name, code, description, max_concurrent_vacations) VALUES
(1, 'Tecnologia da Informação', 'TI', 'Engenharia de Software, Infraestrutura e Dados', 1),
(2, 'Recursos Humanos', 'RH', 'Gestão de Pessoas, Folha de Pagamento e Treinamento', 1),
(3, 'Financeiro e Controladoria', 'FIN', 'Contabilidade, Tesouraria e Compliance', 1),
(4, 'Operações e Logística', 'OPS', 'Supply Chain, Distribuição e Armazenagem', 1),
(5, 'Comercial e Vendas', 'COM', 'Expansão de Negócios e Contas Corporativas', 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO employees (id, name, email, cpf, registration_number, role, department_id, manager_id, hire_date, job_title, active) VALUES
(1, 'Carlos Eduardo Silveira', 'carlos.silveira@empresa.com.br', '111.222.333-44', 'MAT-1001', 'ADMIN', 1, NULL, '2021-02-15', 'Diretor de Operações e TI', TRUE),
(2, 'Ana Paula Mendes', 'ana.mendes@empresa.com.br', '222.333.444-55', 'MAT-1002', 'RH', 2, 1, '2022-03-01', 'Coordenadora de Recursos Humanos', TRUE),
(3, 'Juliana Castro', 'juliana.castro@empresa.com.br', '333.444.555-66', 'MAT-1003', 'RH', 2, 2, '2023-05-10', 'Analista de DP e Benefícios', TRUE),
(4, 'Rodrigo Albuquerque', 'rodrigo.ti@empresa.com.br', '444.555.666-77', 'MAT-1004', 'GESTOR', 1, 1, '2021-06-01', 'Tech Lead / Gestor de TI', TRUE),
(5, 'Lucas Pereira Rocha', 'lucas.rocha@empresa.com.br', '555.666.777-88', 'MAT-1005', 'FUNCIONARIO', 1, 4, '2022-08-15', 'Desenvolvedor Frontend Sênior', TRUE),
(6, 'Mariana Vasconcelos', 'mariana.v@empresa.com.br', '666.777.888-99', 'MAT-1006', 'FUNCIONARIO', 1, 4, '2023-01-20', 'Desenvolvedora Backend Pleno', TRUE),
(7, 'Felipe Sampaio', 'felipe.sampaio@empresa.com.br', '777.888.999-00', 'MAT-1007', 'FUNCIONARIO', 1, 4, '2024-02-10', 'Engenheiro de DevOps', TRUE),
(8, 'Beatriz Souza Ramos', 'beatriz.ramos@empresa.com.br', '888.999.000-11', 'MAT-1008', 'GESTOR', 3, 1, '2022-01-10', 'Gerente Financeira', TRUE),
(9, 'Thiago Neves', 'thiago.neves@empresa.com.br', '999.000.111-22', 'MAT-1009', 'FUNCIONARIO', 3, 8, '2023-04-03', 'Analista Financeiro Pleno', TRUE),
(10, 'Gabriel Fontes', 'gabriel.fontes@empresa.com.br', '000.111.222-33', 'MAT-1010', 'GESTOR', 5, 1, '2022-09-01', 'Coordenador Comercial', TRUE),
(11, 'Fernanda Lima', 'fernanda.lima@empresa.com.br', '123.456.789-01', 'MAT-1011', 'FUNCIONARIO', 5, 10, '2023-11-15', 'Executiva de Contas', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(1, 5, 1, '2022-08-15', '2023-08-14', '2023-08-15', '2024-08-14', 30, 30, 0, 0, 'CONCEDIDO'),
(2, 5, 2, '2023-08-15', '2024-08-14', '2024-08-15', '2025-08-14', 30, 15, 0, 15, 'ADQUIRIDO'),
(3, 5, 3, '2024-08-15', '2025-08-14', '2025-08-15', '2026-08-14', 30, 0, 0, 30, 'ADQUIRIDO'),
(4, 6, 1, '2023-01-20', '2024-01-19', '2024-01-20', '2025-01-19', 30, 30, 0, 0, 'CONCEDIDO'),
(5, 6, 2, '2024-01-20', '2025-01-19', '2025-01-20', '2026-01-19', 30, 0, 0, 30, 'ADQUIRIDO'),
(6, 7, 1, '2024-02-10', '2025-02-09', '2025-02-10', '2026-02-09', 30, 0, 0, 30, 'ADQUIRIDO'),
(7, 9, 1, '2023-04-03', '2024-04-02', '2024-04-03', '2025-04-02', 30, 20, 10, 0, 'CONCEDIDO'),
(8, 9, 2, '2024-04-03', '2025-04-02', '2025-04-03', '2026-04-02', 30, 0, 0, 30, 'ADQUIRIDO')
ON CONFLICT (id) DO UPDATE SET days_remaining = EXCLUDED.days_remaining;

-- Solicitações com sobreposição de 6 dias (<= 7 dias permitidos por exceção)
INSERT INTO vacation_requests (id, employee_id, accrual_period_id, start_date, end_date, duration_days, installment_number, sell_days, status, has_department_overlap, overlap_days, conflicting_employee_id, notes) VALUES
(1, 5, 2, '2026-11-03', '2026-11-17', 15, 1, 0, 'APROVADA_RH', FALSE, 0, NULL, '1ª fração de 15 dias (cumpre regra de período >= 14 dias)'),
(2, 6, 2, '2026-11-12', '2026-11-26', 15, 1, 0, 'APROVADA_RH', TRUE, 6, 5, 'Sobreposição de 6 dias com Lucas Rocha. Dentro do limite de 7 dias.'),
(3, 9, 2, '2026-12-07', '2026-12-26', 20, 1, 10, 'PENDENTE', FALSE, 0, NULL, '20 dias de descanso + 10 dias de abono CLT 143')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Feriados Nacionais
INSERT INTO national_holidays (date, name) VALUES
('2026-01-01', 'Confraternização Universal'),
('2026-02-17', 'Carnaval'),
('2026-04-03', 'Sexta-feira Santa'),
('2026-04-21', 'Tiradentes'),
('2026-05-01', 'Dia do Trabalho'),
('2026-06-04', 'Corpus Christi'),
('2026-09-07', 'Independência do Brasil'),
('2026-10-12', 'Nossa Senhora Aparecida'),
('2026-11-02', 'Finados'),
('2026-11-15', 'Proclamação da República'),
('2026-11-20', 'Dia da Consciência Negra'),
('2026-12-25', 'Natal')
ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name;

SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 1));
SELECT setval('employees_id_seq', COALESCE((SELECT MAX(id) FROM employees), 1));
SELECT setval('accrual_periods_id_seq', COALESCE((SELECT MAX(id) FROM accrual_periods), 1));
SELECT setval('vacation_requests_id_seq', COALESCE((SELECT MAX(id) FROM vacation_requests), 1));
`;

export const SqlViewerModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'complete' | 'schema' | 'seed'>('complete');
  const [copied, setCopied] = useState(false);

  const getActiveContent = () => {
    switch (activeTab) {
      case 'complete':
        return COMPLETE_DATABASE_SQL;
      case 'schema':
        return COMPLETE_DATABASE_SQL.split('-- 9. CARGA DE DADOS DE TESTE')[0];
      case 'seed':
        return '-- CARGA DE DADOS DE TESTE\n' + (COMPLETE_DATABASE_SQL.split('-- 9. CARGA DE DADOS DE TESTE')[1] || '');
    }
  };

  const activeContent = getActiveContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'database_completo.sql';
    if (activeTab === 'schema') filename = 'schema.sql';
    if (activeTab === 'seed') filename = 'seed.sql';

    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Scripts SQL Prontos para Deploy</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Banco de Dados Relacional PostgreSQL
          </h2>
          <p className="text-xs text-slate-500">
            Script consolidado com DDL completo, chaves estrangeiras, índices, regras de integridade e dados de teste.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado para a área de transferência!' : 'Copiar SQL'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Baixar {activeTab === 'complete' ? 'database_completo.sql' : (activeTab === 'schema' ? 'schema.sql' : 'seed.sql')}</span>
          </button>
        </div>
      </div>

      {/* Script Selector Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('complete')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'complete'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>database_completo.sql (Consolidado: DDL + Seed + RLS)</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'schema'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4 text-blue-400" />
          <span>schema.sql (Apenas Estrutura DDL)</span>
        </button>

        <button
          onClick={() => setActiveTab('seed')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'seed'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span>seed.sql (Apenas Dados de Teste)</span>
        </button>
      </div>

      {/* Code Display Area */}
      <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-xl overflow-x-auto text-xs font-mono text-slate-200 max-h-[620px] leading-relaxed select-all">
        <pre>{activeContent}</pre>
      </div>
    </div>
  );
};
