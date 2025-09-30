import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware';
import {
  createConversation,
  getMessages,
  sendMessage,
  uploadAttachment,
  getConversations
} from '../controllers/chat.controller';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Rate limiting for AI requests
const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many AI requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for file uploads
const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 uploads per 5 minutes
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/chat/conversations
 * @desc Get all conversations for the authenticated user
 * @access Private
 */
router.get('/conversations', getConversations);

/**
 * @route POST /api/chat/conversations
 * @desc Create a new conversation or get existing one
 * @access Private
 */
router.post('/conversations', createConversation);

/**
 * @route GET /api/chat/conversations/:conversationId/messages
 * @desc Get messages for a specific conversation
 * @access Private
 */
router.get('/conversations/:conversationId/messages', getMessages);

/**
 * @route POST /api/chat/messages
 * @desc Send a message and get AI response
 * @access Private
 */
router.post('/messages', aiRateLimit, sendMessage);

/**
 * @route POST /api/chat/upload
 * @desc Upload file attachment to chat
 * @access Private
 */
router.post('/upload', uploadRateLimit, upload.single('file'), uploadAttachment);

// Note: Auto-reply is now integrated into the regular sendMessage flow

export default router;
