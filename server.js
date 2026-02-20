// ══════════════════════════════════════════════════════════════════
// CRASH GUARD — Registered FIRST before any other code
// ══════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION:', err.message, '\nStack:', err.stack);
    // Do NOT exit
});
process.on('unhandledRejection', (reason) => {
    console.error('💥 UNHANDLED REJECTION:', reason);
});

require('dotenv').config();

// ── STARTUP ENV DIAGNOSTIC ─────────────────────────────────────
console.log('🚀 Server starting... NODE_ENV:', process.env.NODE_ENV || 'not set');
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
    console.error('❌ MISSING ENV VARS:', missing.join(', '));
} else {
    console.log('✅ All required env vars present');
}
// ──────────────────────────────────────────────────────────────

// Load all requires inside try/catch to expose crash location
let express, mongoose, session, MongoStore, bodyParser, compression,
    methodOverride, cookieParser, path, connectDB, addTimezoneToLocals,
    helmetConfig, globalLimiter, sanitizeInput, hppProtection,
    cspNonceGenerator, securityLogger, sanitizeRequest, noCache, productionErrorHandler,
    forceHTTPS, httpsSecurityHeaders, preventOpenRedirect, secureMethodOverride;

try {
    console.log('📦 Loading core modules...');
    express = require('express');
    mongoose = require('mongoose');
    session = require('express-session');
    MongoStore = require('connect-mongo');
    bodyParser = require('body-parser');
    compression = require('compression');
    methodOverride = require('method-override');
    cookieParser = require('cookie-parser');
    path = require('path');
    console.log('✅ Core modules loaded');
} catch(e) {
    console.error('💥 CRASH loading core modules:', e.message);
    throw e;
}

try {
    console.log('📦 Loading app modules...');
    connectDB = require('./backend/config/database');
    ({ addTimezoneToLocals } = require('./backend/utils/timezone'));
    console.log('✅ App modules loaded');
} catch(e) {
    console.error('💥 CRASH loading app modules:', e.message);
    throw e;
}

try {
    console.log('📦 Loading security middleware...');
    ({
        helmetConfig, globalLimiter, sanitizeInput, hppProtection,
        cspNonceGenerator, securityLogger, sanitizeRequest, noCache, productionErrorHandler
    } = require('./backend/middleware/security'));
    ({
        forceHTTPS, httpsSecurityHeaders, preventOpenRedirect, secureMethodOverride
    } = require('./backend/middleware/https-security'));
    console.log('✅ Security middleware loaded');
} catch(e) {
    console.error('💥 CRASH loading security middleware:', e.message);
    throw e;
}

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

// Import routes — each wrapped so a crash is identified precisely
let authRoutes, dashboardRoutes, inventoryRoutes, salesRoutes, discountRoutes,
    billRoutes, reportsRoutes, employeesRoutes, employeeActivityRoutes,
    contactRoutes, profileRoutes, inventoryReportRoutes, expenseRoutes,
    gstReportsRoutes, hiddenRoutes;
try {
    console.log('📦 Loading routes...');
    authRoutes            = require('./backend/routes/auth');
    dashboardRoutes       = require('./backend/routes/dashboard');
    inventoryRoutes       = require('./backend/routes/inventory');
    salesRoutes           = require('./backend/routes/sales');
    discountRoutes        = require('./backend/routes/discount');
    billRoutes            = require('./backend/routes/bill');
    reportsRoutes         = require('./backend/routes/reports');
    employeesRoutes       = require('./backend/routes/employees');
    employeeActivityRoutes= require('./backend/routes/employee-activity');
    contactRoutes         = require('./backend/routes/contact');
    profileRoutes         = require('./backend/routes/profile');
    inventoryReportRoutes = require('./backend/routes/inventory-report');
    expenseRoutes         = require('./backend/routes/expenses');
    gstReportsRoutes      = require('./backend/routes/gst-reports');
    hiddenRoutes          = require('./backend/routes/hidden');
    console.log('✅ All routes loaded');
} catch(e) {
    console.error('💥 CRASH loading routes:', e.message, e.stack);
    throw e;
}

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

// Note: uncaughtException and unhandledRejection handlers are registered
// at the TOP of this file (before any requires) for maximum crash coverage.

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel - MUST be at the end
module.exports = app;
