import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateArticleEmbeddings,
  searchKnowledgeWithEmbeddings,
  getAIAnalytics,
  updateAIEffectiveness,
  exportTrainingData,
  optimizeKnowledgeContext
} from '../controllers/aiKnowledge.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/ai-knowledge/embeddings/:articleId
 * @desc Generate embeddings for a specific article
 * @access Admin only
 */
router.post('/embeddings/:articleId', generateArticleEmbeddings);

/**
 * @route POST /api/ai-knowledge/search
 * @desc Semantic search using embeddings
 * @access Admin only
 */
router.post('/search', searchKnowledgeWithEmbeddings);

/**
 * @route GET /api/ai-knowledge/analytics
 * @desc Get AI knowledge usage analytics
 * @access Admin only
 */
router.get('/analytics', getAIAnalytics);

/**
 * @route PUT /api/ai-knowledge/effectiveness/:articleId
 * @desc Update article AI effectiveness score
 * @access Admin only
 */
router.put('/effectiveness/:articleId', updateAIEffectiveness);

/**
 * @route GET /api/ai-knowledge/export
 * @desc Export AI training data
 * @access Admin only
 */
router.get('/export', exportTrainingData);

/**
 * @route POST /api/ai-knowledge/optimize
 * @desc Optimize knowledge context for AI
 * @access Admin only
 */
router.post('/optimize', optimizeKnowledgeContext);

export default router;
