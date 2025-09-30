"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTimeEntry = exports.updateTimeEntry = exports.calculateTimeTrackingStats = exports.getTimeEntriesForEmployee = exports.createTimeEntryInDatabase = exports.timeEntryExists = exports.validateTimeEntry = void 0;
const supabase_1 = require("../lib/supabase");
/**
 * Validates time entry data before creation
 * @param timeEntryData - The time entry data to validate
 * @returns Validation result with errors if any
 */
const validateTimeEntry = (timeEntryData) => {
    const errors = [];
    if (!timeEntryData.employee_id) {
        errors.push('Employee ID is required');
    }
    if (!timeEntryData.task_assignment_id) {
        errors.push('Task assignment ID is required');
    }
    if (!timeEntryData.hours || timeEntryData.hours <= 0) {
        errors.push('Hours must be greater than 0');
    }
    if (timeEntryData.hours && timeEntryData.hours > 24) {
        errors.push('Hours cannot exceed 24 per day');
    }
    if (!timeEntryData.entry_date) {
        errors.push('Entry date is required');
    }
    if (!timeEntryData.approved_by) {
        errors.push('Approved by is required');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validateTimeEntry = validateTimeEntry;
/**
 * Checks if a time entry already exists for a task assignment
 * @param taskAssignmentId - The task assignment ID to check
 * @returns Promise<boolean> - True if time entry exists
 */
const timeEntryExists = async (taskAssignmentId) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('time_entries')
            .select('id')
            .eq('task_assignment_id', taskAssignmentId)
            .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking time entry existence:', error);
            throw new Error(`Failed to check time entry existence: ${error.message}`);
        }
        return !!data;
    }
    catch (error) {
        console.error('Error in timeEntryExists:', error);
        throw error;
    }
};
exports.timeEntryExists = timeEntryExists;
/**
 * Creates a new time entry in the database
 * @param timeEntryData - The time entry data to create
 * @returns Promise<TimeEntry> - The created time entry
 */
const createTimeEntryInDatabase = async (timeEntryData) => {
    try {
        // Validate data
        const validation = (0, exports.validateTimeEntry)(timeEntryData);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        // Check if time entry already exists
        const exists = await (0, exports.timeEntryExists)(timeEntryData.task_assignment_id);
        if (exists) {
            throw new Error(`Time entry already exists for task assignment ${timeEntryData.task_assignment_id}`);
        }
        // Create the time entry
        const { data, error } = await supabase_1.supabase
            .from('time_entries')
            .insert({
            employee_id: timeEntryData.employee_id,
            task_assignment_id: timeEntryData.task_assignment_id,
            hours: timeEntryData.hours,
            entry_date: timeEntryData.entry_date,
            description: timeEntryData.description,
            approved_by: timeEntryData.approved_by,
            status: timeEntryData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error) {
            console.error('Error creating time entry:', error);
            throw new Error(`Failed to create time entry: ${error.message}`);
        }
        return data;
    }
    catch (error) {
        console.error('Error in createTimeEntryInDatabase:', error);
        throw error;
    }
};
exports.createTimeEntryInDatabase = createTimeEntryInDatabase;
/**
 * Gets time entries for an employee with optional filters
 * @param employeeId - The employee ID
 * @param filters - Optional filters (startDate, endDate, limit, offset)
 * @returns Promise<TimeEntry[]> - Array of time entries
 */
const getTimeEntriesForEmployee = async (employeeId, filters = {}) => {
    try {
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
        // Apply filters
        if (filters.startDate) {
            query = query.gte('entry_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('entry_date', filters.endDate);
        }
        // Apply pagination
        if (filters.limit || filters.offset) {
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            query = query.range(offset, offset + limit - 1);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching time entries:', error);
            throw new Error(`Failed to fetch time entries: ${error.message}`);
        }
        return data || [];
    }
    catch (error) {
        console.error('Error in getTimeEntriesForEmployee:', error);
        throw error;
    }
};
exports.getTimeEntriesForEmployee = getTimeEntriesForEmployee;
/**
 * Calculates time tracking statistics for an employee
 * @param employeeId - The employee ID
 * @param period - The time period ('week', 'month', 'year', 'all')
 * @returns Promise<TimeTrackingStats> - Time tracking statistics
 */
const calculateTimeTrackingStats = async (employeeId, period = 'month') => {
    try {
        // Calculate date range
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
        // Fetch time entries for the period
        const { data: timeEntries, error } = await supabase_1.supabase
            .from('time_entries')
            .select('hours, entry_date, status')
            .eq('employee_id', employeeId)
            .gte('entry_date', startDate.toISOString().split('T')[0])
            .eq('status', 'approved');
        if (error) {
            console.error('Error calculating time tracking stats:', error);
            throw new Error(`Failed to calculate time tracking stats: ${error.message}`);
        }
        // Calculate statistics
        const entries = timeEntries || [];
        const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
        const totalEntries = entries.length;
        const averageHoursPerEntry = totalEntries > 0 ? totalHours / totalEntries : 0;
        // Group by date for daily breakdown
        const dailyBreakdown = entries.reduce((acc, entry) => {
            const date = entry.entry_date;
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += entry.hours || 0;
            return acc;
        }, {});
        return {
            totalHours: Number(totalHours.toFixed(2)),
            totalEntries,
            averageHoursPerEntry: Number(averageHoursPerEntry.toFixed(2)),
            dailyBreakdown,
            dateRange: {
                start: startDate.toISOString().split('T')[0],
                end: now.toISOString().split('T')[0]
            }
        };
    }
    catch (error) {
        console.error('Error in calculateTimeTrackingStats:', error);
        throw error;
    }
};
exports.calculateTimeTrackingStats = calculateTimeTrackingStats;
/**
 * Updates an existing time entry
 * @param timeEntryId - The time entry ID to update
 * @param updates - The fields to update
 * @returns Promise<TimeEntry> - The updated time entry
 */
const updateTimeEntry = async (timeEntryId, updates) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('time_entries')
            .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
            .eq('id', timeEntryId)
            .select()
            .single();
        if (error) {
            console.error('Error updating time entry:', error);
            throw new Error(`Failed to update time entry: ${error.message}`);
        }
        return data;
    }
    catch (error) {
        console.error('Error in updateTimeEntry:', error);
        throw error;
    }
};
exports.updateTimeEntry = updateTimeEntry;
/**
 * Deletes a time entry (soft delete by updating status)
 * @param timeEntryId - The time entry ID to delete
 * @returns Promise<void>
 */
const deleteTimeEntry = async (timeEntryId) => {
    try {
        const { error } = await supabase_1.supabase
            .from('time_entries')
            .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
        })
            .eq('id', timeEntryId);
        if (error) {
            console.error('Error deleting time entry:', error);
            throw new Error(`Failed to delete time entry: ${error.message}`);
        }
    }
    catch (error) {
        console.error('Error in deleteTimeEntry:', error);
        throw error;
    }
};
exports.deleteTimeEntry = deleteTimeEntry;
