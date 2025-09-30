import express from 'express';
import {
  getWorkerBalance,
  getWorkerTransactions,
  approveTaskPayment,
  createPayoutRequest,
  processPayoutRequest,
  getAllPayoutRequests
} from '../controllers/balance.controller';

const router = express.Router();

// Worker balance routes
router.get('/:workerId', getWorkerBalance);
router.get('/:workerId/transactions', getWorkerTransactions);

// Payment management routes (Admin)
router.post('/approve-task-payment', approveTaskPayment);
router.get('/payout-requests', getAllPayoutRequests);
router.post('/process-payout', processPayoutRequest);

// Payout request routes (Worker)
router.post('/request-payout', createPayoutRequest);

export default router;
