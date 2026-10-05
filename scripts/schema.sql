-- ============================================================================
-- SISTEMA DE AGENDAMENTO DE FÉRIAS CORPORATIVAS (CONFORME CLT)
-- SCRIPT DDL POSTGRESQL (schema.sql)
-- ============================================================================

-- Extensão para UUID se desejado (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO');
CREATE TYPE request_status AS ENUM ('PENDENTE', 'APROVADA_GESTOR', 'APROVADA_RH', 'REJEITADA', 'CANCELADA');
CREATE TYPE period_status AS ENUM ('EM_ANDAMENTO', 'ADQUIRIDO', 'CONCEDIDO', 'VENCIDO');

-- 2. TABELA DE DEPARTAMENTOS
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    max_concurrent_vacations INT DEFAULT 1, -- Política interna de simultaneidade padrão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE FUNCIONÁRIOS
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    registration_number VARCHAR(30) NOT NULL UNIQUE, -- Matrícula
    role user_role NOT NULL DEFAULT 'FUNCIONARIO',
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    manager_id INT REFERENCES employees(id) ON DELETE SET NULL,
    hire_date DATE NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida por departamento e gestor
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);

-- 4. TABELA DE PERÍODOS AQUISITIVOS E CONCESSIVOS (CLT Art. 130 e 134)
CREATE TABLE accrual_periods (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_number INT NOT NULL, -- 1º ano, 2º ano, etc.
    -- Período Aquisitivo: 12 meses de trabalho
    acquisitive_start DATE NOT NULL,
    acquisitive_end DATE NOT NULL,
    -- Período Concessivo: 12 meses subsequentes para gozar as férias
    concessive_start DATE NOT NULL,
    concessive_end DATE NOT NULL,
    total_days_entitled INT DEFAULT 30, -- Base CLT de 30 dias (sujeito a faltas injustificadas)
    days_taken INT DEFAULT 0,
    days_sold INT DEFAULT 0, -- Abono pecuniário (máx 10 dias)
    days_remaining INT DEFAULT 30,
    status period_status DEFAULT 'EM_ANDAMENTO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_concessive_after_acquisitive CHECK (concessive_start > acquisitive_start)
);

CREATE INDEX idx_accrual_employee ON accrual_periods(employee_id);
CREATE INDEX idx_accrual_concessive_end ON accrual_periods(concessive_end);

-- 5. TABELA DE SOLICITAÇÕES DE FÉRIAS
CREATE TABLE vacation_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    accrual_period_id INT NOT NULL REFERENCES accrual_periods(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    installment_number INT NOT NULL DEFAULT 1, -- Parcela 1, 2 ou 3 (máximo 3 períodos CLT)
    sell_days INT DEFAULT 0, -- Abono pecuniário (venda de até 10 dias)
    status request_status NOT NULL DEFAULT 'PENDENTE',
    
    -- Análise de sobreposição departamental
    has_department_overlap BOOLEAN DEFAULT FALSE,
    overlap_days INT DEFAULT 0,
    conflicting_employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    
    notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validação básica de datas
    CONSTRAINT chk_vacation_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_installment_range CHECK (installment_number BETWEEN 1 AND 3),
    CONSTRAINT chk_sell_days_limit CHECK (sell_days BETWEEN 0 AND 10)
);

CREATE INDEX idx_vacations_employee ON vacation_requests(employee_id);
CREATE INDEX idx_vacations_dates ON vacation_requests(start_date, end_date);
CREATE INDEX idx_vacations_status ON vacation_requests(status);

-- 6. TABELA DE HISTÓRICO E APROVAÇÕES (AUDITORIA)
CREATE TABLE vacation_approvals (
    id SERIAL PRIMARY KEY,
    vacation_request_id INT NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
    approved_by INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL, -- 'APROVADO_GESTOR', 'APROVADO_RH', 'REJEITADO'
    comment TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approvals_request ON vacation_approvals(vacation_request_id);

-- 7. TABELA DE FERIADOS NACIONAIS (Para validação do Art. 134 § 3º CLT)
CREATE TABLE national_holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

-- ============================================================================
-- FUNÇÃO AUXILIAR: CALCULAR PERÍODOS AQUISITIVO E CONCESSIVO BASEADO NA ADMISSÃO
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_employee_accrual_periods(
    emp_id INT,
    emp_hire_date DATE
) RETURNS VOID AS $$
DECLARE
    curr_period INT := 1;
    start_acq DATE := emp_hire_date;
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
            emp_id,
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
                WHEN today < end_acq THEN 'EM_ANDAMENTO'::period_status
                WHEN today BETWEEN start_conc AND end_conc THEN 'ADQUIRIDO'::period_status
                ELSE 'VENCIDO'::period_status
            END
        );
        
        start_acq := (start_acq + INTERVAL '1 year')::DATE;
        curr_period := curr_period + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
