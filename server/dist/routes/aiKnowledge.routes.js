"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const aiKnowledge_controller_1 = require("../controllers/aiKnowledge.controller");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route POST /api/ai-knowledge/embeddings/:articleId
 * @desc Generate embeddings for a specific article
 * @access Admin only
 */
router.post('/embeddings/:articleId', aiKnowledge_controller_1.generateArticleEmbeddings);
/**
 * @route POST /api/ai-knowledge/search
 * @desc Semantic search using embeddings
 * @access Admin only
 */
router.post('/search', aiKnowledge_controller_1.searchKnowledgeWithEmbeddings);
/**
 * @route GET /api/ai-knowledge/analytics
 * @desc Get AI knowledge usage analytics
 * @access Admin only
 */
router.get('/analytics', aiKnowledge_controller_1.getAIAnalytics);
/**
 * @route PUT /api/ai-knowledge/effectiveness/:articleId
 * @desc Update article AI effectiveness score
 * @access Admin only
 */
router.put('/effectiveness/:articleId', aiKnowledge_controller_1.updateAIEffectiveness);
/**
 * @route GET /api/ai-knowledge/export
 * @desc Export AI training data
 * @access Admin only
 */
router.get('/export', aiKnowledge_controller_1.exportTrainingData);
/**
 * @route POST /api/ai-knowledge/optimize
 * @desc Optimize knowledge context for AI
 * @access Admin only
 */
router.post('/optimize', aiKnowledge_controller_1.optimizeKnowledgeContext);
exports.default = router;
