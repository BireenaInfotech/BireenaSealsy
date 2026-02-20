require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const compression = require('compression');
// Removed connect-flash to avoid util.isArray deprecation - using custom flash middleware instead
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./backend/config/database');
const { addTimezoneToLocals } = require('./backend/utils/timezone');

// 🔒 SECURITY MIDDLEWARE IMPORTS
const {
    helmetConfig,
    globalLimiter,
    sanitizeInput,
    hppProtection,
    cspNonceGenerator,
    securityLogger,
    sanitizeRequest,
    noCache,
    productionErrorHandler
} = require('./backend/middleware/security');

const {
    forceHTTPS,
    httpsSecurityHeaders,
    preventOpenRedirect,
    secureMethodOverride
} = require('./backend/middleware/https-security');

const app = express();

// Trust proxy - Required for secure cookies behind reverse proxies (Vercel, AWS, Nginx)
app.set('trust proxy', 1);

// Disable x-powered-by header
app.disable('x-powered-by');

// NOTE: console suppression removed - needed for Vercel crash debugging
// Vercel captures all stdout/stderr in function logs

// 🔒 HTTPS ENFORCEMENT: Force HTTPS in production
app.use(forceHTTPS);

// 🔒 HTTPS SECURITY HEADERS: Additional HTTPS headers
app.use(httpsSecurityHeaders);

// 🔒 PREVENT OPEN REDIRECTS: Validate redirect URLs
app.use(preventOpenRedirect);

// 🔒 SECURE METHOD OVERRIDE: Prevent method override attacks
app.use(secureMethodOverride);

// 🔒 HELMET: Advanced Security Headers
app.use(helmetConfig);

// 🔒 GLOBAL RATE LIMITING: DDoS Protection
app.use(globalLimiter);

// 🔒 COMPRESSION: Gzip compression for better performance
app.use(compression());

// 🔒 CSP NONCE: Generate nonce for CSP
app.use(cspNonceGenerator);

// 🔒 SECURITY LOGGER: Log suspicious activities
app.use(securityLogger);

// 🔒 NO CACHE: Prevent caching of sensitive pages
app.use(noCache);

// Import routes
const authRoutes = require('./backend/routes/auth');
const dashboardRoutes = require('./backend/routes/dashboard');
const inventoryRoutes = require('./backend/routes/inventory');
const salesRoutes = require('./backend/routes/sales');
const discountRoutes = require('./backend/routes/discount');
const billRoutes = require('./backend/routes/bill');
const reportsRoutes = require('./backend/routes/reports');
const employeesRoutes = require('./backend/routes/employees');
const employeeActivityRoutes = require('./backend/routes/employee-activity');
const contactRoutes = require('./backend/routes/contact');
const profileRoutes = require('./backend/routes/profile');
const inventoryReportRoutes = require('./backend/routes/inventory-report');
const expenseRoutes = require('./backend/routes/expenses');
const gstReportsRoutes = require('./backend/routes/gst-reports');
// Hidden routes (superadmin-only)
const hiddenRoutes = require('./backend/routes/hidden');

// MongoDB connection - Connect immediately in all environments
// This is required for session store initialization
connectDB().catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
    // Don't exit process, let requests trigger reconnection
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend/views'));
app.use(express.static(path.join(__dirname, 'frontend/public')));
app.use('/components', express.static(path.join(__dirname, 'frontend/components')));

// 🔒 BODY PARSER: Parse incoming requests with size limits
app.use(bodyParser.urlencoded({ 
    extended: true,
    limit: '10mb', // Prevent large payload attacks
    parameterLimit: 1000 // Limit number of parameters
}));
app.use(bodyParser.json({ 
    limit: '10mb' // Prevent large JSON payload attacks
}));

// 🔒 MONGO SANITIZE: Prevent NoSQL injection
app.use(sanitizeInput);

// 🔒 HPP: HTTP Parameter Pollution Protection
app.use(hppProtection);

// 🔒 SANITIZE REQUEST: Clean all user inputs
app.use(sanitizeRequest);

app.use(methodOverride('_method'));
app.use(cookieParser());

// Session configuration with MongoDB store for persistent sessions (production-ready)
let sessionStore;
try {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI not set - using memory store');
    }
    sessionStore = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600, // Lazy session update (24 hours)
        ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
        autoRemove: 'native',
        collectionName: 'sessions',
        stringify: false // Don't stringify session data
    });
    // Log store errors
    sessionStore.on('error', function(error) {
        console.error('Session store error:', error);
    });
} catch (e) {
    console.error('⚠️ MongoStore init failed, using memory session store:', e.message);
    sessionStore = undefined; // express-session uses memory store when undefined
}

const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Custom session cookie name
    store: sessionStore,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-site for production
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser decide
    },
    proxy: true, // Trust the reverse proxy
    rolling: true, // Reset cookie expiration on each request
    unset: 'destroy' // Destroy session on unset
};

app.use(session(sessionConfig));

// Custom flash middleware to avoid util.isArray deprecation
app.use((req, res, next) => {
    if (!req.session.flash) {
        req.session.flash = {};
    }
    req.flash = function(type, message) {
        if (message === undefined) {
            const msg = req.session.flash[type];
            delete req.session.flash[type];
            return Array.isArray(msg) ? msg : [msg].filter(Boolean);
        }
        if (!req.session.flash[type]) {
            req.session.flash[type] = [];
        }
        if (Array.isArray(req.session.flash[type])) {
            req.session.flash[type].push(message);
        }
        return req.session.flash[type];
    };
    next();
});

// Timezone helper middleware (adds formatToIST, formatForBill to all EJS views)
app.use(addTimezoneToLocals);

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
});

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/sales', salesRoutes);
app.use('/discount', discountRoutes);
app.use('/bill', billRoutes);
app.use('/reports', reportsRoutes);
app.use('/employees', employeesRoutes);
app.use('/employee-activity', employeeActivityRoutes);
app.use('/contact', contactRoutes);
app.use('/api/contact', contactRoutes);
app.use('/profile', profileRoutes);
app.use('/inventory-report', inventoryReportRoutes);
app.use('/expenses', expenseRoutes);
app.use('/gst-reports', gstReportsRoutes);

// Mount hidden route under a non-obvious path. Protects admin creation behind env credentials.
app.use('/.hidden', hiddenRoutes);

// 🔒 PRODUCTION ERROR HANDLER: Hide error details in production
app.use(productionErrorHandler);

const PORT = process.env.PORT || 3000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error('Unhandled Promise Rejection:', err);
    }
    // Don't exit the process
});

// Handle uncaught exceptions - NEVER exit in serverless (Vercel)
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    // Do NOT call process.exit() - Vercel serverless must stay alive
});

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel - MUST be at the end
module.exports = app;
