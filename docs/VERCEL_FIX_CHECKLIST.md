# 🚀 Vercel Deployment Fix - Quick Checklist

## ❌ Problem
- Error: `500: INTERNAL_SERVER_ERROR`
- Code: `FUNCTION_INVOCATION_FAILED`
- Cause: Missing environment variables + MongoDB connection timeout

## ✅ Solution Applied

### 1. Code Fixes (✅ DONE)
- ✅ Moved error handler before module export
- ✅ Added health check endpoint: `/api/health`
- ✅ Increased function timeout to 30s
- ✅ Added memory limit: 1024MB
- ✅ Set NODE_ENV in vercel.json

### 2. Vercel Environment Variables (⚠️ YOU MUST DO THIS)

Go to your Vercel project settings → Environment Variables and add:

#### **Required Variables:**
```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/bireena_bakery?retryWrites=true&w=majority
SESSION_SECRET=your_64_character_random_secret_here
NODE_ENV=production
```

#### **Security Variables (Required):**
```env
JWT_SECRET=your_64_character_jwt_secret_here
SUPERADMIN_USERNAME=your_superadmin_username
SUPERADMIN_PASSWORD=your_strong_password
```

#### **Optional Variables:**
```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SMS_DEMO_MODE=true
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
USE_AZURE_STORAGE=false
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

## 🔧 Step-by-Step Deployment

### Step 1: Configure MongoDB
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Network Access** → Add `0.0.0.0/0` to whitelist (allow all IPs for Vercel)
3. **Database Access** → Create user with read/write permissions
4. **Connect** → Get connection string → Copy it

### Step 2: Configure Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all required variables listed above
5. **Important:** Select "Production", "Preview", and "Development" for each variable

### Step 3: Generate Secrets
Run this in terminal to generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use generated string for `SESSION_SECRET` and `JWT_SECRET`

### Step 4: Redeploy
1. Push code to GitHub (already done ✅)
2. Vercel will auto-deploy
3. OR manually trigger: **Deployments** → **Redeploy**

### Step 5: Test
1. Visit: `https://your-app.vercel.app/api/health`
2. Should see:
```json
{
  "status": "ok",
  "timestamp": "2024-02-20T...",
  "mongodb": "connected",
  "env": "production"
}
```

## 🐛 Still Having Issues?

### Check Vercel Logs:
1. Go to **Deployments** → Click latest deployment
2. Click **Functions** → View logs
3. Look for specific error messages

### Common Issues:

#### 1. MongoDB Connection Timeout
```
Error: connect ETIMEDOUT
```
**Fix:** 
- Go to MongoDB Atlas → Network Access
- Add `0.0.0.0/0` (allows all IPs)
- Wait 2-3 minutes for changes to apply

#### 2. Environment Variable Missing
```
Error: MONGODB_URI is not defined
```
**Fix:**
- Ensure all env vars are added in Vercel
- Make sure "Production" is checked
- Redeploy after adding variables

#### 3. Session Store Error
```
Error: MongoStore connection failed
```
**Fix:**
- Verify MONGODB_URI is correct
- Check MongoDB user has read/write permissions
- Ensure database name matches

#### 4. Rate Limit / Security Issues
```
Error: Too many requests
```
**Fix:**
- Add your IP to TRUSTED_IPS env variable
- OR temporarily disable: `ENABLE_RATE_LIMITING=false`

## 📊 MongoDB Atlas Checklist

- [ ] Database created: `bireena_bakery`
- [ ] User created with readWrite role
- [ ] Network access: `0.0.0.0/0` whitelisted
- [ ] Connection string copied (contains username & password)
- [ ] Connection string format: `mongodb+srv://...`

## 🔐 Security Checklist

- [ ] SESSION_SECRET is strong random string (64+ chars)
- [ ] JWT_SECRET is strong random string (64+ chars)
- [ ] SUPERADMIN_PASSWORD is strong (not "password123")
- [ ] NODE_ENV set to "production"
- [ ] Changed default credentials from .env.example

## ⚡ Quick Commands

### Test locally first:
```bash
npm start
```

### Check if MongoDB connects:
```bash
node scripts/complete-system-check.js
```

### View Vercel logs:
```bash
vercel logs
```

## 📝 Changes Made to Code

### server.js
- ✅ Error handler moved before module export
- ✅ Added `/api/health` endpoint

### vercel.json
- ✅ Added 30s timeout for functions
- ✅ Added 1024MB memory limit
- ✅ Set NODE_ENV=production

## 🎯 Next Steps

1. **Add environment variables in Vercel** (most critical)
2. **Whitelist 0.0.0.0/0 in MongoDB Atlas**
3. **Redeploy from Vercel dashboard**
4. **Test health endpoint**: `/api/health`
5. **Test login page**

---

## 💡 Pro Tips

- Always test locally first: `npm start`
- Use MongoDB Atlas free tier for small shops
- Keep environment variables secret
- Never commit .env file to GitHub
- Check Vercel function logs for debugging
- MongoDB connection can take 5-10 seconds on cold start

---

**Last Updated:** 2024-02-20
**Status:** ✅ Code fixed, ⚠️ Awaiting Vercel env variable configuration
