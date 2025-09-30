"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeEntry = exports.calculateWorkedHours = exports.getEmployeeTimeEntries = exports.createTimeEntryForApprovedTask = void 0;
const supabase_1 = require("../lib/supabase");
/**
 * Time Tracking Controller
 * Handles creation and management of time entries when tasks are approved
 */
/**
 * Creates a time entry for an approved task
 * @param taskAssignmentId - The ID of the approved task assignment
 * @param approvedBy - The ID of the admin who approved the task
 * @returns Promise<TimeEntry | null>
 */
const createTimeEntryForApprovedTask = async (taskAssignmentId, approvedBy) => {
    try {
        // Get task assignment with template information
        const { data: taskAssignment, error: taskError } = await supabase_1.supabase
            .from('task_assignments')
            .select(`
        *,
        task_templates (
          id,
          title,
          estimated_hours
        ),
        profiles (
          id,
          first_name,
          last_name
        )
      `)
            .eq('id', taskAssignmentId)
            .single();
        if (taskError) {
            console.error('Error fetching task assignment:', taskError);
            throw new Error(`Failed to fetch task assignment: ${taskError.message}`);
        }
        if (!taskAssignment) {
            throw new Error('Task assignment not found');
        }
        if (!taskAssignment.task_templates?.estimated_hours) {
            console.warn(`Task template ${taskAssignment.task_template_id} has no estimated hours`);
            return null;
        }
        // Check if time entry already exists for this task to prevent duplicates
        const { data: existingEntry, error: checkError } = await supabase_1.supabase
            .from('time_entries')
            .select('id')
            .eq('task_assignment_id', taskAssignmentId)
            .single();
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking existing time entry:', checkError);
            throw new Error(`Failed to check existing time entry: ${checkError.message}`);
        }
        if (existingEntry) {
            console.log(`Time entry already exists for task assignment ${taskAssignmentId}`);
            return existingEntry;
        }
        // Create new time entry
        const timeEntryData = {
            employee_id: taskAssignment.assignee_id,
            task_assignment_id: taskAssignmentId,
            hours: taskAssignment.task_templates.estimated_hours,
            entry_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
            description: `Task completed: ${taskAssignment.task_templates.title}`,
            approved_by: approvedBy,
            status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const { data: newTimeEntry, error: insertError } = await supabase_1.supabase
            .from('time_entries')
            .insert(timeEntryData)
            .select()
            .single();
        if (insertError) {
            console.error('Error creating time entry:', insertError);
            throw new Error(`Failed to create time entry: ${insertError.message}`);
        }
        console.log(`Time entry created successfully for task ${taskAssignmentId}: ${timeEntryData.hours} hours`);
        return newTimeEntry;
    }
    catch (error) {
        console.error('Error in createTimeEntryForApprovedTask:', error);
        throw error;
    }
};
exports.createTimeEntryForApprovedTask = createTimeEntryForApprovedTask;
/**
 * Gets time entries for a specific employee
 * @param req - Express request object
 * @param res - Express response object
 */
const getEmployeeTimeEntries = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate, limit = 50, offset = 0 } = req.query;
        if (!employeeId) {
            res.status(400).json({
                success: false,
                error: 'Employee ID is required'
            });
            return;
        }
        let query = supabase_1.supabase
            .from('time_entries')
            .select(`
        *,
        task_assignments (
          id,
          task_templates (
            title
          )
        )
      `)
            .eq('employee_id', employeeId)
            .order('entry_date', { ascending: false });
        // Add date filters if provided
        if (startDate) {
            query = query.gte('entry_date', startDate);
        }
        if (endDate) {
            query = query.lte('entry_date', endDate);
        }
        // Add pagination
        query = query.range(Number(offset), Number(offset) + Number(limit) - 1);
        const { data: timeEntries, error } = await query;
        if (error) {
            console.error('Error fetching time entries:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch time entries'
            });
            return;
        }
        res.json({
            success: true,
            data: timeEntries,
            pagination: {
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    catch (error) {
        console.error('Error in getEmployeeTimeEntries:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getEmployeeTimeEntries = getEmployeeTimeEntries;
/**
 * Calculates worked hours statistics for an employee
 * @param req - Express request object
 * @param res - Express response object
 */
const calculateWorkedHours = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { period = 'month' } = req.query; // 'week', 'month', 'year', 'all'
        if (!employeeId) {
            res.status(400).json({
                success: false,
                error: 'Employee ID is required'
            });
            return;
        }
        // Calculate date range based on period
        const now = new Date();
        let startDate;
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0); // All time
        }
        // Get time entries for the period
        const { data: timeEntries, error } = await supabase_1.supabase
            .from('time_entries')
            .select('hours, entry_date, status')
            .eq('employee_id', employeeId)
            .gte('entry_date', startDate.toISOString().split('T')[0])
            .eq('status', 'approved');
        if (error) {
            console.error('Error calculating worked hours:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate worked hours'
            });
            return;
        }
        // Calculate statistics
        const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;
        const totalEntries = timeEntries?.length || 0;
        const averageHoursPerEntry = totalEntries > 0 ? totalHours / totalEntries : 0;
        // Group by date for daily breakdown
        const dailyBreakdown = timeEntries?.reduce((acc, entry) => {
            const date = entry.entry_date;
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += entry.hours || 0;
            return acc;
        }, {}) || {};
        res.json({
            success: true,
            data: {
                period,
                totalHours: Number(totalHours.toFixed(2)),
                totalEntries,
                averageHoursPerEntry: Number(averageHoursPerEntry.toFixed(2)),
                dailyBreakdown,
                dateRange: {
                    start: startDate.toISOString().split('T')[0],
                    end: now.toISOString().split('T')[0]
                }
            }
        });
    }
    catch (error) {
        console.error('Error in calculateWorkedHours:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.calculateWorkedHours = calculateWorkedHours;
/**
 * API endpoint to create time entry (for manual creation if needed)
 * @param req - Express request object
 * @param res - Express response object
 */
const createTimeEntry = async (req, res) => {
    try {
        const { taskAssignmentId, approvedBy } = req.body;
        if (!taskAssignmentId || !approvedBy) {
            res.status(400).json({
                success: false,
                error: 'Task assignment ID and approved by are required'
            });
            return;
        }
        const timeEntry = await (0, exports.createTimeEntryForApprovedTask)(taskAssignmentId, approvedBy);
        res.json({
            success: true,
            data: timeEntry,
            message: timeEntry ? 'Time entry created successfully' : 'No time entry created (no estimated hours)'
        });
    }
    catch (error) {
        console.error('Error in createTimeEntry API:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.createTimeEntry = createTimeEntry;
