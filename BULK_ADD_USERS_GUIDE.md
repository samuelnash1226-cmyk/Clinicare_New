# 📋 Bulk Add Users - Complete Guide

## 🎯 Overview

The **Bulk Add Users** feature allows clinic admins to quickly import multiple students and their parent accounts from a masterlist. This is perfect for the start of a school year or when onboarding an entire class.

---

## ✨ Features

### What It Does:
- ✅ **Create Student Accounts** - Bulk import student records with all details
- ✅ **Auto-Create Parent Accounts** - Automatically creates parent accounts from masterlist
- ✅ **Auto-Link Parents to Students** - Links parent accounts to their children
- ✅ **Smart Duplicate Detection** - Skips existing emails, links existing parents
- ✅ **Default Password** - All accounts get password: `ndkc123`
- ✅ **Allergy Import** - Imports student allergies automatically
- ✅ **Progress Tracking** - Real-time progress bar during import
- ✅ **Error Reporting** - Detailed success/failure report
- ✅ **Preview Before Import** - Review all data before creating accounts

---

## 📝 Masterlist Format

### Standard Format:
```
Full Name | Email | Student ID | Allergies | Parents
```

### Example Entries:
```
samuel sanchez | samuelnash@gmail.com | 2022-345 | None | John Sanchez (john@email.com), Maria Sanchez (maria@email.com)
maria garcia | maria.garcia@gmail.com | 2022-346 | Peanuts, Penicillin | Pedro Garcia (pedro@email.com)
john doe | john.doe@gmail.com | 2022-347 | None | Jane Doe (jane@email.com), Bob Doe (bob@email.com)
emma wilson | emma@student.com | 2022-348 | Shellfish | Sarah Wilson (sarah@email.com)
alex johnson | alex@student.com | 2022-349 | None | None
```

### Field Details:

#### 1. **Full Name** (Required)
- Student's complete name
- Example: `samuel sanchez`, `Maria Garcia`

#### 2. **Email** (Required)
- Student's email address
- Must be unique
- Must be valid email format
- Example: `samuelnash@gmail.com`

#### 3. **Student ID** (Required)
- Unique student identifier
- Format: `YYYY-XXX` (Year-Number)
- Used to determine grade level automatically
- Example: `2022-345`, `2023-001`

#### 4. **Allergies** (Optional)
- Comma-separated list of allergies
- Use `None` if no allergies
- Examples:
  - `None`
  - `Peanuts`
  - `Peanuts, Penicillin, Shellfish`

#### 5. **Parents** (Optional)
- Format: `Name (email), Name (email)`
- Multiple parents separated by commas
- Each parent: `Full Name (email@example.com)`
- Use `None` if no parents to link
- Examples:
  - `John Sanchez (john@email.com)`
  - `John Sanchez (john@email.com), Maria Sanchez (maria@email.com)`
  - `None`

---

## 🚀 How to Use

### Step 1: Access Bulk Add
1. Navigate to **User Management** page
2. Click the **"Bulk Add Users"** button (next to "Add New User")

### Step 2: Prepare Your Masterlist
1. Click **"Download Sample"** to get template
2. Prepare your data in the correct format
3. Each line = one student entry
4. Use pipe `|` or tab to separate fields

### Step 3: Paste & Parse
1. Paste your masterlist into the text area
2. You'll see line count at the bottom
3. Click **"Parse & Preview"**
4. System validates format and shows errors if any

### Step 4: Review Preview
Preview shows:
- ✅ Number of students to create
- ✅ Each student's details
- ✅ Allergies (if any)
- ✅ Parent accounts to create/link
- ✅ Any parsing errors
- ✅ Default password reminder: `ndkc123`

### Step 5: Confirm & Import
1. Review all entries carefully
2. Click **"Create X Students + Parents"**
3. Watch progress bar
4. Wait for completion (don't close modal!)

### Step 6: Review Results
Results show:
- ✅ Total successful creations
- ❌ Total failed creations
- Detailed list of each account created
- Error messages for failures
- Student vs Parent badges

---

## 🎓 Grade Level Assignment

### How It Works:
The system automatically determines grade level from Student ID:

**Student ID Format:** `YYYY-XXX`
- `YYYY` = Year student started
- `XXX` = Sequential number

**Grade Calculation:**
```
Current Year - Student Year = Years Completed
```

**Examples (assuming current year is 2026):**
- `2022-345` → 2026 - 2022 = 4 years → **4th Year College**
- `2023-346` → 2026 - 2023 = 3 years → **3rd Year College**
- `2024-347` → 2026 - 2024 = 2 years → **2nd Year College**
- `2025-348` → 2026 - 2025 = 1 year → **1st Year College**
- `2026-349` → 2026 - 2026 = 0 years → **1st Year College** (default)

**Note:** If year can't be determined, defaults to **1st Year College**

---

## 🔐 Account Details

### Student Accounts:
- **Email:** From masterlist
- **Password:** `ndkc123` (default)
- **Role:** `student`
- **Grade:** Auto-determined from Student ID
- **Student ID:** From masterlist
- **Allergies:** From masterlist

### Parent Accounts:
- **Email:** From masterlist
- **Password:** `ndkc123` (default)
- **Role:** `parent`
- **Linked Students:** Auto-linked to their children
- **Smart Linking:** If parent email exists, just adds student link

---

## 🛡️ Smart Features

### 1. Duplicate Detection
- **Student Email Exists:** Skips creation, shows error
- **Parent Email Exists:** Links to existing parent account
- **No Overwrites:** Never overwrites existing accounts

### 2. Parent Account Handling
- **New Parent:** Creates account + links to student
- **Existing Parent:** Just adds student link (no duplicate)
- **Multiple Children:** One parent can link to many students

### 3. Error Handling
- **Invalid Email:** Caught during parsing
- **Missing Fields:** Shows line number and issue
- **Creation Failures:** Detailed error message per account
- **Partial Success:** Shows which succeeded, which failed

---

## 📊 Example Scenarios

### Scenario 1: New Student with Two Parents
```
emma wilson | emma@student.com | 2022-123 | Peanuts | John Wilson (john@email.com), Sarah Wilson (sarah@email.com)
```

**Result:**
- ✅ 1 student account created
- ✅ 2 parent accounts created
- ✅ Both parents linked to Emma
- ✅ Emma's allergy (Peanuts) recorded

### Scenario 2: Student with Existing Parent
```
alex wilson | alex@student.com | 2023-124 | None | Sarah Wilson (sarah@email.com)
```

**Result:**
- ✅ 1 student account created
- ℹ️ Sarah already exists (from Scenario 1)
- ✅ Sarah now linked to both Emma AND Alex
- ✅ No duplicate parent account

### Scenario 3: Student with No Parents
```
solo student | solo@student.com | 2024-125 | None | None
```

**Result:**
- ✅ 1 student account created
- ℹ️ No parent accounts created
- ℹ️ Student can still use clinic services

---

## ⚠️ Common Errors & Solutions

### Error: "Invalid email format"
**Problem:** Email doesn't have @ or domain
**Solution:** Use valid email: `user@domain.com`

### Error: "Email already exists"
**Problem:** Student email is already registered
**Solution:** Use different email or edit existing account

### Error: "Missing name or email"
**Problem:** Required fields are empty
**Solution:** Ensure all lines have at least Name, Email, Student ID

### Error: "Invalid format - need at least Name, Email, Student ID"
**Problem:** Not enough fields in line
**Solution:** Check pipe `|` separators, ensure 5 fields minimum

### Error: "Line X: ..."
**Problem:** Specific line has formatting issue
**Solution:** Go to line X in your masterlist and fix format

---

## 💡 Tips & Best Practices

### Preparation:
1. **Download Sample First** - Use as template
2. **Test with 2-3 Entries** - Verify format works
3. **Check Emails** - Ensure all emails are valid
4. **Backup Data** - Keep copy of masterlist

### During Import:
1. **Review Preview Carefully** - Check all details before import
2. **Don't Close Modal** - Wait for completion
3. **Note Errors** - Review error list if any
4. **Save Results** - Screenshot or note which succeeded

### After Import:
1. **Verify in User Table** - Check accounts were created
2. **Test Login** - Test a few accounts with password `ndkc123`
3. **Remind Users** - Tell students/parents to change password
4. **Update Any Errors** - Manually fix any failed imports

---

## 🔄 After Import Actions

### 1. Notify Users
Send email to all new users with:
- ✉️ Their login email
- 🔑 Default password: `ndkc123`
- 🔒 Instruction to change password on first login
- 🌐 Link to clinic portal

### 2. Verify Accounts
- ✅ Check User Management table
- ✅ Verify student count matches
- ✅ Verify parent count matches
- ✅ Check parent-student links

### 3. Handle Errors
For any failed imports:
- 📝 Note the error message
- 🔍 Fix the issue (invalid email, duplicate, etc.)
- ➕ Use "Add New User" button to manually create
- 🔗 Link parents manually if needed

---

## 📈 Performance

### Limits:
- **No Hard Limit** - Can import hundreds of users
- **Recommended:** 50-100 users per batch
- **Progress Bar** - Shows real-time progress
- **Processing Time:** ~2-3 seconds per student + parents

### Large Imports:
If importing 200+ users:
1. Split into batches of 50-100
2. Import first batch
3. Verify results
4. Import next batch
5. Repeat until complete

---

## 🎉 Success Metrics

After bulk import, you should see:
- ✅ Green checkmarks for successful accounts
- 📊 Summary showing total created
- 📋 Detailed list of each account
- 🔗 Parents properly linked to students
- 💾 All data saved to Firestore

---

## 🆘 Troubleshooting

### Issue: Modal won't open
**Solution:** Refresh page, try again

### Issue: Parse errors on valid data
**Solution:** Check for extra spaces, special characters, verify pipe `|` separator

### Issue: All imports failing
**Solution:** Check Firebase Authentication is enabled, check Firestore rules are deployed

### Issue: Parents not linking
**Solution:** Verify parent email format has parentheses: `Name (email@example.com)`

### Issue: Progress stuck
**Solution:** Wait 2-3 minutes, check console for errors, may need to refresh and retry

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firestore rules deployed
3. Check Firebase Authentication enabled
4. Review error messages carefully
5. Try smaller batch (5-10 users)

---

## ✨ Example Complete Masterlist

```
samuel sanchez | samuelnash@gmail.com | 2022-345 | None | John Sanchez (john@email.com), Maria Sanchez (maria@email.com)
maria garcia | maria.garcia@gmail.com | 2022-346 | Peanuts, Penicillin | Pedro Garcia (pedro@email.com)
john doe | john.doe@gmail.com | 2022-347 | None | Jane Doe (jane@email.com), Bob Doe (bob@email.com)
emma wilson | emma@student.com | 2022-348 | Shellfish | Sarah Wilson (sarah@email.com)
alex johnson | alex@student.com | 2023-349 | None | Mike Johnson (mike@email.com)
sophia lee | sophia@student.com | 2023-350 | Dairy | Lisa Lee (lisa@email.com)
liam brown | liam@student.com | 2024-351 | None | Tom Brown (tom@email.com), Amy Brown (amy@email.com)
olivia davis | olivia@student.com | 2024-352 | Eggs | Susan Davis (susan@email.com)
noah miller | noah@student.com | 2025-353 | None | None
ava taylor | ava@student.com | 2025-354 | Nuts | Chris Taylor (chris@email.com)
```

**This will create:**
- ✅ 10 student accounts
- ✅ 13 parent accounts (some parents have multiple children)
- ✅ All students properly linked to their parents
- ✅ All allergies recorded
- ✅ All using default password: `ndkc123`

---

## 🎊 Congratulations!

You now have a powerful bulk import system that can save hours of manual data entry. Use it wisely and enjoy the efficiency!

**Happy importing! 🚀**
