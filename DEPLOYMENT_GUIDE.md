# 🚀 SRB ClinicCare - Complete Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] Firebase project created
- [ ] Firebase Authentication enabled
- [ ] Firestore database created
- [ ] EmailJS account set up (for parent notifications)
- [ ] All environment variables configured

---

## 🔥 Step 1: Firebase Console Setup

### 1.1 Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `srb-cliniccare` (or your choice)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** authentication
4. Click **Save**

### 1.3 Create Firestore Database
1. Go to **Firestore Database**
2. Click **Create database**
3. Select **Start in production mode**
4. Choose your location (closest to your users)
5. Click **Enable**

---

## 🔐 Step 2: Deploy Firestore Security Rules

### Option A: Using Firebase Console

1. Go to **Firestore Database** → **Rules** tab
2. **COPY** all content from `/FIRESTORE_RULES.txt`
3. **PASTE** into the rules editor
4. Click **Publish**

### Option B: Using Firebase CLI

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

---

## 📄 Complete Firestore Rules (Copy This)

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.role;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserRole(request.auth.uid) == 'admin';
    }
    
    function isNurse() {
      return isAuthenticated() && getUserRole(request.auth.uid) == 'nurse';
    }
    
    function isAdminOrNurse() {
      return isAuthenticated() && (getUserRole(request.auth.uid) == 'admin' || getUserRole(request.auth.uid) == 'nurse');
    }
    
    // USERS
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    // STUDENTS
    match /students/{studentId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdminOrNurse();
      allow delete: if isAdmin();
    }
    
    // CLINIC VISITS
    match /clinicVisits/{visitId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdminOrNurse();
      allow delete: if isAdmin();
    }
    
    // INVENTORY (NEW)
    match /inventory/{itemId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdminOrNurse();
      allow delete: if isAdmin();
    }
    
    // INVENTORY TRANSACTIONS (NEW)
    match /inventoryTransactions/{transactionId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrNurse();
      allow update, delete: if false;
    }
    
    // ACTIVITY LOGS
    match /activityLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
    
    // SETTINGS
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // PARENT-STUDENT LINKS
    match /parentStudentLinks/{linkId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // ALLERGIES
    match /allergies/{allergyId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdminOrNurse();
      allow delete: if isAdmin();
    }
    
    // DENY ALL OTHER ACCESS
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 📧 Step 3: EmailJS Setup (Parent Notifications)

### 3.1 Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up for free account
3. Verify your email

### 3.2 Add Email Service
1. Go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail recommended)
4. Follow authentication steps
5. **Copy your Service ID** (e.g., `service_aip6vxq`)

### 3.3 Create Email Template
1. Go to **Email Templates**
2. Click **Create New Template**
3. Use this template:

```
Subject: {{subject}}

Dear {{to_name}},

This is to inform you that {{student_name}} ({{grade}}) visited the school clinic today.

Visit Details:
• Date & Time: {{visit_date}}
• Symptoms: {{symptoms}}
• Treatment Provided: {{treatment}}
• Pickup Required: {{pickup_required}}

{{#nurse_notes}}
Nurse's Notes: {{nurse_notes}}
{{/nurse_notes}}

Attended by: {{nurse_name}}

If you have any questions, please contact the school clinic.

Best regards,
Notre Dame of Kidapawan College
School Clinic
```

4. **Copy your Template ID** (e.g., `template_sk6tt9j`)

### 3.4 Get Public Key
1. Go to **Account** → **General**
2. **Copy your Public Key** (e.g., `oS5baCpPFDl1rgVA`)

---

## 🔧 Step 4: Configure Application

### 4.1 Firebase Configuration

Your EmailJS credentials should already be in the system:
- **Public Key**: `oS5baCpPFDl1rgVA`
- **Service ID**: `service_aip6vxq`
- **Template ID**: `template_sk6tt9j`

These will be stored in Firestore automatically during first-time setup.

---

## 👨‍💼 Step 5: Create First Admin User

### Manual Method (Firebase Console)

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter:
   - **Email**: `admin@ndkc.edu.ph` (or your email)
   - **Password**: Create a secure password
4. Click **Add user**
5. **Copy the User UID**

6. Go to **Firestore Database**
7. Create a new collection: `users`
8. Add document with UID from step 5
9. Add fields:
   ```
   email: "admin@ndkc.edu.ph"
   name: "System Administrator"
   role: "admin"
   createdAt: [timestamp]
   ```
10. Click **Save**

---

## 🎉 Step 6: Launch Application

### 6.1 First Login
1. Open the application
2. You'll see the **First Time Setup** screen
3. Login with your admin credentials
4. The system will auto-configure:
   - ✅ Collections created
   - ✅ EmailJS settings saved
   - ✅ Sample data initialized (optional)

### 6.2 Verify Setup
1. Check that all collections exist in Firestore:
   - `users` ✓
   - `students` ✓
   - `clinicVisits` ✓
   - `inventory` ✓ (NEW)
   - `inventoryTransactions` ✓ (NEW)
   - `settings` ✓
   - `activityLogs` ✓

---

## 👥 Step 7: Create User Accounts

### From Admin Dashboard

1. Go to **User Management**
2. Click **Add User**
3. Fill in details:
   - Name
   - Email
   - Role (Admin/Nurse/Parent/Student)
   - Password
4. For **Parents**: Link to student(s)
5. For **Students**: Assign grade level
6. Click **Create User**

---

## 📦 Step 8: Set Up Inventory

### Add Initial Inventory Items

1. Go to **Inventory** in sidebar
2. Click **Add Item**
3. Add common medicines:
   - Paracetamol 500mg (tablets)
   - Biogesic Syrup (bottles)
   - Band-Aid strips (pcs)
   - Alcohol 70% (bottles)
   - Cotton balls (pcs)

4. Add medical equipment:
   - Thermometer (pcs)
   - Blood Pressure Monitor (pcs)
   - Stethoscope (pcs)
   - First Aid Kit (pcs)

5. Set appropriate:
   - Stock quantities
   - Minimum stock levels
   - Expiration dates (for medicines)

---

## ✅ Step 9: Testing

### Test Each Feature

**Admin Tests:**
- [ ] Login as admin
- [ ] View analytics dashboard
- [ ] Create nurse account
- [ ] Create student account
- [ ] Create parent account and link to student
- [ ] Add inventory item
- [ ] View activity logs

**Nurse Tests:**
- [ ] Login as nurse
- [ ] Search for student
- [ ] Log clinic visit
- [ ] Dispense medicine from inventory
- [ ] Verify stock deducted
- [ ] Generate medical certificate
- [ ] Check parent notification sent

**Parent Tests:**
- [ ] Login as parent
- [ ] View child's health records
- [ ] Check notifications received

**Student Tests:**
- [ ] Login as student
- [ ] View own health records

---

## 🐛 Troubleshooting

### Issue: Permission Denied Errors

**Solution:**
1. Verify Firestore rules are deployed correctly
2. Check user has correct role in `users` collection
3. Ensure user is logged in
4. Clear browser cache and re-login

### Issue: EmailJS Not Sending

**Solution:**
1. Go to **Settings** → **Email Configuration**
2. Verify all three credentials are entered:
   - Public Key
   - Service ID
   - Template ID
3. Test email from EmailJS dashboard
4. Check email service is connected

### Issue: Inventory Stock Not Updating

**Solution:**
1. Check Firestore rules allow `inventory` writes
2. Verify user role is Admin or Nurse
3. Check browser console for errors
4. Ensure inventory item exists before dispensing

### Issue: Medical Certificate Not Generating

**Solution:**
1. Check visit was logged successfully
2. Verify visit ID is valid
3. Clear browser cache
4. Check for console errors

---

## 🔒 Security Best Practices

### 1. **Strong Passwords**
- Minimum 8 characters
- Include uppercase, lowercase, numbers, symbols
- Use password manager

### 2. **Regular Backups**
- Export Firestore data monthly
- Keep backups secure
- Test restore process

### 3. **Audit Logs**
- Review activity logs weekly
- Monitor for suspicious activity
- Investigate permission errors

### 4. **Role Management**
- Limit admin accounts
- Review user roles quarterly
- Remove inactive users

### 5. **Email Security**
- Use official school email domain
- Enable two-factor authentication
- Monitor email delivery

---

## 📊 Monitoring

### Daily Checks
- [ ] System accessible
- [ ] Login working
- [ ] Clinic visits being logged
- [ ] Notifications sending

### Weekly Checks
- [ ] Review activity logs
- [ ] Check inventory levels
- [ ] Verify data integrity
- [ ] Update expired items

### Monthly Checks
- [ ] Export database backup
- [ ] Review user accounts
- [ ] Check storage usage
- [ ] Update documentation

---

## 📱 Mobile Access

The application is fully responsive and works on:
- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

**Recommended Browsers:**
- Chrome (recommended)
- Firefox
- Safari
- Edge

---

## 📞 Support Contacts

**Technical Issues:**
- Email: [Your support email]
- Phone: [Your support phone]

**Emergency Support:**
- Contact: [Emergency contact]
- Available: 24/7

---

## 📚 Additional Resources

- **User Guide**: `/QUICK_REFERENCE.md`
- **Inventory Guide**: `/INVENTORY_SYSTEM_GUIDE.md`
- **System Overview**: `/SYSTEM_OVERVIEW.md`
- **Medical Certificate Guide**: `/MEDICAL_CERTIFICATE_GUIDE.md`

---

## ✅ Deployment Checklist

- [ ] Firebase project created
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Security rules deployed
- [ ] First admin user created
- [ ] EmailJS configured
- [ ] Application tested
- [ ] Inventory items added
- [ ] Nurse accounts created
- [ ] Student accounts created
- [ ] Parent accounts created and linked
- [ ] Test clinic visit logged
- [ ] Medical certificate generated
- [ ] Parent notification received
- [ ] Backup procedures documented
- [ ] Team trained
- [ ] Documentation reviewed

---

## 🎓 Training Schedule

### Week 1: Administrators (2 hours)
- System overview
- User management
- Security settings
- Backup procedures

### Week 2: Nurses (3 hours)
- Login and navigation
- Logging clinic visits
- Medicine dispensing
- Inventory management
- Certificate generation

### Week 3: Parents (30 minutes)
- Login process
- Viewing health records
- Understanding notifications

### Week 4: Go-Live Support
- On-site assistance
- Real-time troubleshooting
- Final adjustments

---

## 🚀 Launch Day Checklist

**Morning:**
- [ ] System health check
- [ ] All users have accounts
- [ ] Inventory stocked
- [ ] Backup completed
- [ ] Support team ready

**During Launch:**
- [ ] Monitor logs in real-time
- [ ] Respond to support requests
- [ ] Document any issues
- [ ] Provide on-site assistance

**End of Day:**
- [ ] Review day's activity
- [ ] Address any issues
- [ ] Update documentation
- [ ] Prepare for next day

---

**Deployed by:** SRB Development Team  
**Version:** 2.0.0  
**Date:** April 2026  
**Status:** ✅ Production Ready

---

**🎉 Congratulations on deploying SRB ClinicCare! 🎉**
