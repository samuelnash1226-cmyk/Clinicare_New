# 🚀 Bulk Add Users - Quick Reference Card

## ⚡ Quick Start (30 seconds)

1. Click **"Bulk Add Users"** button
2. Download sample template
3. Paste your masterlist
4. Click **"Parse & Preview"**
5. Review → Click **"Create"**
6. Done! ✅

---

## 📋 Masterlist Format

```
Full Name | Email | Student ID | Allergies | Parents
```

**Example:**
```
john doe | john@email.com | 2022-123 | None | Jane Doe (jane@email.com)
```

---

## 🔑 Key Info

| Item | Value |
|------|-------|
| **Default Password** | `ndkc123` |
| **Separator** | Pipe `\|` or Tab |
| **Parent Format** | `Name (email)` |
| **Multiple Parents** | `Name1 (email1), Name2 (email2)` |
| **No Allergies** | `None` |
| **No Parents** | `None` |

---

## ✅ What Gets Created

- ✅ Student accounts (email + password)
- ✅ Parent accounts (auto-created)
- ✅ Parent-Student links (automatic)
- ✅ Student allergies (imported)
- ✅ Grade levels (auto-calculated)

---

## 📊 Example Entry

```
emma wilson | emma@student.com | 2022-345 | Peanuts, Shellfish | John Wilson (john@email.com), Sarah Wilson (sarah@email.com)
```

**Creates:**
- 1 Student: emma@student.com
- 2 Parents: john@email.com, sarah@email.com
- Links: Both parents → Emma
- Allergies: Peanuts, Shellfish
- Password: ndkc123 (all accounts)

---

## ⚠️ Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|----------|
| `john@email` | `john@email.com` |
| `John Doe john@email.com` | `John Doe (john@email.com)` |
| `peanuts shellfish` | `peanuts, shellfish` |
| Missing pipe | Must have `\|` between fields |

---

## 🎯 Field Requirements

| Field | Required | Example |
|-------|----------|---------|
| Full Name | ✅ Yes | `John Doe` |
| Email | ✅ Yes | `john@email.com` |
| Student ID | ✅ Yes | `2022-123` |
| Allergies | ❌ No | `Peanuts` or `None` |
| Parents | ❌ No | `Jane (jane@email.com)` or `None` |

---

## 💡 Pro Tips

1. **Download Sample First** - Use as template
2. **Test Small Batch** - Try 2-3 entries first
3. **Check Preview** - Always review before creating
4. **Note Errors** - Save error list for fixing
5. **Don't Close Modal** - Wait for completion

---

## 🔄 Process Flow

```
Paste Masterlist
      ↓
Parse & Validate
      ↓
Preview Data
      ↓
Create Accounts
      ↓
View Results
```

---

## 📈 Progress Indicators

- **Parsing** - Checking format
- **Processing** - Creating accounts (see %)
- **Results** - Success/failure count

---

## 🎊 Success Indicators

✅ Green checkmarks
📊 "X Successful" count
💚 No red error messages
🔗 Parents linked to students

---

## 🆘 Quick Fixes

**Problem:** Parse errors
**Fix:** Check pipe separators, email format

**Problem:** Duplicate email
**Fix:** Use different email or skip

**Problem:** Parent not linking
**Fix:** Check format: `Name (email)`

---

## 📞 Need Help?

1. Read error messages carefully
2. Check BULK_ADD_USERS_GUIDE.md
3. Try smaller batch (5 users)
4. Verify Firebase is configured

---

## 🎉 That's It!

You're ready to bulk import users. Start with a small test batch and scale up!

**Default Password for ALL accounts: `ndkc123`**

Don't forget to remind users to change their password! 🔒
