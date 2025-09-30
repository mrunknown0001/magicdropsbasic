"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const timeTracking_controller_1 = require("../controllers/timeTracking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * Time Tracking Routes
 * All routes require authentication
 */
/**
 * POST /api/time-entries/create
 * Creates a time entry for an approved task
 * Body: { taskAssignmentId: string, approvedBy: string }
 */
router.post('/create', auth_middleware_1.authenticate, timeTracking_controller_1.createTimeEntry);
/**
 * GET /api/time-entries/employee/:employeeId
 * Gets time entries for a specific employee
 * Query params: startDate?, endDate?, limit?, offset?
 */
router.get('/employee/:employeeId', auth_middleware_1.authenticate, timeTracking_controller_1.getEmployeeTimeEntries);
/**
 * GET /api/time-entries/stats/:employeeId
 * Calculates worked hours statistics for an employee
 * Query params: period? (week|month|year|all)
 */
router.get('/stats/:employeeId', auth_middleware_1.authenticate, timeTracking_controller_1.calculateWorkedHours);
exports.default = router;
