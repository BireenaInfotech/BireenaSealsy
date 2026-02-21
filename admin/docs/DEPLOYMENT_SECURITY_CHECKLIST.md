# 🔒 PRODUCTION DEPLOYMENT SECURITY CHECKLIST

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Set `NODE_ENV=production` in .env file
- [ ] Generate strong `SESSION_SECRET` (64+ characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] Generate strong `JWT_SECRET` (32+ characters)
  ```bash
  openssl rand -hex 32
  ```
- [ ] Change `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` from defaults
- [ ] Configure MongoDB URI with SSL (`&ssl=true`)
- [ ] Set `FORCE_HTTPS=true`
- [ ] Set `BLOCK_SUSPICIOUS_REQUESTS=true`
- [ ] Set `SHOW_ERROR_DETAILS=false`
- [ ] Remove or disable `TRUSTED_IPS` if not needed

### 2. Code Security
- [ ] Build frontend with webpack obfuscation
  ```bash
  npm run build
  ```
- [ ] Verify no console.log in production build
- [ ] Verify source maps are disabled (check dist folder)
- [ ] Remove all commented debug code
- [ ] Remove all TODO comments with sensitive info

### 3. Dependencies
- [ ] Run security audit
  ```bash
  npm audit
  ```
- [ ] Fix all high and critical vulnerabilities
  ```bash
  npm audit fix
  ```
- [ ] Update all dependencies to latest stable versions
  ```bash
  npm update
  ```
- [ ] Review package.json for unused dependencies

### 4. Database Security
- [ ] Enable MongoDB authentication
- [ ] Use strong database password (20+ characters)
- [ ] Whitelist only necessary IP addresses in MongoDB Atlas
- [ ] Enable SSL/TLS for MongoDB connection
- [ ] Set up database backups
- [ ] Enable MongoDB audit logging
- [ ] Create read-only user for reporting (if needed)

### 5. Server Configuration
- [ ] Enable HTTPS/SSL certificate
- [ ] Configure firewall rules
- [ ] Disable unnecessary ports
- [ ] Set up SSH key authentication (no password)
- [ ] Disable root login
- [ ] Configure automatic security updates
- [ ] Set up server monitoring

### 6. Application Security
- [ ] Verify rate limiting is working
  - Test login: max 5 attempts in 15 minutes
  - Test API: max 100 requests in 10 minutes
  - Test global: max 1000 requests in 15 minutes
- [ ] Test CSRF protection on forms
- [ ] Verify XSS protection (try injecting `<script>alert('XSS')</script>`)
- [ ] Test SQL/NoSQL injection (try `{"$gt": ""}`)
- [ ] Verify password reset flow
- [ ] Test session timeout (should logout after 24 hours)
- [ ] Verify HTTPS redirect works
- [ ] Test CORS configuration

### 7. Error Handling
- [ ] Verify errors don't expose stack traces
- [ ] Check logs don't contain sensitive data
- [ ] Test 404 page doesn't reveal server info
- [ ] Test 500 page shows generic message

### 8. Files & Permissions
- [ ] Verify .env is in .gitignore
- [ ] Remove .env.example from production server
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Remove test files and scripts
- [ ] Delete development-only files

### 9. Monitoring Setup
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Create alerts for:
  - High error rate
  - Failed login attempts
  - Rate limit violations
  - Database connection failures
  - Server resource usage

### 10. Documentation
- [ ] Document all environment variables
- [ ] Create disaster recovery plan
- [ ] Document backup procedures
- [ ] Create incident response plan
- [ ] Document security contacts

## Post-Deployment Verification

### Immediately After Deployment (0-1 hour)
- [ ] Verify site loads over HTTPS
- [ ] Test login functionality
- [ ] Check database connections
- [ ] Verify email sending works
- [ ] Test SMS sending (if enabled)
- [ ] Check error logs for issues
- [ ] Verify rate limiting works
- [ ] Test payment gateway (if applicable)

### First 24 Hours
- [ ] Monitor error logs continuously
- [ ] Check performance metrics
- [ ] Verify backups are running
- [ ] Test all critical user flows
- [ ] Monitor database queries
- [ ] Check memory and CPU usage
- [ ] Review access logs

### First Week
- [ ] Run security scan
  ```bash
  npm audit
  ```
- [ ] Review access logs for suspicious activity
- [ ] Monitor failed login attempts
- [ ] Check rate limit violations
- [ ] Verify session management
- [ ] Test backup restoration
- [ ] Review and tune rate limits if needed

## Security Testing Commands

### 1. Test Rate Limiting
```bash
# Test login rate limit (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST https://yoursite.com/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  echo "\nAttempt $i"
done
```

### 2. Test HTTPS Redirect
```bash
# Should redirect to HTTPS
curl -I http://yoursite.com
```

### 3. Test Security Headers
```bash
# Check security headers are present
curl -I https://yoursite.com
# Should see:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - Content-Security-Policy
```

### 4. Test CSRF Protection
```bash
# Should fail without CSRF token
curl -X POST https://yoursite.com/inventory/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
```

### 5. Check SSL Certificate
```bash
# Verify SSL certificate is valid
openssl s_client -connect yoursite.com:443 -servername yoursite.com
```

## Security Monitoring

### Daily Checks
- Review error logs
- Check failed login attempts
- Monitor rate limit violations

### Weekly Checks
- Review access logs
- Check for unusual traffic patterns
- Verify backups are successful
- Test critical user flows

### Monthly Checks
- Run npm audit
- Review and rotate secrets
- Update dependencies
- Security scan with external tool
- Review user permissions
- Audit database access logs

### Quarterly Checks
- Full security audit
- Penetration testing
- Review and update security policies
- Rotate all secrets and passwords
- Review third-party integrations
- Update SSL certificates if needed

## Emergency Procedures

### If Security Breach Detected

1. **Immediate (0-15 minutes)**
   - [ ] Block affected IP addresses
   - [ ] Disable compromised accounts
   - [ ] Take affected services offline if necessary

2. **Short Term (15-60 minutes)**
   - [ ] Change all passwords and secrets
   - [ ] Rotate database credentials
   - [ ] Invalidate all sessions
   - [ ] Review access logs
   - [ ] Identify attack vector

3. **Medium Term (1-24 hours)**
   - [ ] Patch vulnerability
   - [ ] Restore from clean backup if needed
   - [ ] Notify affected users
   - [ ] Document incident
   - [ ] Review security measures

4. **Long Term (1-7 days)**
   - [ ] Conduct post-mortem
   - [ ] Implement additional security measures
   - [ ] Update security documentation
   - [ ] Train team on new procedures

## Contacts

### Emergency Contacts
- **Security Team**: security@yourcompany.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Hosting Provider**: support@hostingprovider.com

### Service Providers
- **MongoDB Atlas**: cloud.mongodb.com/support
- **Vercel Support**: vercel.com/support
- **Twilio Support**: twilio.com/help/contact

## Compliance

### Data Protection
- [ ] GDPR compliance verified
- [ ] Privacy policy updated
- [ ] Terms of service reviewed
- [ ] Cookie consent implemented
- [ ] Data retention policy documented

### Security Standards
- [ ] OWASP Top 10 covered
- [ ] PCI DSS compliant (if handling payments)
- [ ] ISO 27001 guidelines followed
- [ ] Industry best practices implemented

## Sign-Off

**Deployment Date**: ________________

**Deployed By**: ________________

**Reviewed By**: ________________

**Production URL**: ________________

**All items checked**: [ ] Yes [ ] No

**Notes**: 
_________________________________________________
_________________________________________________
_________________________________________________

---

**Version**: 1.0.0
**Last Updated**: February 2026
