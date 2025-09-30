"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const chat_controller_1 = require("../controllers/chat.controller");
const router = express_1.default.Router();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        }
        else {
            cb(null, false);
        }
    }
});
// Rate limiting for AI requests
const aiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many AI requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});
// Rate limiting for file uploads
const uploadRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 uploads per 5 minutes
    message: 'Too many file uploads, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route GET /api/chat/conversations
 * @desc Get all conversations for the authenticated user
 * @access Private
 */
router.get('/conversations', chat_controller_1.getConversations);
/**
 * @route POST /api/chat/conversations
 * @desc Create a new conversation or get existing one
 * @access Private
 */
router.post('/conversations', chat_controller_1.createConversation);
/**
 * @route GET /api/chat/conversations/:conversationId/messages
 * @desc Get messages for a specific conversation
 * @access Private
 */
router.get('/conversations/:conversationId/messages', chat_controller_1.getMessages);
/**
 * @route POST /api/chat/messages
 * @desc Send a message and get AI response
 * @access Private
 */
router.post('/messages', aiRateLimit, chat_controller_1.sendMessage);
/**
 * @route POST /api/chat/upload
 * @desc Upload file attachment to chat
 * @access Private
 */
router.post('/upload', uploadRateLimit, upload.single('file'), chat_controller_1.uploadAttachment);
// Note: Auto-reply is now integrated into the regular sendMessage flow
exports.default = router;
