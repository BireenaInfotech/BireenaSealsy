require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
// Removed connect-flash to avoid util.isArray deprecation - using custom flash middleware instead
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./backend/config/database');
const { addTimezoneToLocals } = require('./backend/utils/timezone');

const app = express();

// Trust proxy - Required for secure cookies behind reverse proxies (Vercel, AWS, Nginx)
app.set('trust proxy', 1);

// Disable x-powered-by header
app.disable('x-powered-by');

// Disable console.log in production for security
if (process.env.NODE_ENV === 'production') {
    console.log = function() {};
}

// Security Headers with proper CSP for EJS templates
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Content Security Policy - Secure but allowing EJS inline scripts
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://fonts.googleapis.com https://vercel.live; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
        "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com data:; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://cdn.jsdelivr.net https://vercel.live wss://ws-us3.pusher.com; " +
        "frame-src 'self' https://vercel.live; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );
    // Disable client-side caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    // Remove server header
    res.removeHeader('X-Powered-By');
    next();
});

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(cookieParser());

// Session configuration with MongoDB store for persistent sessions (production-ready)
const sessionStore = MongoStore.create({
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

const PORT = process.env.PORT || 3000;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Don't exit the process
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Don't exit the process in development
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Export for Vercel
module.exports = app;
