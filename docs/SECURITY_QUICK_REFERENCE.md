# 🔒 QUICK SECURITY REFERENCE

## 🚀 Fast Setup for Production

### 1. Generate Secrets (DO THIS FIRST!)
```bash
# Session Secret (copy output to .env)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# JWT Secret (copy output to .env)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update .env File
```env
NODE_ENV=production
FORCE_HTTPS=true
BLOCK_SUSPICIOUS_REQUESTS=true
SHOW_ERROR_DETAILS=false
SESSION_SECRET=<paste-generated-secret>
JWT_SECRET=<paste-generated-secret>
SUPERADMIN_USERNAME=<change-this>
SUPERADMIN_PASSWORD=<strong-password>
MONGODB_URI=<your-uri>&ssl=true
```

### 3. Build for Production
```bash
npm install
npm run build
npm run prod
```

### 4. Verify Security (After Deployment)
```bash
# Check HTTPS redirect
curl -I http://yoursite.com

# Check security headers
curl -I https://yoursite.com | grep -i "strict-transport\|x-frame\|x-content"

# Test rate limiting (should block after attempts)
for i in {1..10}; do curl -X POST https://yoursite.com/admin/login -d "username=test&password=test"; done
```

---

## 🛡️ Security Features Enabled

### ✅ Attack Prevention
- SQL/NoSQL Injection ✓
- XSS (Cross-Site Scripting) ✓
- CSRF (Cross-Site Request Forgery) ✓
- Clickjacking ✓
- DDoS/Rate Limiting ✓
- Brute Force Protection ✓
- Session Hijacking ✓
- Open Redirect ✓
- HTTP Parameter Pollution ✓
- MIME Sniffing ✓
- Code Injection ✓
- Path Traversal ✓

### ✅ Data Protection
- Password Hashing (bcrypt) ✓
- Input Sanitization ✓
- Output Encoding ✓
- Secure Sessions ✓
- HTTPS Enforcement ✓
- Database Encryption (in-transit) ✓

### ✅ Code Security
- Frontend Obfuscation ✓
- Source Maps Disabled ✓
- Console.log Removed ✓
- Error Details Hidden ✓
- Stack Traces Hidden ✓

---

## 🔐 Default Rate Limits

| Endpoint | Limit | Window |
|----------|-------|---------|
| Global | 1000 requests | 15 min |
| Login | 5 attempts | 15 min |
| Registration | 3 accounts | 1 hour |
| API | 100 requests | 10 min |

---

## ⚡ Common Security Tasks

### Change Superadmin Password
```javascript
// Connect to MongoDB and run:
db.users.updateOne(
  { role: 'superadmin' },
  { $set: { password: await bcrypt.hash('new-password', 10) }}
)
```

### Rotate Secrets
1. Generate new secrets (see step 1 above)
2. Update .env file
3. Restart server
4. All users will be logged out (sessions invalidated)

### Block IP Address
```env
# Add to .env
BLOCKED_IPS=1.2.3.4,5.6.7.8
```

### Whitelist Trusted IPs (bypass rate limits)
```env
# Add to .env
TRUSTED_IPS=your.office.ip,your.home.ip
```

### View Security Logs
```bash
# In production, security events are logged
# Check your log files or monitoring service
tail -f logs/app.log | grep "🚨\|⚠️"
```

---

## 🚨 If Security Breach Detected

### Immediate Actions (5 minutes)
1. Block attacker IP in firewall
2. Change all secrets (SESSION_SECRET, JWT_SECRET)
3. Reset database password
4. Invalidate all sessions

### Commands
```bash
# Invalidate all sessions (MongoDB)
db.sessions.deleteMany({})

# Restart server
pm2 restart all
# or
systemctl restart nginx
```

---

## 📋 Pre-Deployment Checklist

- [ ] `NODE_ENV=production` set
- [ ] Strong `SESSION_SECRET` generated
- [ ] Strong `JWT_SECRET` generated
- [ ] `SUPERADMIN_PASSWORD` changed from default
- [ ] `FORCE_HTTPS=true` enabled
- [ ] MongoDB SSL enabled (`&ssl=true`)
- [ ] `npm audit` passed (no high/critical issues)
- [ ] Frontend built (`npm run build`)
- [ ] `.env` file not in git repository
- [ ] Error details disabled (`SHOW_ERROR_DETAILS=false`)
- [ ] HTTPS certificate installed
- [ ] Firewall configured
- [ ] Backups configured

---

## 📞 Emergency Contacts

**Security Issue**: Report immediately to your team lead
**Server Down**: Contact hosting provider
**Database Issue**: MongoDB Atlas support

---

## 🔗 Important Files

- `backend/middleware/security.js` - Main security middleware
- `backend/middleware/https-security.js` - HTTPS enforcement
- `backend/utils/validator.js` - Input validation
- `backend/utils/db-security.js` - Database security
- `.env` - Configuration (NEVER commit!)
- `docs/PRODUCTION_SECURITY.md` - Full security documentation
- `docs/DEPLOYMENT_SECURITY_CHECKLIST.md` - Deployment checklist

---

## 💡 Security Tips

1. **Never expose error details in production**
2. **Always use HTTPS in production**
3. **Rotate secrets every 90 days**
4. **Monitor failed login attempts**
5. **Keep dependencies updated** (`npm update`)
6. **Run security audits monthly** (`npm audit`)
7. **Review access logs weekly**
8. **Test backups monthly**
9. **Use strong, unique passwords**
10. **Enable 2FA on all admin accounts**

---

## 🎯 Quick Security Test

After deployment, verify these:

```bash
# 1. HTTPS works
curl -I https://yoursite.com | grep "HTTP/2 200"

# 2. HTTP redirects to HTTPS
curl -I http://yoursite.com | grep "301"

# 3. Security headers present
curl -I https://yoursite.com | grep "Strict-Transport-Security"

# 4. Rate limiting works (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST https://yoursite.com/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done

# 5. XSS protection (should escape script tags)
curl https://yoursite.com/search?q="<script>alert('xss')</script>"

# 6. CSRF protection (should fail without token)
curl -X POST https://yoursite.com/inventory/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
```

**All tests should show proper security behavior!**

---

**Last Updated**: February 2026
**Security Level**: A+ (Production Ready)
**Compliance**: OWASP Top 10, Industry Standards
