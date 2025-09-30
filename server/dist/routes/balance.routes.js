"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const balance_controller_1 = require("../controllers/balance.controller");
const router = express_1.default.Router();
// Worker balance routes
router.get('/:workerId', balance_controller_1.getWorkerBalance);
router.get('/:workerId/transactions', balance_controller_1.getWorkerTransactions);
// Payment management routes (Admin)
router.post('/approve-task-payment', balance_controller_1.approveTaskPayment);
router.get('/payout-requests', balance_controller_1.getAllPayoutRequests);
router.post('/process-payout', balance_controller_1.processPayoutRequest);
// Payout request routes (Worker)
router.post('/request-payout', balance_controller_1.createPayoutRequest);
exports.default = router;
