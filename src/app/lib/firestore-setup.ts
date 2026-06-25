import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, serverTimestamp, getDocs, updateDoc, increment, query, where, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import emailjs from 'emailjs-com';

export interface ClinicVisit {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  symptoms: string;
  temperature?: string;
  bloodPressure?: string;
  heartRate?: string;
  treatment: string;
  nurseEmail: string;
  nurseName: string;
  notifyParent: boolean;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
  pickupRequired: boolean;
  needsPickup?: boolean; // legacy field
  notes?: string;
  timestamp: any;
  createdAt?: any;
  status?: string;
  loggedBy?: string;
}

export async function initializeFirestore() {
  try {
    // Check if collections exist, if not create them with initial structure
    const collections = ['users', 'students', 'clinicVisits', 'notifications', 'activityLogs'];
    
    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        console.log(`Initializing ${collectionName} collection...`);
        // Collections will be created when first document is added
      }
    }
    
    console.log('Firestore initialization complete');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
}

export async function checkSystemInitialization() {
  try {
    const settingsRef = doc(db, 'settings', 'system');
    const settingsDoc = await getDoc(settingsRef);
    
    return settingsDoc.exists() && settingsDoc.data()?.initialized === true;
  } catch (error) {
    console.error('Error checking system initialization:', error);
    return false;
  }
}

export async function createSystemSettings(adminEmail: string) {
  try {
    const settingsRef = doc(db, 'settings', 'system');
    await setDoc(settingsRef, {
      initialized: true,
      adminEmail,
      createdAt: serverTimestamp(),
      version: '1.0.0'
    });
    
    console.log('System settings created successfully');
  } catch (error) {
    console.error('Error creating system settings:', error);
    throw error;
  }
}

export async function completeFirstTimeSetup(adminName: string, adminEmail: string, adminPassword: string) {
  try {
    // Create admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;

    // Create admin profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      name: adminName,
      email: adminEmail,
      role: 'admin',
      createdAt: serverTimestamp()
    });

    // Mark system as initialized
    await createSystemSettings(adminEmail);

    // Log activity
    await addDoc(collection(db, 'activityLogs'), {
      userId: user.uid,
      userEmail: adminEmail,
      userName: adminName,
      action: 'system_initialized',
      details: 'First-time setup completed',
      timestamp: serverTimestamp()
    });

    console.log('First-time setup completed successfully');
    return user;
  } catch (error) {
    console.error('Error completing first-time setup:', error);
    throw error;
  }
}

export async function logClinicVisit(visitData: {
  studentId: string;
  studentName: string;
  grade: string;
  symptoms: string;
  temperature?: string;
  bloodPressure?: string;
  heartRate?: string;
  treatment: string;
  nurseEmail: string;
  nurseName: string;
  notifyParent: boolean;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
  pickupRequired: boolean;
  needsPickup?: boolean;
  notes?: string;
  loggedBy?: string;
}) {
  try {
    // Build visit data object, only including fields that have values
    const visitRecord: any = {
      studentId: visitData.studentId,
      studentName: visitData.studentName,
      grade: visitData.grade,
      symptoms: visitData.symptoms,
      treatment: visitData.treatment,
      nurseEmail: visitData.nurseEmail,
      nurseName: visitData.nurseName,
      notifyParent: visitData.notifyParent,
      pickupRequired: visitData.pickupRequired,
      needsPickup: visitData.pickupRequired, // legacy support
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      status: visitData.pickupRequired ? 'pickup_required' : 'completed'
    };

    // Only add optional fields if they have values (not undefined)
    if (visitData.temperature) visitRecord.temperature = visitData.temperature;
    if (visitData.bloodPressure) visitRecord.bloodPressure = visitData.bloodPressure;
    if (visitData.heartRate) visitRecord.heartRate = visitData.heartRate;
    if (visitData.notes) visitRecord.notes = visitData.notes;
    if (visitData.parentEmail) visitRecord.parentEmail = visitData.parentEmail;
    if (visitData.parentName) visitRecord.parentName = visitData.parentName;

    // Create clinic visit record
    const visitRef = await addDoc(collection(db, 'clinicVisits'), visitRecord);

    console.log('✅ Clinic visit logged:', visitRef.id);

    // Log activity - only if we have valid data
    if (visitData.nurseEmail && visitData.nurseName) {
      await addDoc(collection(db, 'activityLogs'), {
        userEmail: visitData.nurseEmail,
        userName: visitData.nurseName,
        action: 'clinic_visit_created',
        details: `Created clinic visit for ${visitData.studentName}`,
        timestamp: serverTimestamp(),
        relatedId: visitRef.id
      });
    }

    // Send email and SMS notifications if parent notification is enabled
    if (visitData.notifyParent && visitData.parentEmail) {
      let emailSent = false;
      let smsSent = false;
      let emailError = '';
      let smsError = '';

      // Try to send email
      try {
        console.log('📧 Attempting to send email to:', visitData.parentEmail);

        await sendParentNotification({
          parentEmail: visitData.parentEmail,
          parentName: visitData.parentName || 'Parent',
          studentName: visitData.studentName,
          grade: visitData.grade,
          symptoms: visitData.symptoms,
          treatment: visitData.treatment,
          pickupRequired: visitData.pickupRequired,
          visitDate: new Date().toLocaleString(),
          nurseName: visitData.nurseName,
          notes: visitData.notes
        });

        emailSent = true;
        console.log('✅ Email sent successfully to:', visitData.parentEmail);
      } catch (error: any) {
        emailError = error.message;
        console.error('❌ Email error:', error.message);
      }

      // Try to send SMS if phone number provided
      if (visitData.parentPhone) {
        try {
          console.log('📱 Attempting to send SMS to:', visitData.parentPhone);

          await sendParentSMS({
            parentPhone: visitData.parentPhone,
            parentName: visitData.parentName || 'Parent',
            studentName: visitData.studentName,
            grade: visitData.grade,
            symptoms: visitData.symptoms,
            treatment: visitData.treatment,
            pickupRequired: visitData.pickupRequired,
            visitDate: new Date().toLocaleString(),
            nurseName: visitData.nurseName,
            notes: visitData.notes
          });

          smsSent = true;
          console.log('✅ SMS sent successfully to:', visitData.parentPhone);
        } catch (error: any) {
          smsError = error.message;
          console.error('❌ SMS error:', error.message);
        }
      }

      // Create notification record
      try {
        const notificationData: any = {
          parentEmail: visitData.parentEmail,
          parentPhone: visitData.parentPhone || '',
          studentId: visitData.studentId,
          studentName: visitData.studentName,
          type: visitData.pickupRequired ? 'pickup_required' : 'visit_notification',
          message: visitData.pickupRequired
            ? `${visitData.studentName} needs to be picked up from the clinic`
            : `${visitData.studentName} visited the clinic`,
          symptoms: visitData.symptoms,
          treatment: visitData.treatment,
          emailSent: emailSent,
          smsSent: smsSent,
          timestamp: serverTimestamp(),
          visitId: visitRef.id
        };

        // Only add error fields if they exist
        if (emailError) notificationData.emailError = emailError;
        if (smsError) notificationData.smsError = smsError;

        await addDoc(collection(db, 'notifications'), notificationData);
        console.log('✅ Notification record created in Firestore');
      } catch (notifError) {
        console.error('❌ Failed to create notification record:', notifError);
      }
    } else {
      if (visitData.notifyParent && !visitData.parentEmail) {
        console.warn('⚠️ Notify parent enabled but no parent email available');
      }
    }

    return visitRef.id;
  } catch (error) {
    console.error('❌ Error logging clinic visit:', error);
    throw error;
  }
}

export async function sendParentNotification(data: {
  parentEmail: string;
  parentName: string;
  studentName: string;
  grade: string;
  symptoms: string;
  treatment: string;
  pickupRequired: boolean;
  visitDate: string;
  nurseName: string;
  notes?: string;
  nurseEmail?: string;
  parentPhone?: string;
}) {
  console.log('📧 sendParentNotification called');
  console.log('📧 Target email:', data.parentEmail);
  
  try {
    // Get EmailJS credentials from settings
    console.log('🔍 Checking for EmailJS settings...');
    const settingsRef = doc(db, 'settings', 'emailjs');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      const errorMsg = '❌ EmailJS NOT CONFIGURED!\n\n' +
        '📝 TO FIX:\n' +
        '1. Go to https://www.emailjs.com and sign up (FREE)\n' +
        '2. Create an email service (Gmail/Outlook/etc)\n' +
        '3. Create an email template with these variables:\n' +
        '   - {{to_email}}, {{to_name}}, {{student_name}}, {{grade}}\n' +
        '   - {{symptoms}}, {{treatment}}, {{pickup_required}}\n' +
        '   - {{visit_date}}, {{nurse_name}}, {{subject}}\n' +
        '4. Get your Service ID, Template ID, and Public Key\n' +
        '5. In the app: Settings → Email Configuration\n' +
        '6. Enter your credentials and save\n\n' +
        `📋 Email that would have been sent to: ${data.parentEmail}\n` +
        `👤 Student: ${data.studentName} (${data.grade})\n` +
        `🩺 Symptoms: ${data.symptoms}\n` +
        `💊 Treatment: ${data.treatment}\n` +
        `🚗 Pickup Required: ${data.pickupRequired ? 'YES' : 'No'}`;
      
      console.warn(errorMsg);
      throw new Error('EmailJS not configured. Visit Settings to set up email notifications.');
    }

    const emailSettings = settingsDoc.data();
    const { serviceId, templateId, publicKey } = emailSettings;

    console.log('✅ EmailJS settings found');
    console.log('📝 Service ID:', serviceId ? '✓' : '✗');
    console.log('📝 Template ID:', templateId ? '✓' : '✗');
    console.log('📝 Public Key:', publicKey ? '✓' : '✗');

    if (!serviceId || !templateId || !publicKey) {
      const errorMsg = '❌ EmailJS credentials INCOMPLETE!\n\n' +
        `Service ID: ${serviceId ? '✓ Found' : '✗ Missing'}\n` +
        `Template ID: ${templateId ? '✓ Found' : '✗ Missing'}\n` +
        `Public Key: ${publicKey ? '✓ Found' : '✗ Missing'}\n\n` +
        'Go to Settings → Email Configuration and enter ALL credentials.';
      
      console.error(errorMsg);
      throw new Error('EmailJS credentials incomplete. Check Settings.');
    }

    // Send email using EmailJS
    console.log('📤 Sending email via EmailJS...');
    const templateParams = {
      to_email: data.parentEmail,
      to_name: data.parentName,
      student_name: data.studentName,
      grade: data.grade,
      symptoms: data.symptoms,
      treatment: data.treatment,
      pickup_required: data.pickupRequired ? 'YES - Please pick up your child immediately' : 'No',
      visit_date: data.visitDate,
      nurse_name: data.nurseName,
      nurse_notes: data.notes || 'None',
      subject: data.pickupRequired 
        ? `URGENT: ${data.studentName} needs to be picked up from clinic`
        : `Clinic Visit Notification for ${data.studentName}`
    };

    console.log('📋 Email template params:', {
      to: data.parentEmail,
      student: data.studentName,
      pickup: data.pickupRequired
    });

    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log('✅ ✅ ✅ Email sent successfully via EmailJS to:', data.parentEmail);
  } catch (error: any) {
    console.error('❌ Error in sendParentNotification:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    throw error;
  }
}

export async function updateEmailSettings(serviceId: string, templateId: string, publicKey: string) {
  try {
    const settingsRef = doc(db, 'settings', 'emailjs');
    await setDoc(settingsRef, {
      serviceId,
      templateId,
      publicKey,
      updatedAt: serverTimestamp()
    });

    console.log('EmailJS settings updated successfully');
  } catch (error) {
    console.error('Error updating EmailJS settings:', error);
    throw error;
  }
}

export async function getEmailSettings() {
  try {
    const settingsRef = doc(db, 'settings', 'emailjs');
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }

    return null;
  } catch (error) {
    console.error('Error getting EmailJS settings:', error);
    return null;
  }
}

// ===========================
// SMS NOTIFICATIONS (FMCSMS)
// ===========================

async function sendParentSMS(data: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  grade: string;
  symptoms: string;
  treatment: string;
  pickupRequired: boolean;
  visitDate: string;
  nurseName: string;
  notes?: string;
}) {
  console.log('📱 sendParentSMS called');
  console.log('📱 Target phone:', data.parentPhone);

  try {
    // Get FMCSMS credentials from settings
    console.log('🔍 Checking for FMCSMS settings...');
    const settingsRef = doc(db, 'settings', 'fmcsms');
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      console.warn('⚠️ FMCSMS not configured - skipping SMS');
      throw new Error('FMCSMS not configured.');
    }

    const smsSettings = settingsDoc.data();
    const { apiKey, senderName } = smsSettings;

    if (!apiKey || !senderName) {
      console.warn('⚠️ FMCSMS credentials incomplete - skipping SMS');
      throw new Error('FMCSMS credentials incomplete.');
    }

    console.log('✅ FMCSMS settings found');

    // Format phone number to international format (+639XXXXXXXXX)
    let phone = data.parentPhone.replace(/[\s\-\(\)\+]/g, '');
    if (phone.startsWith('0')) {
      phone = '63' + phone.substring(1);
    }
    if (!phone.startsWith('63')) {
      phone = '63' + phone;
    }
    const formattedPhone = '+' + phone;

    console.log('📱 Formatted phone:', data.parentPhone, '→', formattedPhone);

    // Format SMS message - must be under 160 characters
    const pickupStatus = data.pickupRequired ? 'YES' : 'NO';

    // Build message with character limit in mind
    let message = `Dear ${data.parentName},\n\n${data.studentName} (${data.grade}) visited clinic.\n\nSymptoms: ${data.symptoms}\nTreatment: ${data.treatment}\nTime: ${data.visitDate}\nNurse: ${data.nurseName}\n\nPickup needed: ${pickupStatus}\n\n-NDKC Clinic`;

    // Truncate if over 160 characters
    if (message.length > 160) {
      // Try shorter version without time
      message = `Dear ${data.parentName},\n\n${data.studentName} (${data.grade}) at clinic.\n\nSymptoms: ${data.symptoms}\nTreatment: ${data.treatment}\nNurse: ${data.nurseName}\n\nPickup: ${pickupStatus}\n\n-NDKC`;

      // If still too long, truncate symptoms and treatment
      if (message.length > 160) {
        const maxSymptoms = 20;
        const maxTreatment = 20;
        const symptoms = data.symptoms.length > maxSymptoms ? data.symptoms.substring(0, maxSymptoms) + '...' : data.symptoms;
        const treatment = data.treatment.length > maxTreatment ? data.treatment.substring(0, maxTreatment) + '...' : data.treatment;

        message = `Dear ${data.parentName},\n\n${data.studentName} at clinic.\n\nSymptoms: ${symptoms}\nTreatment: ${treatment}\n\nPickup: ${pickupStatus}\n\n-NDKC Clinic`;

        // Final truncation if still too long
        if (message.length > 160) {
          message = message.substring(0, 157) + '...';
        }
      }
    }

    console.log('📋 SMS message:', message);
    console.log('📋 SMS length:', message.length, 'characters');

    // Send SMS via FMCSMS API
    const response = await fetch('https://fortmed.org/web/FMCSMS/api/messages.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        SenderName: senderName,
        ToNumber: formattedPhone,
        MessageBody: message,
        FromNumber: '+639189876543',
      }),
    });

    const result = await response.json();
    console.log('📱 FMCSMS Response:', result);

    if (!response.ok) {
      throw new Error(`FMCSMS API Error: ${response.status} - ${JSON.stringify(result)}`);
    }

    console.log('✅ ✅ ✅ SMS sent successfully via FMCSMS!');
  } catch (error: any) {
    console.error('❌ Error in sendParentSMS:', error);
    throw error;
  }
}

export async function updateSMSSettings(apiKey: string, senderName: string) {
  try {
    const settingsRef = doc(db, 'settings', 'fmcsms');
    await setDoc(settingsRef, {
      apiKey,
      senderName,
      updatedAt: serverTimestamp()
    });

    console.log('FMCSMS settings updated successfully');
  } catch (error) {
    console.error('Error updating FMCSMS settings:', error);
    throw error;
  }
}

export async function getSMSSettings() {
  try {
    const settingsRef = doc(db, 'settings', 'fmcsms');
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }

    return null;
  } catch (error) {
    console.error('Error getting FMCSMS settings:', error);
    return null;
  }
}

// Initialize FMCSMS with your API key (run this once)
export async function initializeFMCSMS() {
  try {
    console.log('🚀 Initializing FMCSMS settings...');

    await updateSMSSettings(
      'fmcsms_c3a64b0e69a5419146f8a92257bdf178a88df25695e719bd',
      'NDKC ClinicCare'
    );

    console.log('✅ ✅ ✅ FMCSMS initialized successfully!');
    console.log('📱 SMS notifications are now enabled');
    console.log('');
    console.log('Settings:');
    console.log('  API Key: fmcsms_c3a64b0e69a5419146f8a92257bdf178a88df25695e719bd');
    console.log('  Sender Name: NDKC ClinicCare');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize FMCSMS:', error);
    throw error;
  }
}

// ===========================
// INVENTORY MANAGEMENT
// ===========================

export interface InventoryItem {
  id?: string;
  name: string;
  category: 'medicine' | 'equipment';
  stockQuantity: number;
  unit: string; // e.g., 'tablets', 'bottles', 'pcs'
  expirationDate?: Date | null; // for medicines
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  minStockLevel: number; // threshold for low stock alert
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
}

export interface MedicineDispensed {
  medicineId: string;
  medicineName: string;
  quantityGiven: number;
  unit: string;
  stockBefore: number;
  stockAfter: number;
}

// Add inventory item
export async function addInventoryItem(itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const itemRecord = {
      ...itemData,
      status: determineStockStatus(itemData.stockQuantity, itemData.minStockLevel),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const itemRef = await addDoc(collection(db, 'inventory'), itemRecord);
    console.log('✅ Inventory item added:', itemRef.id);
    return itemRef.id;
  } catch (error) {
    console.error('❌ Error adding inventory item:', error);
    throw error;
  }
}

// Update inventory item
export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
  try {
    const itemRef = doc(db, 'inventory', itemId);
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Recalculate status if stock quantity changed
    if (updates.stockQuantity !== undefined) {
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        const minLevel = updates.minStockLevel ?? itemDoc.data().minStockLevel;
        updateData.status = determineStockStatus(updates.stockQuantity, minLevel);
      }
    }

    await updateDoc(itemRef, updateData);
    console.log('✅ Inventory item updated:', itemId);
  } catch (error) {
    console.error('❌ Error updating inventory item:', error);
    throw error;
  }
}

// Dispense medicine (subtract stock)
export async function dispenseMedicine(
  medicineId: string,
  quantityDispensed: number,
  dispensedBy: string
): Promise<MedicineDispensed> {
  try {
    const medicineRef = doc(db, 'inventory', medicineId);
    const medicineDoc = await getDoc(medicineRef);

    if (!medicineDoc.exists()) {
      throw new Error('Medicine not found');
    }

    const medicineData = medicineDoc.data();
    const stockBefore = medicineData.stockQuantity;
    const stockAfter = stockBefore - quantityDispensed;

    if (stockAfter < 0) {
      throw new Error('Insufficient stock');
    }

    // Update stock
    await updateDoc(medicineRef, {
      stockQuantity: stockAfter,
      status: determineStockStatus(stockAfter, medicineData.minStockLevel),
      updatedAt: serverTimestamp(),
    });

    // Log dispensing activity
    await addDoc(collection(db, 'inventoryTransactions'), {
      itemId: medicineId,
      itemName: medicineData.name,
      type: 'dispensed',
      quantityChanged: -quantityDispensed,
      stockBefore,
      stockAfter,
      dispensedBy,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Medicine dispensed: ${medicineData.name} (${quantityDispensed} ${medicineData.unit})`);

    return {
      medicineId,
      medicineName: medicineData.name,
      quantityGiven: quantityDispensed,
      unit: medicineData.unit,
      stockBefore,
      stockAfter,
    };
  } catch (error) {
    console.error('❌ Error dispensing medicine:', error);
    throw error;
  }
}

// Determine stock status based on quantity and min level
function determineStockStatus(quantity: number, minLevel: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (quantity === 0) return 'out_of_stock';
  if (quantity <= minLevel) return 'low_stock';
  return 'in_stock';
}

// Get inventory statistics
export async function getInventoryStats() {
  try {
    const inventoryRef = collection(db, 'inventory');
    const snapshot = await getDocs(inventoryRef);
    
    let totalMedicines = 0;
    let totalEquipment = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.category === 'medicine') {
        totalMedicines++;
        
        // Check expiring soon
        if (data.expirationDate) {
          const expDate = data.expirationDate.toDate ? data.expirationDate.toDate() : new Date(data.expirationDate);
          if (expDate <= thirtyDaysFromNow) {
            expiringSoonCount++;
          }
        }
      } else {
        totalEquipment++;
      }

      if (data.status === 'low_stock' || data.status === 'out_of_stock') {
        lowStockCount++;
      }
    });

    return {
      totalMedicines,
      totalEquipment,
      lowStockCount,
      expiringSoonCount,
    };
  } catch (error) {
    console.error('❌ Error getting inventory stats:', error);
    throw error;
  }
}