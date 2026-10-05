/**
 * Rotas e Controladores REST do Backend Node.js
 */
import { Request, Response } from 'express';
import { vacationStore } from '../lib/storage.ts';

export const handleGetDepartments = (_req: Request, res: Response) => {
  res.json({ success: true, data: vacationStore.getDepartments() });
};

export const handleCreateDepartment = (req: Request, res: Response) => {
  try {
    const { name, code, description, maxConcurrentVacations } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Nome e código são obrigatórios.' });
    }
    const created = vacationStore.addDepartment({
      name,
      code,
      description: description || '',
      maxConcurrentVacations: Number(maxConcurrentVacations) || 1,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handleGetEmployees = (_req: Request, res: Response) => {
  res.json({ success: true, data: vacationStore.getEmployees() });
};

export const handleCreateEmployee = (req: Request, res: Response) => {
  try {
    const { name, email, cpf, registrationNumber, role, departmentId, managerId, hireDate, jobTitle } = req.body;
    if (!name || !email || !cpf || !departmentId || !hireDate) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios não preenchidos.' });
    }
    const created = vacationStore.addEmployee({
      name,
      email,
      cpf,
      registrationNumber: registrationNumber || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
      role: role || 'FUNCIONARIO',
      departmentId: Number(departmentId),
      managerId: managerId ? Number(managerId) : null,
      hireDate,
      jobTitle: jobTitle || 'Colaborador',
      active: true,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handleGetVacations = (req: Request, res: Response) => {
  const { employeeId, departmentId, status } = req.query;
  const list = vacationStore.getVacationRequests({
    employeeId: employeeId ? Number(employeeId) : undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    status: status ? String(status) : undefined,
  });
  res.json({ success: true, data: list });
};

export const handleCheckConflicts = (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate, excludeRequestId } = req.body;
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Parâmetros incompletos.' });
    }
    const conflictResult = vacationStore.checkConflicts({
      employeeId: Number(employeeId),
      startDate,
      endDate,
      excludeRequestId: excludeRequestId ? Number(excludeRequestId) : undefined,
    });
    res.json({ success: true, data: conflictResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handleSuggestDates = (req: Request, res: Response) => {
  try {
    const { employeeId, originalStartDate, durationDays, conflictingVacationId } = req.body;
    if (!employeeId || !originalStartDate || !durationDays) {
      return res.status(400).json({ success: false, error: 'Parâmetros incompletos.' });
    }
    const suggestions = vacationStore.suggestDates({
      employeeId: Number(employeeId),
      originalStartDate,
      durationDays: Number(durationDays),
      conflictingVacationId: conflictingVacationId ? Number(conflictingVacationId) : undefined,
    });
    res.json({ success: true, data: suggestions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handleCreateVacation = (req: Request, res: Response) => {
  try {
    const { employeeId, accrualPeriodId, startDate, endDate, durationDays, sellDays, notes } = req.body;
    const result = vacationStore.createVacationRequest({
      employeeId: Number(employeeId),
      accrualPeriodId: Number(accrualPeriodId),
      startDate,
      endDate,
      durationDays: Number(durationDays),
      sellDays: Number(sellDays || 0),
      notes,
    });

    if (!result.success) {
      return res.status(422).json({ success: false, error: result.error });
    }
    res.status(201).json({ success: true, data: result.request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handleUpdateVacationStatus = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status é obrigatório.' });
    }
    const updated = vacationStore.updateRequestStatus(Number(id), status, rejectionReason);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Solicitação não encontrada.' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handleGetDashboardStats = (_req: Request, res: Response) => {
  res.json({ success: true, data: vacationStore.getDashboardStats() });
};
