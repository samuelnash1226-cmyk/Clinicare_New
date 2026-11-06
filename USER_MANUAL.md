# 🏥 SRB ClinicCare — Complete User Manual & Operating Guide

Welcome to the **SRB ClinicCare** Health Management System. This manual provides step-by-step instructions for all user roles—Administrators, Clinic Nurses, Parents, and Students/Personnel—to operate the clinic management, visit logging, medical certification, bed tracking, and inventory systems effectively.

---

## 📑 Table of Contents

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Getting Started & Authentication](#3-getting-started--authentication)
   - [First-Time System Setup](#first-time-system-setup)
   - [Logging In & Out](#logging-in--out)
4. [Nurse & Healthcare Staff Guide](#4-nurse--healthcare-staff-guide)
   - [The Nurse Dashboard](#the-nurse-dashboard)
   - [Logging a Clinic Visit (Step-by-Step)](#logging-a-clinic-visit-step-by-step)
   - [Dispensing Medicine & Auto-Deduction](#dispensing-medicine--auto-deduction)
   - [Assigning a Clinic Bed](#assigning-a-clinic-bed)
   - [Generating Medical Certificates & Excuse Slips](#generating-medical-certificates--excuse-slips)
   - [Managing Inventory & Supplies](#managing-inventory--supplies)
   - [Managing Clinic Beds](#managing-clinic-beds)
   - [Viewing Visit History](#viewing-visit-history)
5. [Administrator Guide](#5-administrator-guide)
   - [Admin Analytics Dashboard](#admin-analytics-dashboard)
   - [User Management & Role Assignment](#user-management--role-assignment)
   - [Student & Personnel Health Records](#student--personnel-health-records)
   - [Bulk Adding Users (CSV / Excel Import)](#bulk-adding-users-csv--excel-import)
   - [System Settings & Notification Gateways](#system-settings--notification-gateways)
   - [Activity Audit Logs](#activity-audit-logs)
6. [Parent Portal Guide](#6-parent-portal-guide)
   - [Accessing Linked Children](#accessing-linked-children)
   - [Reviewing Clinic Visits & Health Records](#reviewing-clinic-visits--health-records)
   - [Understanding Email & SMS Alerts](#understanding-email--sms-alerts)
7. [Student & Personnel Portal Guide](#7-student--personnel-portal-guide)
   - [Viewing Personal Health Cards](#viewing-personal-health-cards)
   - [Viewing Visit History & Excuses](#viewing-visit-history--excuses)
8. [Offline Mode & Data Synchronization](#8-offline-mode--data-synchronization)
9. [Troubleshooting & Frequently Asked Questions (FAQ)](#9-troubleshooting--frequently-asked-questions-faq)

---

## 1. System Overview & Architecture

**SRB ClinicCare** is an integrated school clinic management system built with real-time database capabilities, offline resilience, and automatic parent notification features.

### Key Capabilities:
- **Instant Patient Intake:** Rapid search for students and school personnel by ID or Name.
- **Smart Medicine Dispensing:** Automatic inventory deduction upon clinic visit logging.
- **Bed Rest Management:** Real-time occupancy tracking for clinic beds across school levels (IBED, Senior High School, College).
- **Auto Medical Certificates:** Instantly generate official Medical Certificates, Excuse Slips, or Visit Receipts with PDF/Image export and direct printing.
- **Multi-Channel Alerts:** Real-time parent notifications via Email (EmailJS) and SMS (FMCSMS).
- **Offline Reliability:** Automatic offline detection with local caching and status indicators.

---

## 2. User Roles & Permissions

| Role | Access Scope | Key Permissions |
| :--- | :--- | :--- |
| **Admin** | Full System Access | User management, bulk import, system settings, activity logs, clinic visits, beds, inventory, student/personnel cards. |
| **Nurse** | Clinical Operations | Log visits, dispense medications, manage beds, issue medical certificates, update inventory, view visit histories and health cards. |
| **Parent** | Guardian Portal | View health records, allergy lists, and visit histories for linked children; receive SMS/email alerts. |
| **Student / Personnel** | Personal Portal | View their own medical profile, vitals history, clinic visits, and medical excuses. |

---

## 3. Getting Started & Authentication

### First-Time System Setup
*(Only required on initial clinic deployment)*

1. Navigate to the ClinicCare web application address.
2. If the system detects no registered administrator, the **First-Time Setup** screen appears.
3. Enter the Administrator's **Full Name**, **Email Address**, and secure **Password**.
4. Click **"Initialize System & Create Admin Account"**.
5. Once complete, you will be redirected to the Admin Dashboard.

### Logging In & Out
1. Go to the **Login Page**.
2. Enter your registered **Email Address** and **Password**.
3. Click **"Sign In"**. The system automatically directs you to your role-specific dashboard.
4. To sign out, click the **"Logout"** icon at the bottom of the left sidebar.

> [!NOTE]
> Passwords must be at least 6 characters long as enforced by Firebase Authentication.

---

## 4. Nurse & Healthcare Staff Guide

### The Nurse Dashboard
When logged in as a Nurse, the primary screen displays:
- **Quick Statistics:** Active visits today, students currently resting on beds, low stock warnings.
- **Recent Visits:** A real-time stream of today's patient visits.
- **Quick Action Button:** The prominent green **"+ Add Visit"** button located at the top right.

---

### Logging a Clinic Visit (Step-by-Step)

The core function of the clinic is logging student or personnel visits.

```
[Click "+ Add Visit"]
        │
        ▼
[Search Student / Personnel] ──► (View Allergies & Medical Conditions)
        │
        ▼
[Record Vital Signs & Symptoms] ──► (Temperature, BP, Pulse, Chief Complaints)
        │
        ▼
[Dispense Medicine (Optional)] ──► (Real-time stock validation & auto-deduction)
        │
        ▼
[Assign Clinic Bed (Optional)] ──► (Select available bed & set rest duration)
        │
        ▼
[Parent Notification Toggles] ──► (Enable Email / SMS / Request Pickup)
        │
        ▼
[Click "Log Visit"] ──► Auto-opens Medical Certificate Modal 🎉
```

#### Detailed Steps:
1. Click the green **"+ Add Visit"** button on the Nurse Dashboard or Sidebar.
2. **Select Patient Type:**
   - Choose **Student** or **Personnel**.
3. **Search Patient:**
   - Type the Student/Personnel Name or ID Number into the search field.
   - Select the patient from the autocomplete list.
   - **Allergy Alert:** Any registered allergies or chronic conditions will instantly display in high-visibility alert badges.
4. **Record Vital Signs:**
   - Body Temperature (°C)
   - Blood Pressure (mmHg)
   - Pulse Rate (bpm) / Respiratory Rate
5. **Symptoms & Chief Complaint:**
   - Check standard symptom boxes (e.g., Headache, Fever, Stomachache, Dizziness, Injury) or enter custom symptoms.
6. **Treatment & Interventions:**
   - Describe non-pharmacological care (e.g., "Wound cleaned with antiseptic, ice pack applied, 30 min bed rest").
7. **Medicine Dispensing:**
   - If administering medication, search the medicine in the **Dispense Medication** field.
   - Enter the dosage/quantity (e.g., `1 tablet`). The system verifies stock levels instantly.
8. **Bed Rest Assignment:**
   - If the patient needs to rest in the clinic, select an available bed from the dropdown (IBED, SHS, or College ward).
9. **Parent Notifications:**
   - **Send Email Notification:** Toggle ON to automatically email the parent via EmailJS.
   - **Send SMS Notification:** Toggle ON to send an instant SMS alert to the parent's mobile phone via FMCSMS.
   - **Needs Pickup:** Check this box if the student is unfit for class and requires parental pick-up.
10. Click **"Log Visit"**.
11. A success confirmation appears, and the **Medical Certificate / Visit Slip Generator** automatically launches after 1.5 seconds.

---

### Dispensing Medicine & Auto-Deduction
- The clinic intake form is directly integrated with the inventory database.
- When a medicine is chosen, the system displays the current available stock.
- You cannot dispense more than the available stock.
- Upon saving the visit, the stock count is automatically deducted in the database, and an inventory transaction is recorded.

---

### Assigning a Clinic Bed
1. When selecting a bed in the visit form, choose the bed corresponding to the patient's campus (IBED, Senior High School, College).
2. The bed's status immediately switches to **Occupied**.
3. The patient's name, grade/section, and check-in time are displayed on the **Bed Management** board.
4. When the student is ready to return to class, go to the **Bed Management** tab and click **"Release Bed"** to mark it as clean and available.

---

### Generating Medical Certificates & Excuse Slips

Once a visit is logged (or from the Visit History list), the **Medical Certificate Modal** opens.

#### Three Available Certificate Types:
1. **Clinic Visit Proof (Standard Receipt):**
   - Ideal for general clinic documentation, routine visits, and basic confirmation.
2. **Medical Certificate (Official Document):**
   - Formatted with formal clinical phrasing (*"This is to certify that..."*), vitals, physical findings, and medical recommendations.
3. **Excuse Slip (Class Absence):**
   - Concise slip intended for class advisers and subject teachers excusing the student for a specified period.

#### Exporting & Printing:
- **Download PDF:** Generates a formatted PDF file for official digital records.
- **Download PNG / JPEG:** Generates a high-resolution image for digital sharing or messaging.
- **Print Certificate:** Triggers standard browser print dialog tailored to 8.5" x 11" or standard paper without UI headers or footers.

---

### Managing Inventory & Supplies

Navigate to **"Inventory"** from the left sidebar:
- **View Stock:** Medicines and medical equipment are organized in separate tabs.
- **Status Indicators:**
  - 🟢 **In Stock:** Sufficient quantities available.
  - 🟡 **Low Stock:** Stock has fallen below the item's minimum threshold.
  - 🔴 **Out of Stock:** 0 units remaining.
  - ⚠️ **Expiring Soon:** Medicines expiring within 30 days are flagged with red warnings.
- **Adding Items:** Click **"+ Add Item"**, specify Name, Category (Medicine vs. Equipment), Quantity, Unit (tablets, bottles, pcs), Expiration Date, and Minimum Alert Threshold.
- **Restocking:** Click **"Edit / Restock"** on any item to update current stock levels.

---

### Managing Clinic Beds

Navigate to **"Bed Management"** from the left sidebar:
- Switch tabs between **IBED**, **Senior High School**, and **College** clinic wards.
- See real-time occupancy, student name, and an elapsed timer indicating how long the patient has been resting.
- Click **"Release Bed"** when the patient leaves the clinic.
- Click **"+ Add Bed"** to create a new bed in any branch.

---

### Viewing Visit History

Navigate to **"Visit History"** from the left sidebar:
- Filter visits by **Date Range**, **Grade Level**, or **Student Name / ID**.
- View detailed clinical notes, administered medicines, and vital signs.
- Re-generate and print any past medical certificate or excuse slip by clicking **"View Certificate"**.

---

## 5. Administrator Guide

### Admin Analytics Dashboard
The Administrator Dashboard provides high-level health oversight for the school:
- Total visits (Today, This Week, This Month).
- Top complaints and symptom trends (e.g., seasonal flu outbreaks, headache patterns).
- Distribution by grade level and campus branch.
- Bed occupancy rates and inventory consumption alerts.

---

### User Management & Role Assignment
Navigate to **"User Management"** from the sidebar:
- **View All Users:** Filter users by role (**Nurse**, **Parent**, **Student**, **Personnel**, **Admin**).
- **Create Individual User:**
  1. Click **"+ Add User"**.
  2. Enter Name, Email, Password, and Role.
  3. If adding a **Student**, specify their Student ID, Grade/Section, and Parent's Email.
  4. If adding a **Parent**, link their children by entering the respective Student IDs.
- **Edit / Delete Users:** Update credentials, re-link students to parents, or remove accounts.

---

### Student & Personnel Health Records
Navigate to **"Student Cards"** or **"Personnel Cards"**:
- **Comprehensive Profile:** View full name, ID, sex, age, height, weight, and automated **BMI calculation** (Underweight, Normal, Overweight, Obese).
- **Medical Background:** Review and update known **Allergies**, **Chronic Conditions** (e.g., Asthma, Diabetes), and **Immunization History**.
- **Visit Log:** Timeline of every clinic visit the patient has made throughout their enrollment.

---

### Bulk Adding Users (CSV / Excel Import)

To rapidly populate students, parents, and personnel at the start of a school year:
1. In **User Management**, click **"Bulk Add Users"**.
2. Download the provided CSV template or prepare your spreadsheet.
3. Supported fields include:
   - `Student ID`, `Full Name`, `Grade Level`, `Parent Name`, `Parent Email`, `Parent Phone`, `Allergies`.
4. Upload the `.csv` or `.xlsx` file.
5. Review the validation preview table (the system checks for duplicates or missing fields).
6. Click **"Import Users"** to create accounts in batch.

---

### System Settings & Notification Gateways

Navigate to **"Settings"** from the sidebar:
- **Clinic Information:** Update School Name, Clinic Hours, Clinic Nurse in Charge, and Emergency Contact details.
- **EmailJS Configuration:**
  - Service ID, Template ID, and Public Key for automated parent emails.
  - Test button to verify email connectivity.
- **FMCSMS Gateway Setup:**
  - Configure SMS API Endpoint and Device Token for parent SMS alerts.
  - Test button to verify SMS delivery to a sample mobile number.

---

### Activity Audit Logs
The system maintains an immutable audit trail:
- Logs who logged in, created visits, dispensed medicine, modified inventory, or edited user records.
- Accessible directly within the Admin panel to support administrative compliance and security.

---

## 6. Parent Portal Guide

### Accessing Linked Children
1. Log in with your registered **Parent Account**.
2. The dashboard immediately displays cards for each child linked to your account.
3. Switch between children by clicking their respective tabs.

### Reviewing Clinic Visits & Health Records
- **Live Health Status:** Check whether your child is currently resting in the clinic.
- **Visit History:** View date, time, reported symptoms, administered treatments, and nurse notes.
- **Medical Details:** Review recorded allergies, vaccinations, and BMI statistics on file.

### Understanding Email & SMS Alerts
- **Visit Notification:** Sent automatically when your child enters the clinic and receives care.
- **Pickup Request Alert:** If marked with **Needs Pickup**, you will receive an urgent notification requesting you to fetch your child or coordinate with clinic staff.

---

## 7. Student & Personnel Portal Guide

### Viewing Personal Health Cards
1. Log in using your Student or Personnel email and password.
2. The **My Health Profile** dashboard displays:
   - Your Student/Personnel ID, Grade/Department, Blood Pressure, and BMI Category.
   - Your registered medical conditions and dietary/drug allergies.

### Viewing Visit History & Excuses
- Review past clinic consultations.
- Access digital copies of your **Excuse Slips** and **Clinic Visit Proofs** to submit to instructors or department heads.

---

## 8. Offline Mode & Data Synchronization

SRB ClinicCare includes offline monitoring to keep the clinic functional during school Wi-Fi or internet outages:

### Connection Indicators:
- 🟢 **Online:** Located at the bottom corner with a green badge and the timestamp of the latest synchronization.
- 🟡 **Offline:** If the internet connection drops, a notification banner appears: *"You are currently offline. Local cached records are active."*
- 🟢 **Reconnected:** When the network returns, an alert confirms connection restoration, and pending updates synchronize with Firebase Firestore.

> [!IMPORTANT]
> When offline, previously cached student lists and inventory items can be viewed. Full visit logging with parent SMS/Email requires an active connection to dispatch gateway requests.

---

## 9. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: The parent did not receive an SMS notification.
- **Cause 1:** The parent's mobile phone number is formatted incorrectly. Ensure numbers follow standard format (e.g., `09171234567` or `+639171234567`).
- **Cause 2:** The FMCSMS Android gateway device is offline or battery-drained. Check the FMCSMS phone application to ensure it is connected and has SMS credits.
- **Cause 3:** SMS toggle was unchecked during visit logging.

### Q2: How do I re-print an Excuse Slip from last week?
1. Go to **Visit History** in the sidebar.
2. Search for the student's name or date of the visit.
3. Click the **"Certificate"** or **"Print"** button on the corresponding visit row.
4. Select **Excuse Slip** and click **"Print Certificate"** or **"Download PDF"**.

### Q3: A medicine stock count is incorrect in the inventory.
1. As an **Admin** or **Nurse**, open the **Inventory** page.
2. Locate the medicine item.
3. Click **"Edit"**, update the stock count to reflect physical count, and save. The update will be registered in the audit transactions.

### Q4: I forgot my account password.
- Contact the Clinic Administrator. The Administrator can reset or update user credentials in the **User Management** console.

### Q5: How do I export visit reports for monthly clinic summaries?
- Navigate to **Visit History**, apply the desired date filter (e.g., the current month), and click **"Export CSV"** to download the records for reporting to school administration or the Department of Education.

---

*SRB ClinicCare Health Management System — Operating Manual*  
*Document Version: 2.0 | Confidential & Proprietary to SRB Clinic Operations*
