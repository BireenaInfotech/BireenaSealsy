# 🔄 Data Migration - Quick Reference

## 📋 TL;DR - Quick Commands

```bash
# Check if migration needed (safe, read-only)
node backend/scripts/check-migration-status.js

# Run migration (interactive)
node backend/scripts/migrate-existing-data.js
```

---

## 🎯 When Do I Need Migration?

You need migration if:
- ✅ You cloned/pulled the multi-shop update
- ✅ You have existing data (products, sales, expenses)
- ✅ Your data was created before the multi-shop system

You DON'T need migration if:
- ❌ Fresh installation (no existing data)
- ❌ All data created after multi-shop update
- ❌ Already migrated

---

## 🚀 Three Migration Paths

### Path 1: Keep Existing Data ✅ Recommended
```bash
# Step 1: Create shop owner (if needed)
# Visit: http://localhost:3000/.hidden/login

# Step 2: Run migration
node backend/scripts/migrate-existing-data.js
# → Choose option 1
# → Select shop owner
# → Confirm

# Step 3: Verify
node backend/scripts/check-migration-status.js
```

### Path 2: Start Fresh 🗑️
```bash
# Run migration script
node backend/scripts/migrate-existing-data.js
# → Choose option 2 (Delete All)
# → Type "yes" to confirm
# → Type "DELETE ALL" to double-confirm
```

### Path 3: Skip Migration ⏭️
```bash
# Only if you have NO existing data
# Just start using the system!
npm start
```

---

## 🔍 Quick Status Check

```bash
node backend/scripts/check-migration-status.js
```

**Output meanings:**

```
✅ "MIGRATION COMPLETE!"
   → You're good to go!

⚠️ "MIGRATION REQUIRED!"
   → Run migrate-existing-data.js

❌ "No shop owners found!"
   → Create shop owner first at /.hidden/login
```

---

## 🆘 Common Issues & Quick Fixes

### Issue 1: "No shop owners found!"
**Fix:**
```bash
# 1. Start server
npm start

# 2. Create shop owner
# Visit: http://localhost:3000/.hidden/login
# Login: superadmin / superadmin123

# 3. Try migration again
```

### Issue 2: "Can't connect to MongoDB"
**Fix:**
```bash
# 1. Check if MongoDB running
mongosh birre

# 2. Check .env file has:
MONGODB_URI=mongodb://localhost:27017/birre
```

### Issue 3: "Data not showing after migration"
**Fix:**
```bash
# 1. Check migration status
node backend/scripts/check-migration-status.js

# 2. Login as correct shop owner

# 3. Clear browser cache
```

---

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| `MIGRATION_GUIDE.md` | Complete step-by-step guide |
| `IMPORTANT_CHANGES.md` | What changed in multi-shop |
| `MULTI_SHOP_MIGRATION.md` | Technical architecture details |
| `backend/scripts/README.md` | Migration scripts documentation |

---

## ⚡ Emergency Commands

### Backup Database
```bash
mongodump --db birre --out ./backup
```

### Restore Database
```bash
mongorestore --db birre ./backup/birre
```

### Check Database Directly
```bash
mongosh birre
db.products.countDocuments({ adminId: null })
db.sales.countDocuments({ adminId: null })
```

---

## 🎓 Example: Complete First-Time Migration

```bash
# Start fresh after pulling multi-shop update

# 1. Check what needs migration
node backend/scripts/check-migration-status.js
# Output: 150 products, 420 sales need migration

# 2. Start server
npm start

# 3. Create shop owner
# Visit: http://localhost:3000/.hidden/login
# Create: "ramesh" / "pass123" / "Kumar Bakery"

# 4. Run migration
node backend/scripts/migrate-existing-data.js
# Choose: 1 (Assign to shop owner)
# Select: 1 (Ramesh Kumar)
# Confirm: yes

# 5. Verify success
node backend/scripts/check-migration-status.js
# Output: ✅ MIGRATION COMPLETE!

# 6. Test application
# Login at: http://localhost:3000/login
# Use: ramesh / pass123
# Verify: All data visible

# 7. Create second shop to test isolation
# Visit: http://localhost:3000/.hidden/login
# Create: "suresh" / "pass456" / "Patil Sweets"
# Login as Suresh
# Verify: NO data from Ramesh's shop visible ✅
```

---

## 💡 Pro Tips

1. **Always backup first:**
   ```bash
   mongodump --db birre --out ./backup-$(date +%Y%m%d)
   ```

2. **Run status check frequently:**
   - Before migration
   - After migration
   - When troubleshooting

3. **Test data isolation:**
   - Create 2 shop owners
   - Login as each
   - Verify they see different data

4. **Keep documentation handy:**
   - Bookmark `MIGRATION_GUIDE.md`
   - Check `backend/scripts/README.md` for script details

---

## 🎯 Success Checklist

After migration, verify:

- [ ] Status check shows "MIGRATION COMPLETE"
- [ ] Shop owner can login
- [ ] Shop owner sees all migrated data
- [ ] New data can be created
- [ ] Second shop owner shows isolated data
- [ ] Employees can be created under shop owner
- [ ] Employees see only their shop's data

---

## 📞 Still Stuck?

1. Read full guide: `MIGRATION_GUIDE.md`
2. Check scripts README: `backend/scripts/README.md`
3. Verify MongoDB is running
4. Check `.env` configuration
5. Look for errors in terminal output

---

**Last Updated:** December 2, 2025

🎉 **Migration is easier than it looks - the scripts do all the work!**
