import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  handleGetDepartments,
  handleCreateDepartment,
  handleGetEmployees,
  handleCreateEmployee,
  handleGetVacations,
  handleCreateVacation,
  handleUpdateVacationStatus,
  handleCheckConflicts,
  handleSuggestDates,
  handleGetDashboardStats
} from './src/api/rest-handlers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rotas da API REST
app.get('/api/departments', handleGetDepartments);
app.post('/api/departments', handleCreateDepartment);

app.get('/api/employees', handleGetEmployees);
app.post('/api/employees', handleCreateEmployee);

app.get('/api/vacations', handleGetVacations);
app.post('/api/vacations', handleCreateVacation);
app.put('/api/vacations/:id/status', handleUpdateVacationStatus);

app.post('/api/vacations/check-conflicts', handleCheckConflicts);
app.post('/api/vacations/suggest-dates', handleSuggestDates);

app.get('/api/dashboard/stats', handleGetDashboardStats);

// Arquivos estáticos em produção
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de Férias CLT rodando na porta ${PORT}`);
});
