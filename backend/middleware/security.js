/**
 * 🔒 COMPREHENSIVE SECURITY MIDDLEWARE
 * Production-grade security for industry deployment
 * Protects against: XSS, SQL/NoSQL Injection, DDoS, CSRF, HPP, etc.
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const crypto = require('crypto');

/**
 * HELMET - Advanced Security Headers
 * Protects against common web vulnerabilities
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", // Required for EJS inline scripts
                "'unsafe-eval'", // Required for some libraries
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com",
                "https://vercel.live",
                // Add nonce-based CSP in production
                (req, res) => `'nonce-${res.locals.cspNonce}'`
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://fonts.gstatic.com",
                "data:"
            ],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://vercel.live",
                "wss://ws-us3.pusher.com"
            ],
            frameSrc: ["'self'", "https://vercel.live"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    // Clickjacking protection
    frameguard: {
        action: 'deny'
    },
    // Hide powered by header
    hidePoweredBy: true,
    // Prevent MIME type sniffing
    noSniff: true,
    // XSS Protection
    xssFilter: true,
    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: false
    },
    // Prevent browser caching of sensitive data
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
});

/**
 * RATE LIMITING - DDoS Protection
 * Multiple layers of protection
 */

// Global rate limiter - applies to all requests
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Max 1000 requests per 15 minutes per IP
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for trusted IPs (optional)
    skip: (req) => {
        const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];
        return trustedIPs.includes(req.ip);
    }
});

// Login rate limiter - strict for authentication
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 login attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, // Don't count successful logins
    standardHeaders: true,
    legacyHeaders: false
});

// API rate limiter - moderate for API endpoints
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Max 100 API calls per 10 minutes
    message: {
        success: false,
        message: 'Too many API requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Registration rate limiter
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 registrations per hour per IP
    message: {
        success: false,
        message: 'Too many accounts created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * MONGO SANITIZE - NoSQL Injection Protection
 * Removes $ and . characters from user input
 */
const sanitizeInput = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`⚠️ Potential injection attempt detected: ${key} from IP: ${req.ip}`);
    }
});

/**
 * HPP - HTTP Parameter Pollution Protection
 * Prevents parameter pollution attacks
 */
const hppProtection = hpp({
    whitelist: [
        // Add parameters that should allow duplicates
        'items',
        'selectedCustomers',
        'productIds'
    ]
});

/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens
 */
const csrfProtection = (req, res, next) => {
    // Skip CSRF for API endpoints with proper authentication
    if (req.path.startsWith('/api/') && req.headers['x-api-key']) {
        return next();
    }

    // Generate CSRF token for each session
    if (req.session && !req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }

    // Make token available to views
    res.locals.csrfToken = req.session.csrfToken;

    // Validate CSRF token for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const token = req.body._csrf || req.headers['x-csrf-token'];
        
        if (!token || token !== req.session.csrfToken) {
            console.warn(`⚠️ CSRF attack detected from IP: ${req.ip}`);
            return res.status(403).json({
                success: false,
                message: 'Invalid security token. Please refresh the page.'
            });
        }
    }

    next();
};

/**
 * CSP Nonce Generator
 * Generates unique nonce for Content Security Policy
 */
const cspNonceGenerator = (req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
};

/**
 * Security Logging Middleware
 * Logs suspicious activities
 */
const securityLogger = (req, res, next) => {
    // Log suspicious patterns
    const suspiciousPatterns = [
        /(\.\.|\/etc\/|\/proc\/|\\x|%00|<script|javascript:|onerror=)/i,
        /(union.*select|insert.*into|drop.*table|exec.*\(|eval\()/i
    ];

    const checkString = `${req.url}${JSON.stringify(req.body)}${JSON.stringify(req.query)}`;
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            console.error(`🚨 SECURITY ALERT - Suspicious request detected:
IP: ${req.ip}
User-Agent: ${req.headers['user-agent']}
Method: ${req.method}
URL: ${req.url}
Pattern: ${pattern}
Time: ${new Date().toISOString()}`);
            
            // In production, you might want to block the request
            if (process.env.BLOCK_SUSPICIOUS_REQUESTS === 'true') {
                return res.status(403).json({
                    success: false,
                    message: 'Request blocked for security reasons.'
                });
            }
        }
    }
    
    next();
};

/**
 * Input Sanitization Helper
 * Sanitizes user input to prevent XSS
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
};

/**
 * Deep sanitize object
 */
const deepSanitize = (obj) => {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepSanitize(item));
    }
    
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = deepSanitize(obj[key]);
            }
        }
        return sanitized;
    }
    
    return obj;
};

/**
 * Request Sanitization Middleware
 * Sanitizes all user input
 */
const sanitizeRequest = (req, res, next) => {
    if (req.body) {
        req.body = deepSanitize(req.body);
    }
    if (req.query) {
        req.query = deepSanitize(req.query);
    }
    if (req.params) {
        req.params = deepSanitize(req.params);
    }
    next();
};

/**
 * Disable Caching for Sensitive Pages
 */
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

/**
 * Production Error Handler
 * Hides error details in production
 */
const productionErrorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Error:', err);

    // Don't expose error details in production
    if (process.env.NODE_ENV === 'production') {
        return res.status(err.status || 500).json({
            success: false,
            message: 'An error occurred. Please try again later.',
            ...(process.env.SHOW_ERROR_DETAILS === 'true' && { error: err.message })
        });
    }

    // In development, show full error
    res.status(err.status || 500).json({
        success: false,
        message: err.message,
        stack: err.stack
    });
};

module.exports = {
    helmetConfig,
    globalLimiter,
    loginLimiter,
    apiLimiter,
    registerLimiter,
    sanitizeInput,
    hppProtection,
    csrfProtection,
    cspNonceGenerator,
    securityLogger,
    sanitizeRequest,
    noCache,
    productionErrorHandler,
    sanitizeString,
    deepSanitize
};
