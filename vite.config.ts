import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import { defineConfig, Plugin } from 'vite';
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

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      const apiApp = express();
      apiApp.use(express.json());

      apiApp.get('/api/departments', handleGetDepartments);
      apiApp.post('/api/departments', handleCreateDepartment);

      apiApp.get('/api/employees', handleGetEmployees);
      apiApp.post('/api/employees', handleCreateEmployee);

      apiApp.get('/api/vacations', handleGetVacations);
      apiApp.post('/api/vacations', handleCreateVacation);
      apiApp.put('/api/vacations/:id/status', handleUpdateVacationStatus);

      apiApp.post('/api/vacations/check-conflicts', handleCheckConflicts);
      apiApp.post('/api/vacations/suggest-dates', handleSuggestDates);

      apiApp.get('/api/dashboard/stats', handleGetDashboardStats);

      server.middlewares.use(apiApp);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
