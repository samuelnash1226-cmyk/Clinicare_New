# 📱 PhilSMS SMS Integration - ACTIVE & CONNECTED

Your clinic system (`NDKC ClinicCare`) is now configured with **PhilSMS** (`https://dashboard.philsms.com`)! 🎉

---

## 📋 Configured Credentials

```
Provider: PhilSMS (API v3)
Endpoint: https://dashboard.philsms.com/api/v3/sms/send
API Token: 2673|hSdMIVBzdXRXdKFpognsu6Q3th4zqk515t2knTYc6b83cc45
Default Sender ID: PhilSMS
Active Units: 143 SMS Units (expires April 2027)
```

---

## 🚀 How It Works:

### 1. Automatic SMS on Clinic Visits
1. A nurse logs a student's clinic visit in **Add Visit Form**.
2. If **Notify Parent Immediately** is checked and the parent has a Philippine mobile number (`09XXXXXXXXX` or `639XXXXXXXXX`), the system automatically:
   - Formats the number to `639XXXXXXXXX`.
   - Compresses the notification to a single SMS (under 160 characters to conserve credits).
   - Sends the SMS via PhilSMS API.
   - Also sends the email notification via EmailJS as usual.

### 2. Manage via Settings Page
1. Log into the Clinic App as an **Admin**.
2. Go to **Settings** > **SMS Notifications (PhilSMS)**.
3. You can review your API token, update the Sender ID (e.g. if NDKC registers an approved custom 11-char sender ID), and save.
4. You can also run the **Live PhilSMS Diagnostic Test** by entering any mobile number and pressing **Send Test SMS**.

### 3. Quick Standalone Test File
You can double-click **`test-philsms.html`** in your project folder to open a test tool directly in your browser without logging in.

---

## 📱 SMS Format Example:
```
Dear Maria Santos,

Juan Dela Cruz (Grade 10-A) visited clinic.

Symptoms: Fever, headache
Treatment: Paracetamol given
Nurse: Nurse Ana

Pickup needed: NO

-NDKC Clinic
```

