/**
 * 🔒 HTTPS ENFORCEMENT MIDDLEWARE
 * Forces all traffic to use HTTPS in production
 */

/**
 * Redirect HTTP to HTTPS
 */
const forceHTTPS = (req, res, next) => {
    // Skip in development
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // Skip if FORCE_HTTPS is disabled
    if (process.env.FORCE_HTTPS !== 'true') {
        return next();
    }

    // Check if request is already HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        return next();
    }

    // Redirect to HTTPS
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
};

/**
 * Security Headers for HTTPS
 */
const httpsSecurityHeaders = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        // Strict Transport Security
        res.setHeader(
            'Strict-Transport-Security',
            `max-age=${process.env.HSTS_MAX_AGE || 31536000}; includeSubDomains; preload`
        );

        // Upgrade Insecure Requests
        res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
    }

    next();
};

/**
 * Check if request is from allowed origin (CORS)
 */
const checkOrigin = (req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : [];

    const origin = req.headers.origin;

    // Allow if no origin (same-origin requests)
    if (!origin) {
        return next();
    }

    // Check if origin is allowed
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
        return next();
    }

    // Block if origin not allowed
    return res.status(403).json({
        success: false,
        message: 'Origin not allowed'
    });
};

/**
 * Prevent HTTP method override attacks
 */
const secureMethodOverride = (req, res, next) => {
    // Only allow specific methods
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    
    if (!allowedMethods.includes(req.method)) {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });
    }

    next();
};

/**
 * Prevent host header injection
 */
const preventHostHeaderInjection = (req, res, next) => {
    const allowedHosts = process.env.ALLOWED_HOSTS 
        ? process.env.ALLOWED_HOSTS.split(',')
        : [];

    // Skip if no allowed hosts configured
    if (allowedHosts.length === 0) {
        return next();
    }

    const host = req.headers.host;

    if (!allowedHosts.includes(host)) {
        console.error(`⚠️ Host header injection attempt: ${host} from IP: ${req.ip}`);
        return res.status(403).send('Invalid host header');
    }

    next();
};

/**
 * Add security timestamp to prevent replay attacks
 */
const addSecurityTimestamp = (req, res, next) => {
    // Add timestamp header for API requests
    if (req.path.startsWith('/api/')) {
        const timestamp = Date.now();
        res.setHeader('X-Request-Time', timestamp);

        // Validate request timestamp if provided
        const clientTimestamp = req.headers['x-request-time'];
        
        if (clientTimestamp) {
            const timeDiff = Math.abs(timestamp - parseInt(clientTimestamp));
            const maxDiff = 5 * 60 * 1000; // 5 minutes

            if (timeDiff > maxDiff) {
                return res.status(400).json({
                    success: false,
                    message: 'Request timestamp too old'
                });
            }
        }
    }

    next();
};

/**
 * Prevent open redirects
 */
const preventOpenRedirect = (req, res, next) => {
    // Override res.redirect to validate URLs
    const originalRedirect = res.redirect;

    res.redirect = function(statusOrUrl, url) {
        let redirectUrl;
        let status = 302;

        if (typeof statusOrUrl === 'number') {
            status = statusOrUrl;
            redirectUrl = url;
        } else {
            redirectUrl = statusOrUrl;
        }

        // Only allow relative URLs or same-origin URLs
        if (redirectUrl && !redirectUrl.startsWith('/') && !redirectUrl.startsWith(req.protocol + '://' + req.get('host'))) {
            console.warn(`⚠️ Open redirect attempt blocked: ${redirectUrl} from IP: ${req.ip}`);
            redirectUrl = '/';
        }

        return originalRedirect.call(this, status, redirectUrl);
    };

    next();
};

/**
 * API Key Authentication (for external integrations)
 */
const apiKeyAuth = (req, res, next) => {
    // Only for /api routes
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    const apiKey = req.headers['x-api-key'];
    const configuredApiKey = process.env.API_KEY;

    // Skip if no API key configured
    if (!configuredApiKey) {
        return next();
    }

    if (!apiKey || apiKey !== configuredApiKey) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or missing API key'
        });
    }

    next();
};

module.exports = {
    forceHTTPS,
    httpsSecurityHeaders,
    checkOrigin,
    secureMethodOverride,
    preventHostHeaderInjection,
    addSecurityTimestamp,
    preventOpenRedirect,
    apiKeyAuth
};
