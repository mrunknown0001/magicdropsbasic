"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPayoutRequests = exports.processPayoutRequest = exports.createPayoutRequest = exports.approveTaskPayment = exports.getWorkerTransactions = exports.getWorkerBalance = void 0;
const supabase_1 = require("../lib/supabase");
/**
 * Balance Management Controller
 * Handles all payment-related operations for Vergütung mode
 */
/**
 * Get worker balance
 * GET /api/balance/:workerId
 */
const getWorkerBalance = async (req, res, next) => {
    try {
        const { workerId } = req.params;
        if (!workerId) {
            return res.status(400).json({
                status: 'error',
                message: 'Worker ID is required'
            });
        }
        // Get or create worker balance record
        let { data: balance, error } = await supabase_1.supabase
            .from('worker_balances')
            .select('*')
            .eq('worker_id', workerId)
            .single();
        if (error && error.code === 'PGRST116') {
            // No balance record exists, create one
            const { data: newBalance, error: createError } = await supabase_1.supabase
                .from('worker_balances')
                .insert({
                worker_id: workerId,
                current_balance: 0.00,
                total_earned: 0.00,
                total_paid_out: 0.00
            })
                .select()
                .single();
            if (createError) {
                console.error('Error creating worker balance:', createError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create worker balance'
                });
            }
            balance = newBalance;
        }
        else if (error) {
            console.error('Error fetching worker balance:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch worker balance'
            });
        }
        res.json({
            status: 'success',
            data: balance
        });
    }
    catch (error) {
        console.error('Error in getWorkerBalance:', error);
        next(error);
    }
};
exports.getWorkerBalance = getWorkerBalance;
/**
 * Get worker payment transactions
 * GET /api/balance/:workerId/transactions
 */
const getWorkerTransactions = async (req, res, next) => {
    try {
        const { workerId } = req.params;
        const { limit = 50, offset = 0, type } = req.query;
        if (!workerId) {
            return res.status(400).json({
                status: 'error',
                message: 'Worker ID is required'
            });
        }
        let query = supabase_1.supabase
            .from('payment_transactions')
            .select(`
        *,
        task_assignments (
          id,
          task_templates (
            title
          )
        ),
        payout_requests (
          id,
          amount,
          status
        )
      `)
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false });
        // Filter by transaction type if specified
        if (type && ['task_payment', 'payout', 'adjustment'].includes(type)) {
            query = query.eq('transaction_type', type);
        }
        // Add pagination
        query = query.range(Number(offset), Number(offset) + Number(limit) - 1);
        const { data: transactions, error } = await query;
        if (error) {
            console.error('Error fetching transactions:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch transactions'
            });
        }
        res.json({
            status: 'success',
            data: transactions,
            pagination: {
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    catch (error) {
        console.error('Error in getWorkerTransactions:', error);
        next(error);
    }
};
exports.getWorkerTransactions = getWorkerTransactions;
/**
 * Approve task payment (Admin only)
 * POST /api/balance/approve-task-payment
 */
const approveTaskPayment = async (req, res, next) => {
    try {
        const { taskAssignmentId, approvedBy } = req.body;
        if (!taskAssignmentId || !approvedBy) {
            return res.status(400).json({
                status: 'error',
                message: 'Task assignment ID and approver ID are required'
            });
        }
        // Get task assignment with template info
        const { data: taskAssignment, error: taskError } = await supabase_1.supabase
            .from('task_assignments')
            .select(`
        *,
        task_templates (
          id,
          title,
          payment_amount
        ),
        profiles (
          id,
          first_name,
          last_name
        )
      `)
            .eq('id', taskAssignmentId)
            .single();
        if (taskError || !taskAssignment) {
            return res.status(404).json({
                status: 'error',
                message: 'Task assignment not found'
            });
        }
        // Check if already approved
        if (taskAssignment.payment_status === 'approved' || taskAssignment.payment_status === 'paid') {
            return res.status(400).json({
                status: 'error',
                message: 'Payment already approved for this task'
            });
        }
        // Calculate payment amount (custom amount or template amount)
        const paymentAmount = taskAssignment.custom_payment_amount || taskAssignment.task_templates?.payment_amount || 0;
        if (paymentAmount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No payment amount configured for this task'
            });
        }
        // Start transaction
        const { data: updatedAssignment, error: updateError } = await supabase_1.supabase
            .from('task_assignments')
            .update({
            payment_status: 'approved',
            payment_approved_at: new Date().toISOString(),
            payment_approved_by: approvedBy
        })
            .eq('id', taskAssignmentId)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating task assignment:', updateError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to approve payment'
            });
        }
        // Create payment transaction
        const { data: transaction, error: transactionError } = await supabase_1.supabase
            .from('payment_transactions')
            .insert({
            worker_id: taskAssignment.assignee_id,
            task_assignment_id: taskAssignmentId,
            transaction_type: 'task_payment',
            amount: paymentAmount,
            description: `Task completed: ${taskAssignment.task_templates?.title}`,
            created_by: approvedBy
        })
            .select()
            .single();
        if (transactionError) {
            console.error('Error creating transaction:', transactionError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to create payment transaction'
            });
        }
        // Update worker balance
        await updateWorkerBalance(taskAssignment.assignee_id, paymentAmount);
        res.json({
            status: 'success',
            message: 'Task payment approved successfully',
            data: {
                taskAssignment: updatedAssignment,
                transaction,
                paymentAmount
            }
        });
    }
    catch (error) {
        console.error('Error in approveTaskPayment:', error);
        next(error);
    }
};
exports.approveTaskPayment = approveTaskPayment;
/**
 * Create payout request (Worker)
 * POST /api/balance/request-payout
 */
const createPayoutRequest = async (req, res, next) => {
    try {
        const { workerId, amount, paymentMethod } = req.body;
        if (!workerId || !amount || amount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Worker ID and valid amount are required'
            });
        }
        // Get worker balance
        const { data: balance, error: balanceError } = await supabase_1.supabase
            .from('worker_balances')
            .select('current_balance')
            .eq('worker_id', workerId)
            .single();
        if (balanceError || !balance) {
            return res.status(404).json({
                status: 'error',
                message: 'Worker balance not found'
            });
        }
        // Check if sufficient balance
        if (balance.current_balance < amount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient balance for payout request'
            });
        }
        // Create payout request
        const { data: payoutRequest, error: requestError } = await supabase_1.supabase
            .from('payout_requests')
            .insert({
            worker_id: workerId,
            amount,
            payment_method: paymentMethod || null,
            status: 'pending'
        })
            .select()
            .single();
        if (requestError) {
            console.error('Error creating payout request:', requestError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to create payout request'
            });
        }
        res.json({
            status: 'success',
            message: 'Payout request created successfully',
            data: payoutRequest
        });
    }
    catch (error) {
        console.error('Error in createPayoutRequest:', error);
        next(error);
    }
};
exports.createPayoutRequest = createPayoutRequest;
/**
 * Process payout request (Admin only)
 * POST /api/balance/process-payout
 */
const processPayoutRequest = async (req, res, next) => {
    try {
        const { payoutRequestId, action, reviewedBy, rejectionReason, adminNotes } = req.body;
        if (!payoutRequestId || !action || !reviewedBy) {
            return res.status(400).json({
                status: 'error',
                message: 'Payout request ID, action, and reviewer ID are required'
            });
        }
        if (!['approve', 'reject', 'mark_paid'].includes(action)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid action. Must be approve, reject, or mark_paid'
            });
        }
        // Get payout request
        const { data: payoutRequest, error: requestError } = await supabase_1.supabase
            .from('payout_requests')
            .select('*')
            .eq('id', payoutRequestId)
            .single();
        if (requestError || !payoutRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'Payout request not found'
            });
        }
        let updateData = {
            reviewed_by: reviewedBy,
            reviewed_at: new Date().toISOString(),
            admin_notes: adminNotes || null
        };
        if (action === 'approve') {
            updateData.status = 'approved';
        }
        else if (action === 'reject') {
            updateData.status = 'rejected';
            updateData.rejection_reason = rejectionReason || null;
        }
        else if (action === 'mark_paid') {
            if (payoutRequest.status !== 'approved') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Can only mark approved requests as paid'
                });
            }
            updateData.status = 'paid';
            // Create payout transaction and update balance
            const { error: transactionError } = await supabase_1.supabase
                .from('payment_transactions')
                .insert({
                worker_id: payoutRequest.worker_id,
                payout_request_id: payoutRequestId,
                transaction_type: 'payout',
                amount: -payoutRequest.amount, // Negative for payout
                description: `Payout processed: €${payoutRequest.amount}`,
                created_by: reviewedBy
            });
            if (transactionError) {
                console.error('Error creating payout transaction:', transactionError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create payout transaction'
                });
            }
            // Update worker balance
            await updateWorkerBalance(payoutRequest.worker_id, -payoutRequest.amount);
        }
        // Update payout request
        const { data: updatedRequest, error: updateError } = await supabase_1.supabase
            .from('payout_requests')
            .update(updateData)
            .eq('id', payoutRequestId)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating payout request:', updateError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to update payout request'
            });
        }
        res.json({
            status: 'success',
            message: `Payout request ${action}d successfully`,
            data: updatedRequest
        });
    }
    catch (error) {
        console.error('Error in processPayoutRequest:', error);
        next(error);
    }
};
exports.processPayoutRequest = processPayoutRequest;
/**
 * Get all payout requests (Admin only)
 * GET /api/balance/payout-requests
 */
const getAllPayoutRequests = async (req, res, next) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        let query = supabase_1.supabase
            .from('payout_requests')
            .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          email
        )
      `)
            .order('requested_at', { ascending: false });
        // Filter by status if specified
        if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
            query = query.eq('status', status);
        }
        // Add pagination
        query = query.range(Number(offset), Number(offset) + Number(limit) - 1);
        const { data: requests, error } = await query;
        if (error) {
            console.error('Error fetching payout requests:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch payout requests'
            });
        }
        res.json({
            status: 'success',
            data: requests,
            pagination: {
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    catch (error) {
        console.error('Error in getAllPayoutRequests:', error);
        next(error);
    }
};
exports.getAllPayoutRequests = getAllPayoutRequests;
/**
 * Helper function to update worker balance
 */
async function updateWorkerBalance(workerId, amountChange) {
    try {
        // Get current balance
        const { data: currentBalance, error: balanceError } = await supabase_1.supabase
            .from('worker_balances')
            .select('*')
            .eq('worker_id', workerId)
            .single();
        if (balanceError) {
            console.error('Error fetching current balance:', balanceError);
            throw balanceError;
        }
        // Calculate new values
        const newCurrentBalance = Number(currentBalance.current_balance) + amountChange;
        const newTotalEarned = amountChange > 0
            ? Number(currentBalance.total_earned) + amountChange
            : currentBalance.total_earned;
        const newTotalPaidOut = amountChange < 0
            ? Number(currentBalance.total_paid_out) + Math.abs(amountChange)
            : currentBalance.total_paid_out;
        // Update balance
        const { error: updateError } = await supabase_1.supabase
            .from('worker_balances')
            .update({
            current_balance: newCurrentBalance,
            total_earned: newTotalEarned,
            total_paid_out: newTotalPaidOut
        })
            .eq('worker_id', workerId);
        if (updateError) {
            console.error('Error updating worker balance:', updateError);
            throw updateError;
        }
        console.log(`Updated balance for worker ${workerId}: ${amountChange > 0 ? '+' : ''}${amountChange}€`);
    }
    catch (error) {
        console.error('Error in updateWorkerBalance:', error);
        throw error;
    }
}
