"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables first
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Debug: Log environment variable status
console.log('Rate limiting is', process.env.RATE_LIMIT_MODE || 'DISABLED', '(' + process.env.RATE_LIMIT_MODE + ' mode)');
console.log('SMS Activate API configured with key:', process.env.SMS_ACTIVATE_API_KEY ? process.env.SMS_ACTIVATE_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('SMSPVA API configured with key:', process.env.SMSPVA_API_KEY ? process.env.SMSPVA_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('Anosim API configured with key:', process.env.ANOSIM_API_KEY ? process.env.ANOSIM_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('Resend API configured with key:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('Supabase client configured with URL:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL : 'NOT SET');
// Import middleware
const auth_middleware_1 = require("./middleware/auth.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
// Import controllers directly to create routes
const phone_controller_1 = require("./controllers/phone.controller");
const smspvaSync_controller_1 = require("./controllers/smspvaSync.controller");
const anosimSync_controller_1 = require("./controllers/anosimSync.controller");
const email_controller_1 = require("./controllers/email.controller");
const receiveSmsController_1 = require("./controllers/receiveSmsController");
// Import balance routes
const balance_routes_1 = __importDefault(require("./routes/balance.routes"));
// Import time tracking routes
const timeTracking_routes_1 = __importDefault(require("./routes/timeTracking.routes"));
// Import chat routes
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const aiKnowledge_routes_1 = __importDefault(require("./routes/aiKnowledge.routes"));
const scheduler_service_1 = require("./services/scheduler.service");
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
// Fix CORS configuration to be more permissive
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests from localhost (development) and any origin
        // For production, you should restrict this to your frontend domain
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:4173',
            'https://magicsuite.pro',
            'https://www.magicsuite.pro'
        ];
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        // Allow any localhost origin or specific allowed origins
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // For production, allow your actual domain
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
// Configure Helmet with more permissive settings for development
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    contentSecurityPolicy: false // Disable CSP for development
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
// Add CORS headers to all responses
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,Origin,X-Requested-With,Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
// Debug endpoint to check API key
app.get('/debug/api-key', (req, res) => {
    const apiKey = process.env.SMS_ACTIVATE_API_KEY;
    res.status(200).json({
        status: 'ok',
        apiKeyConfigured: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 5) + '...' : 'not set'
    });
});
// Debug endpoint to test SMS Activate API
app.get('/debug/sms-activate', async (req, res) => {
    try {
        const { getServicesAndCountries } = await Promise.resolve().then(() => __importStar(require('./controllers/phone.controller')));
        await getServicesAndCountries(req, res, (err) => {
            if (err) {
                console.error('Debug SMS Activate API Error:', err);
                res.status(500).json({
                    status: 'error',
                    message: err.message,
                    stack: err.stack
                });
            }
        });
    }
    catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    }
});
// Apply rate limiting to API routes
app.use('/api', rateLimit_middleware_1.apiLimiter);
// Apply authentication middleware to API routes - REMOVED for phone routes to fix CORS issues
// app.use('/api/phone', (req: Request, res: Response, next: NextFunction) => {
//   authenticate(req, res, next);
// });
app.use('/api/email', (req, res, next) => {
    (0, auth_middleware_1.authenticate)(req, res, next);
});
app.use('/api/balance', (req, res, next) => {
    (0, auth_middleware_1.authenticate)(req, res, next);
});
// Create router with controller functions
const phoneRouter = express_1.default.Router();
// Define routes
phoneRouter.get('/services', phone_controller_1.getServicesAndCountries);
phoneRouter.get('/providers', phone_controller_1.getAvailableProviders);
phoneRouter.post('/rent', rateLimit_middleware_1.rentLimiter, phone_controller_1.rentNumber);
phoneRouter.get('/status/:id', phone_controller_1.getNumberStatus);
phoneRouter.post('/cancel/:id', phone_controller_1.cancelRental);
phoneRouter.post('/extend/:id', phone_controller_1.extendRental);
phoneRouter.get('/active', phone_controller_1.getActiveRentals);
phoneRouter.post('/webhook/sms', phone_controller_1.handleSmsWebhook);
// SMSPVA Sync Routes
phoneRouter.post('/sync/smspva', smspvaSync_controller_1.syncSmspvaMessages);
phoneRouter.post('/sync/smspva/:id', smspvaSync_controller_1.syncSingleSmspvaNumberEndpoint);
// Anosim Sync Routes
phoneRouter.post('/sync/anosim', anosimSync_controller_1.syncAnosimMessages);
phoneRouter.post('/sync/anosim/:bookingId', anosimSync_controller_1.syncSingleAnosimNumberEndpoint);
// Receive-SMS-Online Routes (avoid CORS)
phoneRouter.post('/receive-sms/preview', receiveSmsController_1.previewReceiveSmsMessages);
phoneRouter.get('/receive-sms/health', receiveSmsController_1.receiveSmsHealthCheck);
// Create email router
const emailRouter = express_1.default.Router();
// Define email routes
emailRouter.post('/application-confirmation', email_controller_1.sendApplicationConfirmation);
// emailRouter.post('/application', handleApplicationEmail as any); // Disabled - using manual approval emails
emailRouter.post('/resend', email_controller_1.resendApplicationEmail);
emailRouter.get('/test', email_controller_1.testEmail);
emailRouter.get('/health', email_controller_1.emailHealthCheck);
// SCHEDULER ROUTES
emailRouter.post('/schedule', email_controller_1.scheduleEmail);
emailRouter.get('/queue/stats', email_controller_1.getEmailQueueStats);
emailRouter.post('/queue/process', email_controller_1.processEmailQueue);
// EMAIL SETTINGS ROUTES
emailRouter.get('/settings/delay', email_controller_1.getEmailDelaySettings);
emailRouter.put('/settings/delay', email_controller_1.updateEmailDelaySettings);
// MANUAL APPROVAL/REJECTION ROUTES
emailRouter.post('/approve-application', email_controller_1.approveApplication);
emailRouter.post('/reject-application', email_controller_1.rejectApplication);
// Use routers
app.use('/api/phone', phoneRouter);
app.use('/api/email', emailRouter);
app.use('/api/time-entries', timeTracking_routes_1.default);
app.use('/api/balance', balance_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/ai-knowledge', aiKnowledge_routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    (0, error_middleware_1.errorHandler)(err, req, res, next);
});
// Email scheduler disabled - using manual approval emails
// console.log('Starting email scheduler...');
// emailScheduler.start(5); // Check every 5 minutes
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    // emailScheduler.stop(); // Disabled - using manual approval emails
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    // emailScheduler.stop(); // Disabled - using manual approval emails
    process.exit(0);
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Email scheduler disabled - using manual approval emails`);
    // Start follow-up scheduler for automatic follow-up messages
    scheduler_service_1.SchedulerService.startFollowUpScheduler();
});
exports.default = app;
