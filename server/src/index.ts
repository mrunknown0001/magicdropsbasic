import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug: Log environment variable status
console.log('Rate limiting is', process.env.RATE_LIMIT_MODE || 'DISABLED', '(' + process.env.RATE_LIMIT_MODE + ' mode)');
console.log('SMS Activate API configured with key:', process.env.SMS_ACTIVATE_API_KEY ? process.env.SMS_ACTIVATE_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('SMSPVA API configured with key:', process.env.SMSPVA_API_KEY ? process.env.SMSPVA_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('Anosim API configured with key:', process.env.ANOSIM_API_KEY ? process.env.ANOSIM_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('Resend API configured with key:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 5) + '...' : 'NOT SET');
console.log('Supabase client configured with URL:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL : 'NOT SET');

// Import middleware
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { apiLimiter, rentLimiter } from './middleware/rateLimit.middleware';

// Import controllers directly to create routes
import {
  getServicesAndCountries,
  rentNumber,
  getNumberStatus,
  cancelRental,
  extendRental,
  getActiveRentals,
  handleSmsWebhook,
  getAvailableProviders
} from './controllers/phone.controller';

import {
  syncSmspvaMessages,
  syncSingleSmspvaNumberEndpoint
} from './controllers/smspvaSync.controller';

import {
  syncAnosimMessages,
  syncSingleAnosimNumberEndpoint
} from './controllers/anosimSync.controller';

import {
  sendApplicationConfirmation,
  testEmail,
  emailHealthCheck,
  scheduleEmail,
  getEmailQueueStats,
  processEmailQueue,
  handleApplicationEmail,
  getEmailDelaySettings,
  updateEmailDelaySettings,
  resendApplicationEmail,
  approveApplication,
  rejectApplication
} from './controllers/email.controller';

import {
  previewReceiveSmsMessages,
  receiveSmsHealthCheck
} from './controllers/receiveSmsController';

// Import balance routes
import balanceRoutes from './routes/balance.routes';

// Import time tracking routes
import timeTrackingRoutes from './routes/timeTracking.routes';

// Import chat routes
import chatRoutes from './routes/chat.routes';
import aiKnowledgeRoutes from './routes/aiKnowledge.routes';
import { SchedulerService } from './services/scheduler.service';

// Import email scheduler
import { emailScheduler } from './services/email-scheduler.service';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Fix CORS configuration to be more permissive
const corsOptions = {
  origin: function (origin: any, callback: any) {
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
    if (!origin) return callback(null, true);
    
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

app.use(cors(corsOptions));

// Configure Helmet with more permissive settings for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false // Disable CSP for development
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Add CORS headers to all responses
app.use((req: Request, res: Response, next: NextFunction): void => {
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
    const { getServicesAndCountries } = await import('./controllers/phone.controller');
    await getServicesAndCountries(req as any, res as any, (err: any) => {
      if (err) {
        console.error('Debug SMS Activate API Error:', err);
        res.status(500).json({
          status: 'error',
          message: err.message,
          stack: err.stack
        });
      }
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Apply authentication middleware to API routes - REMOVED for phone routes to fix CORS issues
// app.use('/api/phone', (req: Request, res: Response, next: NextFunction) => {
//   authenticate(req, res, next);
// });

app.use('/api/email', (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, next);
});

app.use('/api/balance', (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, next);
});

// Create router with controller functions
const phoneRouter = express.Router();

// Define routes
phoneRouter.get('/services', getServicesAndCountries as any);
phoneRouter.get('/providers', getAvailableProviders as any);
phoneRouter.post('/rent', rentLimiter, rentNumber as any);
phoneRouter.get('/status/:id', getNumberStatus as any);
phoneRouter.post('/cancel/:id', cancelRental as any);
phoneRouter.post('/extend/:id', extendRental as any);
phoneRouter.get('/active', getActiveRentals as any);
phoneRouter.post('/webhook/sms', handleSmsWebhook as any);

// SMSPVA Sync Routes
phoneRouter.post('/sync/smspva', syncSmspvaMessages as any);
phoneRouter.post('/sync/smspva/:id', syncSingleSmspvaNumberEndpoint as any);

// Anosim Sync Routes
phoneRouter.post('/sync/anosim', syncAnosimMessages as any);
phoneRouter.post('/sync/anosim/:bookingId', syncSingleAnosimNumberEndpoint as any);

// Receive-SMS-Online Routes (avoid CORS)
phoneRouter.post('/receive-sms/preview', previewReceiveSmsMessages as any);
phoneRouter.get('/receive-sms/health', receiveSmsHealthCheck as any);

// Create email router
const emailRouter = express.Router();

// Define email routes
emailRouter.post('/application-confirmation', sendApplicationConfirmation as any);
// emailRouter.post('/application', handleApplicationEmail as any); // Disabled - using manual approval emails
emailRouter.post('/resend', resendApplicationEmail as any);
emailRouter.get('/test', testEmail as any);
emailRouter.get('/health', emailHealthCheck as any);

// SCHEDULER ROUTES
emailRouter.post('/schedule', scheduleEmail as any);
emailRouter.get('/queue/stats', getEmailQueueStats as any);
emailRouter.post('/queue/process', processEmailQueue as any);

// EMAIL SETTINGS ROUTES
emailRouter.get('/settings/delay', getEmailDelaySettings as any);
emailRouter.put('/settings/delay', updateEmailDelaySettings as any);

// MANUAL APPROVAL/REJECTION ROUTES
emailRouter.post('/approve-application', approveApplication as any);
emailRouter.post('/reject-application', rejectApplication as any);

// Use routers
app.use('/api/phone', phoneRouter);
app.use('/api/email', emailRouter);
app.use('/api/time-entries', timeTrackingRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-knowledge', aiKnowledgeRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
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
  SchedulerService.startFollowUpScheduler();
});

export default app;
