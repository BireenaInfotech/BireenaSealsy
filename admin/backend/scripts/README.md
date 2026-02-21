# 🛠️ Migration Scripts

This directory contains scripts to help you migrate from the old single-shop system to the new multi-shop architecture.

---

## 📁 Available Scripts

### 1. check-migration-status.js
**Purpose:** Check if your database needs migration
**Usage:** 
```bash
node backend/scripts/check-migration-status.js
```
**What it does:**
- Shows how many shop owners exist
- Displays count of records with/without adminId
- Lists which collections need migration
- **Does NOT make any changes** (read-only)

**When to use:** Before migration, after migration, or anytime you want to check database status.

---

### 2. migrate-existing-data.js
**Purpose:** Migrate existing data to multi-shop system
**Usage:** 
```bash
node backend/scripts/migrate-existing-data.js
```
**What it does:**
- Displays all existing shop owners
- Lets you choose which shop owner should own existing data
- Assigns `adminId` to all records without it
- OR deletes all data if you want fresh start
- **MAKES CHANGES** to your database

**When to use:** When you have existing data that needs migration.

---

## 🚀 Quick Start

### First Time Setup:

```bash
# 1. Check current status
node backend/scripts/check-migration-status.js

# 2. If migration needed, run migration script
node backend/scripts/migrate-existing-data.js

# 3. Verify migration completed
node backend/scripts/check-migration-status.js
```

---

## 📊 Migration Options

When you run `migrate-existing-data.js`, you'll see:

```
Choose an option:
1. Assign all existing data to a specific shop owner
2. Delete all data and start fresh
3. Cancel (exit without changes)
```

### Option 1: Assign to Shop Owner
- **Best for:** Keeping existing data
- **What happens:** All products, sales, expenses, etc. get assigned to selected shop owner
- **Result:** One shop with all existing data

### Option 2: Delete All Data
- **Best for:** Starting fresh with clean database
- **What happens:** All data deleted (except shop owners)
- **Result:** Empty database ready for new data

### Option 3: Cancel
- **What happens:** Nothing - exits without changes
- **Result:** Database unchanged

---

## 🔍 Understanding the Output

### Example Output from check-migration-status.js:

```
📊 MULTI-SHOP MIGRATION STATUS CHECK

👥 USERS:
   Shop Owners (Admins): 2
      - Ramesh Kumar (@ramesh)
        Shop: Kumar Bakery
      - Suresh Patil (@suresh)
        Shop: Patil Sweets
   Staff with adminId: 5 ✅
   Staff WITHOUT adminId: 3 ⚠️

📦 PRODUCTS:
   Total: 150
   With adminId: 100 ✅
   WITHOUT adminId: 50 ⚠️

💰 SALES:
   Total: 420
   With adminId: 300 ✅
   WITHOUT adminId: 120 ⚠️

⚠️ MIGRATION REQUIRED!
```

**What this means:**
- You have 2 shop owners
- 50 products and 120 sales need migration
- 3 staff members need adminId

---

## 🎯 Step-by-Step Migration Example

### Scenario: You have existing data and want to keep it

```bash
# Step 1: Start MongoDB (if not running)
# Make sure your database is accessible

# Step 2: Check status
$ node backend/scripts/check-migration-status.js

# Output shows: 150 products without adminId, 420 sales without adminId

# Step 3: Create shop owner (if none exists)
# Go to: http://localhost:3000/.hidden/login
# Create first shop owner

# Step 4: Run migration
$ node backend/scripts/migrate-existing-data.js

# Choose option 1 (Assign to shop owner)
# Select shop owner from list
# Confirm migration

# Output shows:
✅ Updated 150 products
✅ Updated 420 sales
✅ Updated 87 expenses
...
✅ MIGRATION COMPLETE! Total records updated: 657

# Step 5: Verify
$ node backend/scripts/check-migration-status.js

# Output shows:
✅ MIGRATION COMPLETE!
All data has been properly migrated to the multi-shop system.
```

---

## ⚠️ Important Notes

### Before Migration:

1. **Backup your database**
   ```bash
   mongodump --db birre --out ./backup
   ```

2. **Stop the server** (optional but recommended)
   ```bash
   # Press Ctrl+C in server terminal
   ```

3. **Ensure MongoDB is running**
   ```bash
   # Check if MongoDB is accessible
   mongo birre
   ```

### During Migration:

1. **Read prompts carefully** before confirming
2. **Double-check shop owner selection** before proceeding
3. **Option 2 (Delete All)** requires typing "DELETE ALL" - this is intentional!

### After Migration:

1. **Restart your server**
   ```bash
   npm start
   ```

2. **Test the application**
   - Login as shop owner
   - Verify data is visible
   - Create second shop owner
   - Verify data isolation

---

## 🐛 Troubleshooting

### "No shop owners found!"
**Problem:** No admins exist in database
**Solution:** 
1. Start server: `npm start`
2. Go to: http://localhost:3000/.hidden/login
3. Create shop owner
4. Run migration script again

### "Error connecting to MongoDB"
**Problem:** Can't connect to database
**Solution:**
1. Check if MongoDB is running
2. Verify connection string in `.env`
3. Update `MONGO_URI` in script if needed

### "Can't see data after migration"
**Problem:** Data exists but not visible
**Solution:**
1. Check if you're logged in as correct shop owner
2. Run status check to verify adminId was set
3. Check browser console for errors

### "Migration completed but status still shows issues"
**Problem:** Script ran but data not updated
**Solution:**
1. Check MongoDB connection
2. Verify shop owner ID is correct
3. Run migration again
4. Check database directly: `db.products.find({ adminId: null })`

---

## 🔐 Configuration

Both scripts use the same MongoDB connection:

```javascript
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/birre';
```

**To change connection:**
1. Update `.env` file: `MONGODB_URI=your_connection_string`
2. OR edit the script directly (not recommended)

---

## 📚 Additional Resources

- **Complete Migration Guide:** See `../../MIGRATION_GUIDE.md`
- **Architecture Changes:** See `../../IMPORTANT_CHANGES.md`
- **Multi-Shop Documentation:** See `../../MULTI_SHOP_MIGRATION.md`

---

## 💡 Tips

1. **Always check status first** before migrating
2. **Backup before migration** - can't hurt!
3. **Test with one shop** before creating multiple
4. **Verify isolation** by creating second shop and checking data
5. **Read the output** - scripts provide detailed feedback

---

## ❓ Need Help?

If you're stuck:
1. Read the error message carefully
2. Check `MIGRATION_GUIDE.md` for solutions
3. Verify MongoDB is running and accessible
4. Ensure `.env` configuration is correct
5. Try the status check to see current state

---

**🎉 Happy Migrating!** These scripts make migration easy and safe.
