# 🚀 Hostinger VPS Deployment Guide (हिंदी + English)

## ✅ हाँ, यह Software Hostinger VPS पर Host हो सकता है!

### आवश्यकताएं (Requirements):
- ✅ Hostinger VPS Subscription (आपके पास है)
- ✅ Node.js support (Hostinger VPS में available है)
- ✅ MongoDB Atlas account (free tier)
- ✅ SSH access to VPS

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: VPS में Login करें

```bash
# SSH से connect करें
ssh root@your-vps-ip-address
# या
ssh username@your-vps-ip-address
```

### Step 2: System Update करें

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git
```

### Step 3: Node.js Install करें

```bash
# NodeSource repository add करें (Node.js 20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js install करें
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show npm version
```

### Step 4: MongoDB Setup (MongoDB Atlas - Recommended)

**Option 1: MongoDB Atlas (Free, Recommended)**
1. https://www.mongodb.com/cloud/atlas पर जाएं
2. Free account बनाएं
3. Free cluster create करें
4. Database user बनाएं
5. Network Access में अपना VPS IP add करें या `0.0.0.0/0` (all IPs)
6. Connection string copy करें

**Option 2: Local MongoDB (VPS पर)**
```bash
# MongoDB install करें (अगर VPS में चाहें)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 5: Project Upload करें

**Method 1: Git से (Recommended)**
```bash
# अगर आपका code GitHub पर है
cd /var/www
sudo git clone https://github.com/yourusername/salesy.git
cd salesy/admin

# या अगर private repo है
git clone https://yourusername:token@github.com/yourusername/salesy.git
```

**Method 2: Direct Upload (FileZilla/SCP)**
```bash
# Local machine से VPS पर upload करें
# FileZilla use करें:
# Host: sftp://your-vps-ip
# Username: root (या आपका username)
# Password: your-password
# Port: 22

# या SCP command से
scp -r D:\Salesy\admin root@your-vps-ip:/var/www/salesy
```

### Step 6: Dependencies Install करें

```bash
cd /var/www/salesy/admin

# Install dependencies
npm install

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### Step 7: Environment Variables Setup

```bash
# .env file बनाएं
nano .env

# या अगर already है तो edit करें
```

**.env file में ये settings डालें:**
```env
NODE_ENV=production
PORT=3000

# MongoDB Connection (Atlas का connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/salesy?retryWrites=true&w=majority&ssl=true

# Generate these secrets
SESSION_SECRET=your-64-char-random-secret-here
JWT_SECRET=your-32-char-random-secret-here

# Superadmin Credentials
SUPERADMIN_USERNAME=your_admin_username
SUPERADMIN_PASSWORD=your_strong_password

# Security Settings
FORCE_HTTPS=true
BLOCK_SUSPICIOUS_REQUESTS=true
SHOW_ERROR_DETAILS=false

# Email (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Twilio (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SMS Demo Mode
SMS_DEMO_MODE=true

# Azure Storage (Optional)
USE_AZURE_STORAGE=false
```

**Secrets generate करने के लिए:**
```bash
# Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 8: Build करें (Security)

```bash
# Frontend code obfuscate करें
npm run build

# Security audit
npm audit fix
```

### Step 9: Nginx Web Server Setup

```bash
# Nginx install करें
sudo apt install -y nginx

# Nginx configuration file बनाएं
sudo nano /etc/nginx/sites-available/salesy
```

**Nginx Configuration (`/etc/nginx/sites-available/salesy`):**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # या अगर domain नहीं है तो IP use करें
    # server_name your-vps-ip;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificate (Step 10 में setup करेंगे)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /css {
        alias /var/www/salesy/admin/frontend/public/css;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /js {
        alias /var/www/salesy/admin/frontend/public/js;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /images {
        alias /var/www/salesy/admin/frontend/public/images;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Disable access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ \.env$ {
        deny all;
    }
}
```

**अगर Domain नहीं है (सिर्फ IP से access करना है):**
```nginx
server {
    listen 80;
    server_name your-vps-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable Nginx site:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/salesy /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 10: SSL Certificate Setup (Free - Let's Encrypt)

**अगर आपके पास Domain है:**
```bash
# Certbot install करें
sudo apt install -y certbot python3-certbot-nginx

# SSL certificate obtain करें
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)

# Auto-renewal test करें
sudo certbot renew --dry-run
```

**अगर Domain नहीं है:**
- HTTP पर चलाएं (port 80)
- या self-signed certificate use करें (not recommended for production)

### Step 11: Start Application with PM2

```bash
# Application start करें
cd /var/www/salesy/admin
pm2 start server.js --name "salesy"

# PM2 को auto-start enable करें
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs salesy
```

### Step 12: Firewall Setup

```bash
# UFW firewall enable करें
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

### Step 13: Verification

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs salesy

# Check Nginx
sudo systemctl status nginx

# Check if port 3000 is listening
sudo netstat -tulpn | grep :3000
```

**Browser में test करें:**
- http://your-vps-ip (or http://your-domain.com)
- https://your-domain.com (if SSL configured)

---

## 🔧 Useful PM2 Commands

```bash
# Start app
pm2 start server.js --name salesy

# Stop app
pm2 stop salesy

# Restart app
pm2 restart salesy

# Delete app
pm2 delete salesy

# View logs
pm2 logs salesy

# Monitor
pm2 monit

# List all apps
pm2 list

# Save current state
pm2 save
```

---

## 🔄 Update करने के लिए

```bash
# Stop app
pm2 stop salesy

# Pull latest code (if using git)
cd /var/www/salesy/admin
git pull origin main

# Install new dependencies (if any)
npm install

# Build
npm run build

# Restart
pm2 restart salesy
```

---

## 🚨 Troubleshooting

### Problem: App crash हो रहा है
```bash
# Logs check करें
pm2 logs salesy --lines 100

# Restart करें
pm2 restart salesy
```

### Problem: MongoDB connection error
```bash
# Check MongoDB URI in .env
# MongoDB Atlas में IP whitelist check करें
# Network access में 0.0.0.0/0 add करें (या VPS IP)
```

### Problem: Port already in use
```bash
# Check what's using port 3000
sudo netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <PID>
```

### Problem: Nginx error
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Problem: Permission denied
```bash
# Give proper permissions
sudo chown -R $USER:$USER /var/www/salesy
sudo chmod -R 755 /var/www/salesy
```

---

## 📊 Hostinger VPS Requirements

### Minimum Requirements:
- **RAM**: 1 GB (2 GB recommended)
- **Storage**: 20 GB
- **CPU**: 1 core
- **OS**: Ubuntu 20.04 / 22.04 (recommended)

### Recommended Plan:
- **VPS 1** या **VPS 2** plan काफी है
- 2 GB RAM + 2 CPU cores ideal है

---

## 💰 Cost Breakdown

| Service | Cost | Required |
|---------|------|----------|
| Hostinger VPS | ₹299-₹599/month | ✅ Yes (आपके पास है) |
| MongoDB Atlas | Free (512 MB) | ✅ Yes |
| Domain | ₹99-₹999/year | ⚠️ Optional |
| SSL Certificate | Free (Let's Encrypt) | ✅ Yes |

**Total Monthly Cost: ₹299-₹599** (सिर्फ VPS)

---

## 🎯 Quick Deployment Commands (Copy-Paste)

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 and others
sudo npm install -g pm2
sudo apt install -y nginx git

# 4. Clone/Upload project
cd /var/www
# (upload your files here)

# 5. Install dependencies
cd /var/www/salesy/admin
npm install

# 6. Setup .env file
nano .env
# (paste your configuration)

# 7. Build
npm run build

# 8. Start with PM2
pm2 start server.js --name salesy
pm2 startup
pm2 save

# 9. Setup Nginx
sudo nano /etc/nginx/sites-available/salesy
# (paste nginx config)
sudo ln -s /etc/nginx/sites-available/salesy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Setup Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Done! ✅
```

---

## 📞 Support

**Common Issues:**
- MongoDB connection: Check Atlas whitelist
- Port issues: Use `sudo netstat -tulpn | grep 3000`
- Permissions: `sudo chown -R $USER:$USER /var/www/salesy`
- Logs: `pm2 logs salesy`

**Hostinger Support:**
- Hostinger VPS documentation
- Live chat support available

---

## ✅ Final Checklist

- [ ] VPS access प्राप्त किया
- [ ] Node.js install किया
- [ ] MongoDB Atlas setup किया
- [ ] Project upload किया
- [ ] .env file configure किया
- [ ] Dependencies install किए
- [ ] Nginx setup किया
- [ ] SSL certificate install किया (optional)
- [ ] PM2 से app start किया
- [ ] Firewall configure किया
- [ ] Browser में test किया

**सब check हो गया? तो आपका Salesy app live है!** 🚀

---

**Deployment Time**: 30-60 minutes (first time)
**Difficulty**: Medium (step-by-step instructions हैं)
**Support**: Hostinger + MongoDB Atlas documentation available

**हाँ, आपका software आसानी से Hostinger VPS पर host हो जाएगा!** ✅
