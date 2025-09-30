import { Router } from 'express';
import { 
  createTimeEntry,
  getEmployeeTimeEntries,
  calculateWorkedHours
} from '../controllers/timeTracking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Time Tracking Routes
 * All routes require authentication
 */

/**
 * POST /api/time-entries/create
 * Creates a time entry for an approved task
 * Body: { taskAssignmentId: string, approvedBy: string }
 */
router.post('/create', authenticate, createTimeEntry);

/**
 * GET /api/time-entries/employee/:employeeId
 * Gets time entries for a specific employee
 * Query params: startDate?, endDate?, limit?, offset?
 */
router.get('/employee/:employeeId', authenticate, getEmployeeTimeEntries);

/**
 * GET /api/time-entries/stats/:employeeId
 * Calculates worked hours statistics for an employee
 * Query params: period? (week|month|year|all)
 */
router.get('/stats/:employeeId', authenticate, calculateWorkedHours);

export default router; 