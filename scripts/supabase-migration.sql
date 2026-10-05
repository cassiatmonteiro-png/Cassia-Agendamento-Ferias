-- ============================================================================
-- SCRIPT DE MIGRAÇÃO SUPABASE (POSTGRESQL) - SISTEMA DE FÉRIAS CLT
-- Execute este script no SQL Editor do seu projeto Supabase (supabase.com)
-- ============================================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS (se não existirem)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('PENDENTE', 'APROVADA_GESTOR', 'APROVADA_RH', 'REJEITADA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE period_status AS ENUM ('EM_ANDAMENTO', 'ADQUIRIDO', 'CONCEDIDO', 'VENCIDO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE DEPARTAMENTOS
CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    max_concurrent_vacations INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE FUNCIONÁRIOS
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(manager_id);

-- 4. TABELA DE PERÍODOS AQUISITIVOS E CONCESSIVOS (CLT Art. 130 e 134)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accrual_employee ON public.accrual_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_accrual_concessive_end ON public.accrual_periods(concessive_end);

-- 5. TABELA DE SOLICITAÇÕES DE FÉRIAS
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_vacations_employee ON public.vacation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_dates ON public.vacation_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON public.vacation_requests(status);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accrual_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso anônimo e autenticado no Supabase
DO $$ BEGIN
    CREATE POLICY "Allow public read and write on departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read and write on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read and write on accrual_periods" ON public.accrual_periods FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read and write on vacation_requests" ON public.vacation_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. CARGA DE DADOS INICIAIS (SEED) NO SUPABASE
INSERT INTO public.departments (id, name, code, description, max_concurrent_vacations)
VALUES
(1, 'Tecnologia da Informação', 'TI', 'Engenharia de Software e Infraestrutura', 1),
(2, 'Recursos Humanos', 'RH', 'Gestão de Pessoas e Departamento Pessoal', 1),
(3, 'Financeiro e Controladoria', 'FIN', 'Contabilidade e Compliance', 1),
(4, 'Operações e Logística', 'OPS', 'Supply Chain e Armazenagem', 1),
(5, 'Comercial e Vendas', 'COM', 'Expansão de Negócios e Atendimento', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employees (id, name, email, cpf, registration_number, role, department_id, manager_id, hire_date, job_title, active)
VALUES
(1, 'Carlos Eduardo Silveira', 'carlos.silveira@empresa.com.br', '111.222.333-44', 'MAT-1001', 'ADMIN', 1, NULL, '2021-02-15', 'Diretor de Operações e TI', TRUE),
(2, 'Ana Paula Mendes', 'ana.mendes@empresa.com.br', '222.333.444-55', 'MAT-1002', 'RH', 2, 1, '2022-03-01', 'Coordenadora de Recursos Humanos', TRUE),
(3, 'Juliana Castro', 'juliana.castro@empresa.com.br', '333.444.555-66', 'MAT-1003', 'RH', 2, 2, '2023-05-10', 'Analista de DP e Benefícios', TRUE),
(4, 'Rodrigo Albuquerque', 'rodrigo.ti@empresa.com.br', '444.555.666-77', 'MAT-1004', 'GESTOR', 1, 1, '2021-06-01', 'Tech Lead / Gestor de TI', TRUE),
(5, 'Lucas Pereira Rocha', 'lucas.rocha@empresa.com.br', '555.666.777-88', 'MAT-1005', 'FUNCIONARIO', 1, 4, '2022-08-15', 'Desenvolvedor Frontend Sênior', TRUE),
(6, 'Mariana Vasconcelos', 'mariana.v@empresa.com.br', '666.777.888-99', 'MAT-1006', 'FUNCIONARIO', 1, 4, '2023-01-20', 'Desenvolvedora Backend Pleno', TRUE),
(7, 'Felipe Sampaio', 'felipe.sampaio@empresa.com.br', '777.888.999-00', 'MAT-1007', 'FUNCIONARIO', 1, 4, '2024-02-10', 'Engenheiro de DevOps', TRUE),
(8, 'Beatriz Souza Ramos', 'beatriz.ramos@empresa.com.br', '888.999.000-11', 'MAT-1008', 'GESTOR', 3, 1, '2022-01-10', 'Gerente Financeira', TRUE),
(9, 'Thiago Neves', 'thiago.neves@empresa.com.br', '999.000.111-22', 'MAT-1009', 'FUNCIONARIO', 3, 8, '2023-04-03', 'Analista Financeiro Pleno', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Atualizar sequences do PostgreSQL no Supabase
SELECT setval('public.departments_id_seq', COALESCE((SELECT MAX(id) FROM public.departments), 1));
SELECT setval('public.employees_id_seq', COALESCE((SELECT MAX(id) FROM public.employees), 1));
SELECT setval('public.accrual_periods_id_seq', COALESCE((SELECT MAX(id) FROM public.accrual_periods), 1));
SELECT setval('public.vacation_requests_id_seq', COALESCE((SELECT MAX(id) FROM public.vacation_requests), 1));
