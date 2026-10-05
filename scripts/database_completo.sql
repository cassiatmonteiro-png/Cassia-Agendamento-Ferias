-- ============================================================================
-- BANCO DE DADOS POSTGRESQL / SUPABASE COMPLETO (database_completo.sql)
-- SISTEMA DE GESTÃO E AGENDAMENTO DE FÉRIAS CLT
-- ============================================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (ENUMS)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. TABELA DE DEPARTAMENTOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    max_concurrent_vacations INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE FUNCIONÁRIOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    registration_number VARCHAR(30) NOT NULL UNIQUE, -- Matrícula interna
    role VARCHAR(30) NOT NULL DEFAULT 'FUNCIONARIO', -- 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO'
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

-- ----------------------------------------------------------------------------
-- 4. TABELA DE PERÍODOS AQUISITIVOS E CONCESSIVOS (CLT Art. 130 e 134)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accrual_periods (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_number INT NOT NULL, -- 1º ano, 2º ano, etc.
    -- Período Aquisitivo: 12 meses de vigência do contrato
    acquisitive_start DATE NOT NULL,
    acquisitive_end DATE NOT NULL,
    -- Período Concessivo: 12 meses subsequentes para gozar as férias
    concessive_start DATE NOT NULL,
    concessive_end DATE NOT NULL,
    total_days_entitled INT DEFAULT 30, -- Base CLT de 30 dias
    days_taken INT DEFAULT 0,
    days_sold INT DEFAULT 0, -- Abono pecuniário (máx 10 dias - CLT Art. 143)
    days_remaining INT DEFAULT 30,
    status VARCHAR(30) DEFAULT 'EM_ANDAMENTO', -- 'EM_ANDAMENTO', 'ADQUIRIDO', 'CONCEDIDO', 'VENCIDO'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_concessive_after_acquisitive CHECK (concessive_start > acquisitive_start)
);

CREATE INDEX IF NOT EXISTS idx_accrual_employee ON accrual_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_accrual_concessive_end ON accrual_periods(concessive_end);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE SOLICITAÇÕES DE FÉRIAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacation_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    accrual_period_id INT NOT NULL REFERENCES accrual_periods(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    installment_number INT NOT NULL DEFAULT 1, -- Parcela 1, 2 ou 3 (máximo 3 frações CLT)
    sell_days INT DEFAULT 0, -- Abono pecuniário (venda de até 10 dias)
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    
    -- Análise de sobreposição departamental
    has_department_overlap BOOLEAN DEFAULT FALSE,
    overlap_days INT DEFAULT 0,
    conflicting_employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    
    notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validações de integridade
    CONSTRAINT chk_vacation_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_installment_range CHECK (installment_number BETWEEN 1 AND 3),
    CONSTRAINT chk_sell_days_limit CHECK (sell_days BETWEEN 0 AND 10),
    CONSTRAINT chk_min_duration CHECK (duration_days >= 5) -- Nenhuma fração CLT < 5 dias
);

CREATE INDEX IF NOT EXISTS idx_vacations_employee ON vacation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_dates ON vacation_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON vacation_requests(status);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE HISTÓRICO DE APROVAÇÕES E AUDITORIA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacation_approvals (
    id SERIAL PRIMARY KEY,
    vacation_request_id INT NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
    approved_by INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL, -- 'APROVADO_GESTOR', 'APROVADO_RH', 'REJEITADO'
    comment TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_request ON vacation_approvals(vacation_request_id);

-- ----------------------------------------------------------------------------
-- 7. TABELA DE FERIADOS NACIONAIS (Para CLT Art. 134 § 3º)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS national_holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. FUNÇÃO PL/PGSQL: GERAÇÃO AUTOMÁTICA DE PERÍODOS AQUISITIVOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_employee_accrual_periods(
    p_employee_id INT,
    p_hire_date DATE
) RETURNS VOID AS $$
DECLARE
    curr_period INT := 1;
    start_acq DATE := p_hire_date;
    end_acq DATE;
    start_conc DATE;
    end_conc DATE;
    today DATE := CURRENT_DATE;
BEGIN
    WHILE start_acq <= today LOOP
        end_acq := (start_acq + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
        start_conc := (start_acq + INTERVAL '1 year')::DATE;
        end_conc := (start_conc + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
        
        INSERT INTO accrual_periods (
            employee_id,
            period_number,
            acquisitive_start,
            acquisitive_end,
            concessive_start,
            concessive_end,
            total_days_entitled,
            days_taken,
            days_sold,
            days_remaining,
            status
        ) VALUES (
            p_employee_id,
            curr_period,
            start_acq,
            end_acq,
            start_conc,
            end_conc,
            30,
            0,
            0,
            30,
            CASE 
                WHEN today < end_acq THEN 'EM_ANDAMENTO'
                WHEN today BETWEEN start_conc AND end_conc THEN 'ADQUIRIDO'
                ELSE 'VENCIDO'
            END
        )
        ON CONFLICT DO NOTHING;
        
        start_acq := (start_acq + INTERVAL '1 year')::DATE;
        curr_period := curr_period + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 9. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA SUPABASE / POSTGRES
-- ----------------------------------------------------------------------------
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE accrual_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_holidays ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura e escrita em departments" ON departments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura e escrita em employees" ON employees FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura e escrita em accrual_periods" ON accrual_periods FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura e escrita em vacation_requests" ON vacation_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura e escrita em vacation_approvals" ON vacation_approvals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura em national_holidays" ON national_holidays FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 10. CARGA INICIAL COMPLETA (SEED DATA)
-- ----------------------------------------------------------------------------

-- Inserir Departamentos
INSERT INTO departments (id, name, code, description, max_concurrent_vacations) VALUES
(1, 'Tecnologia da Informação', 'TI', 'Engenharia de Software, Infraestrutura e Dados', 1),
(2, 'Recursos Humanos', 'RH', 'Gestão de Pessoas, Folha de Pagamento e Treinamento', 1),
(3, 'Financeiro e Controladoria', 'FIN', 'Contabilidade, Tesouraria e Compliance', 1),
(4, 'Operações e Logística', 'OPS', 'Supply Chain, Distribuição e Armazenagem', 1),
(5, 'Comercial e Vendas', 'COM', 'Expansão de Negócios e Contas Corporativas', 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Inserir Colaboradores (Admin, RH, Gestores e Funcionários)
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

-- Inserir Períodos Aquisitivos e Concessivos
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(1, 5, 1, '2022-08-15', '2023-08-14', '2023-08-15', '2024-08-14', 30, 30, 0, 0, 'CONCEDIDO'),
(2, 5, 2, '2023-08-15', '2024-08-14', '2024-08-15', '2025-08-14', 30, 15, 0, 15, 'ADQUIRIDO'),
(3, 5, 3, '2024-08-15', '2025-08-14', '2025-08-15', '2026-08-14', 30, 0, 0, 30, 'ADQUIRIDO'),
(4, 6, 1, '2023-01-20', '2024-01-19', '2024-01-20', '2025-01-19', 30, 30, 0, 0, 'CONCEDIDO'),
(5, 6, 2, '2024-01-20', '2025-01-19', '2025-01-20', '2026-01-19', 30, 0, 0, 30, 'ADQUIRIDO'),
(6, 7, 1, '2024-02-10', '2025-02-09', '2025-02-10', '2026-02-09', 30, 0, 0, 30, 'ADQUIRIDO'),
(7, 9, 1, '2023-04-03', '2024-04-02', '2024-04-03', '2025-04-02', 30, 20, 10, 0, 'CONCEDIDO'),
(8, 9, 2, '2024-04-03', '2025-04-02', '2025-04-03', '2026-04-02', 30, 0, 0, 30, 'ADQUIRIDO'),
(9, 3, 1, '2023-05-10', '2024-05-09', '2024-05-10', '2025-05-09', 30, 30, 0, 0, 'CONCEDIDO'),
(10, 3, 2, '2024-05-10', '2025-05-09', '2025-05-10', '2026-05-09', 30, 10, 0, 20, 'ADQUIRIDO'),
(11, 11, 1, '2023-11-15', '2024-11-14', '2024-11-15', '2025-11-14', 30, 0, 0, 30, 'ADQUIRIDO')
ON CONFLICT (id) DO UPDATE SET days_remaining = EXCLUDED.days_remaining;

-- Inserir Solicitações de Férias Reais para Teste de Regras
INSERT INTO vacation_requests (id, employee_id, accrual_period_id, start_date, end_date, duration_days, installment_number, sell_days, status, has_department_overlap, overlap_days, conflicting_employee_id, notes) VALUES
-- Lucas Rocha (TI): Férias aprovadas em Novembro (15 dias)
(1, 5, 2, '2026-11-03', '2026-11-17', 15, 1, 0, 'APROVADA_RH', FALSE, 0, NULL, '1ª fração de 15 dias (cumpre regra de período >= 14 dias)'),

-- Mariana Vasconcelos (TI): Férias com sobreposição de 6 dias (12 a 17/11) com Lucas Rocha
-- Permitido pela empresa pois 6 dias <= 7 dias (exceção autorizada de 1 semana!)
(2, 6, 2, '2026-11-12', '2026-11-26', 15, 1, 0, 'APROVADA_RH', TRUE, 6, 5, 'Sobreposição de 6 dias com Lucas Rocha. Dentro do limite de 7 dias.'),

-- Thiago Neves (FIN): Férias com abono pecuniário (venda de 10 dias)
(3, 9, 2, '2026-12-07', '2026-12-26', 20, 1, 10, 'PENDENTE', FALSE, 0, NULL, '20 dias de descanso + 10 dias de abono pecuniário (CLT Art. 143)'),

-- Juliana Castro (RH): Férias aprovadas
(4, 3, 2, '2026-10-13', '2026-10-22', 10, 2, 0, 'APROVADA_RH', FALSE, 0, NULL, 'Férias de 10 dias após o feriado')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Inserir Feriados Nacionais Brasileiros (CLT Art. 134 § 3º)
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

-- Atualizar sequences
SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 1));
SELECT setval('employees_id_seq', COALESCE((SELECT MAX(id) FROM employees), 1));
SELECT setval('accrual_periods_id_seq', COALESCE((SELECT MAX(id) FROM accrual_periods), 1));
SELECT setval('vacation_requests_id_seq', COALESCE((SELECT MAX(id) FROM vacation_requests), 1));
