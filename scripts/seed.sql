-- ============================================================================
-- DADOS DE TESTE PARA AGENDAMENTO DE FÉRIAS (seed.sql)
-- Inclui Departamentos, Funcionários, Gestores, Períodos Aquisitivos e Solicitações
-- ============================================================================

-- 1. DEPARTAMENTOS
INSERT INTO departments (id, name, code, description, max_concurrent_vacations) VALUES
(1, 'Tecnologia da Informação', 'TI', 'Engenharia de Software, Infraestrutura e Dados', 1),
(2, 'Recursos Humanos', 'RH', 'Gestão de Pessoas, Folha de Pagamento e Treinamento', 1),
(3, 'Financeiro e Controladoria', 'FIN', 'Contas a pagar/receber, Contabilidade e Compliance', 1),
(4, 'Operações e Logística', 'OPS', 'Supply Chain, Distribuição e Armazenagem', 1),
(5, 'Comercial e Vendas', 'COM', 'Expansão de Negócios e Atendimento Corporativo', 1);

-- 2. FUNCIONÁRIOS (Admin, RH, Gestores e Colaboradores)
INSERT INTO employees (id, name, email, cpf, registration_number, role, department_id, manager_id, hire_date, job_title, active) VALUES
-- Admin Geral
(1, 'Carlos Eduardo Silveira', 'carlos.silveira@empresa.com.br', '111.222.333-44', 'MAT-1001', 'ADMIN', 1, NULL, '2021-02-15', 'Diretor de Operações e TI', TRUE),

-- RH
(2, 'Ana Paula Mendes', 'ana.mendes@empresa.com.br', '222.333.444-55', 'MAT-1002', 'RH', 2, 1, '2022-03-01', 'Coordenadora de Recursos Humanos', TRUE),
(3, 'Juliana Castro', 'juliana.castro@empresa.com.br', '333.444.555-66', 'MAT-1003', 'RH', 2, 2, '2023-05-10', 'Analista de DP e Benefícios', TRUE),

-- TI (Gestor + Time para testar conflitos departamentais e regra de 7 dias)
(4, 'Rodrigo Albuquerque', 'rodrigo.ti@empresa.com.br', '444.555.666-77', 'MAT-1004', 'GESTOR', 1, 1, '2021-06-01', 'Tech Lead / Gestor de TI', TRUE),
(5, 'Lucas Pereira Rocha', 'lucas.rocha@empresa.com.br', '555.666.777-88', 'MAT-1005', 'FUNCIONARIO', 1, 4, '2022-08-15', 'Desenvolvedor Frontend Sênior', TRUE),
(6, 'Mariana Vasconcelos', 'mariana.v@empresa.com.br', '666.777.888-99', 'MAT-1006', 'FUNCIONARIO', 1, 4, '2023-01-20', 'Desenvolvedora Backend Pleno', TRUE),
(7, 'Felipe Sampaio', 'felipe.sampaio@empresa.com.br', '777.888.999-00', 'MAT-1007', 'FUNCIONARIO', 1, 4, '2024-02-10', 'Engenheiro de DevOps', TRUE),

-- Financeiro (Gestor + Time)
(8, 'Beatriz Souza Ramos', 'beatriz.ramos@empresa.com.br', '888.999.000-11', 'MAT-1008', 'GESTOR', 3, 1, '2022-01-10', 'Gerente Financeira', TRUE),
(9, 'Thiago Neves', 'thiago.neves@empresa.com.br', '999.000.111-22', 'MAT-1009', 'FUNCIONARIO', 3, 8, '2023-04-03', 'Analista Financeiro Pleno', TRUE),

-- Vendas
(10, 'Gabriel Fontes', 'gabriel.fontes@empresa.com.br', '000.111.222-33', 'MAT-1010', 'GESTOR', 5, 1, '2022-09-01', 'Coordenador Comercial', TRUE),
(11, 'Fernanda Lima', 'fernanda.lima@empresa.com.br', '123.456.789-01', 'MAT-1011', 'FUNCIONARIO', 5, 10, '2023-11-15', 'Executiva de Contas', TRUE);

-- Ajustar sequence se rodar no PostgreSQL
SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));
SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

-- 3. PERÍODOS AQUISITIVOS E CONCESSIVOS (Exemplos calculados conforme CLT)
-- Lucas Rocha (TI) - Admitido em 15/08/2022
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(1, 5, 1, '2022-08-15', '2023-08-14', '2023-08-15', '2024-08-14', 30, 30, 0, 0, 'CONCEDIDO'),
(2, 5, 2, '2023-08-15', '2024-08-14', '2024-08-15', '2025-08-14', 30, 15, 0, 15, 'ADQUIRIDO'),
(3, 5, 3, '2024-08-15', '2025-08-14', '2025-08-15', '2026-08-14', 30, 0, 0, 30, 'ADQUIRIDO');

-- Mariana Vasconcelos (TI) - Admitida em 20/01/2023
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(4, 6, 1, '2023-01-20', '2024-01-19', '2024-01-20', '2025-01-19', 30, 30, 0, 0, 'CONCEDIDO'),
(5, 6, 2, '2024-01-20', '2025-01-19', '2025-01-20', '2026-01-19', 30, 0, 0, 30, 'ADQUIRIDO');

-- Felipe Sampaio (TI) - Admitido em 10/02/2024
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(6, 7, 1, '2024-02-10', '2025-02-09', '2025-02-10', '2026-02-09', 30, 0, 0, 30, 'ADQUIRIDO');

-- Thiago Neves (FIN) - Admitido em 03/04/2023
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(7, 9, 1, '2023-04-03', '2024-04-02', '2024-04-03', '2025-04-02', 30, 20, 10, 0, 'CONCEDIDO'),
(8, 9, 2, '2024-04-03', '2025-04-02', '2025-04-03', '2026-04-02', 30, 0, 0, 30, 'ADQUIRIDO');

-- Juliana Castro (RH) - Admitida em 10/05/2023
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(9, 3, 1, '2023-05-10', '2024-05-09', '2024-05-10', '2025-05-09', 30, 30, 0, 0, 'CONCEDIDO'),
(10, 3, 2, '2024-05-10', '2025-05-09', '2025-05-10', '2026-05-09', 30, 10, 0, 20, 'ADQUIRIDO');

-- Fernanda Lima (COM) - Admitida em 15/11/2023
INSERT INTO accrual_periods (id, employee_id, period_number, acquisitive_start, acquisitive_end, concessive_start, concessive_end, total_days_entitled, days_taken, days_sold, days_remaining, status) VALUES
(11, 11, 1, '2023-11-15', '2024-11-14', '2024-11-15', '2025-11-14', 30, 0, 0, 30, 'ADQUIRIDO');

SELECT setval('accrual_periods_id_seq', (SELECT MAX(id) FROM accrual_periods));

-- 4. SOLICITAÇÕES DE FÉRIAS (Cenários Reais)
INSERT INTO vacation_requests (id, employee_id, accrual_period_id, start_date, end_date, duration_days, installment_number, sell_days, status, has_department_overlap, overlap_days, conflicting_employee_id, notes) VALUES
-- Lucas Rocha (TI): Férias já aprovadas em Novembro (15 dias)
(1, 5, 2, '2026-11-03', '2026-11-17', 15, 1, 0, 'APROVADA_RH', FALSE, 0, NULL, '1ª fração de 15 dias (cumpre regra de período >= 14 dias)'),

-- Mariana (TI): Férias programadas para 12/11/2026 a 26/11/2026 -> SOBREPOSIÇÃO de 6 dias (12/11 a 17/11).
-- Permitido pela empresa pois 6 dias <= 7 dias (exceção aceita!)
(2, 6, 2, '2026-11-12', '2026-11-26', 15, 1, 0, 'APROVADA_RH', TRUE, 6, 5, 'Sobreposição de 6 dias com Lucas Rocha. Dentro do limite de 7 dias.'),

-- Thiago Neves (FIN): Férias em Dezembro com abono pecuniário (venda de 10 dias)
(3, 9, 2, '2026-12-07', '2026-12-26', 20, 1, 10, 'PENDENTE', FALSE, 0, NULL, 'Solicitação com 20 dias de descanso + 10 dias de abono pecuniário CLT Art. 143'),

-- Juliana Castro (RH): Férias em Outubro
(4, 3, 2, '2026-10-12', '2026-10-21', 10, 2, 0, 'APROVADA_RH', FALSE, 0, NULL, '2ª fração de 10 dias');

SELECT setval('vacation_requests_id_seq', (SELECT MAX(id) FROM vacation_requests));

-- 5. FERIADOS NACIONAIS BRASILEIROS (Para validação do Art. 134 § 3º CLT)
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
('2026-12-25', 'Natal');
