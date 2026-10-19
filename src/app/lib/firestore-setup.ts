import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, serverTimestamp, getDocs, updateDoc, increment, query, where, Timestamp, writeBatch } from 'firebase/firestore';
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
  // Bed Rest fields
  needsBedRest?: boolean;
  bedId?: string | null;
  bedName?: string | null;
  bedStartTime?: any;
  bedEndTime?: any | null;
  bedNotes?: string;
}

export type BedBranch = 'IBED' | 'SHS' | 'College';

export function isFirestoreDocId(id?: string): boolean {
  if (!id) return true;
  return id.length >= 16 && id.length <= 32 && /^[a-zA-Z0-9]+$/.test(id);
}

export function getBranchFromGrade(grade?: string): BedBranch {
  if (!grade) return 'IBED';
  const g = grade.trim().toLowerCase();
  if (
    g.includes('college') ||
    g.includes('personnel') ||
    g.includes('staff') ||
    g.includes('faculty') ||
    g.includes('bs') ||
    g.includes('ba') ||
    g.includes('tertiary') ||
    g.includes('1st year') ||
    g.includes('2nd year') ||
    g.includes('3rd year') ||
    g.includes('4th year')
  ) {
    return 'College';
  }
  if (
    g.includes('grade 11') ||
    g.includes('grade 12') ||
    g.includes('shs') ||
    g.includes('senior high') ||
    g.includes('g11') ||
    g.includes('g12')
  ) {
    return 'SHS';
  }
  return 'IBED';
}

export interface Bed {
  id: string;
  bedName: string;
  branch: BedBranch;
  status: 'Available' | 'Occupied';
  currentVisitId: string | null;
  currentStudentName: string | null;
  currentBedStartTime?: any;
  createdAt?: any;
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

    // Initialize beds if none exist
    await initializeBeds();
    
    console.log('Firestore initialization complete');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
}

// ───────────────────────────── BED MANAGEMENT ─────────────────────────────

export async function initializeBeds() {
  try {
    const bedsRef = collection(db, 'beds');
    const snapshot = await getDocs(bedsRef);
    if (!snapshot.empty) return; // Already seeded

    const defaultBeds: Omit<Bed, 'id'>[] = [
      // IBED
      { bedName: 'IBED Bed 1', branch: 'IBED', status: 'Available', currentVisitId: null, currentStudentName: null },
      { bedName: 'IBED Bed 2', branch: 'IBED', status: 'Available', currentVisitId: null, currentStudentName: null },
      { bedName: 'IBED Bed 3', branch: 'IBED', status: 'Available', currentVisitId: null, currentStudentName: null },
      { bedName: 'IBED Bed 4', branch: 'IBED', status: 'Available', currentVisitId: null, currentStudentName: null },
      // SHS
      { bedName: 'SHS Bed 1', branch: 'SHS', status: 'Available', currentVisitId: null, currentStudentName: null },
      { bedName: 'SHS Bed 2', branch: 'SHS', status: 'Available', currentVisitId: null, currentStudentName: null },
      // College
      { bedName: 'College Bed 1', branch: 'College', status: 'Available', currentVisitId: null, currentStudentName: null },
      { bedName: 'College Bed 2', branch: 'College', status: 'Available', currentVisitId: null, currentStudentName: null },
    ];

    const batch = writeBatch(db);
    defaultBeds.forEach(bed => {
      const bedDocRef = doc(bedsRef);
      batch.set(bedDocRef, { ...bed, createdAt: serverTimestamp() });
    });
    await batch.commit();
    console.log('✅ Default beds initialized');
  } catch (error) {
    console.error('Error initializing beds:', error);
  }
}

export async function getBeds(branch?: BedBranch): Promise<Bed[]> {
  try {
    const bedsRef = collection(db, 'beds');
    let q;
    if (branch) {
      q = query(bedsRef, where('branch', '==', branch));
    } else {
      q = query(bedsRef);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bed));
  } catch (error) {
    console.error('Error fetching beds:', error);
    return [];
  }
}

export async function addBed(bedName: string, branch: BedBranch): Promise<string> {
  const bedsRef = collection(db, 'beds');
  const docRef = await addDoc(bedsRef, {
    bedName,
    branch,
    status: 'Available',
    currentVisitId: null,
    currentStudentName: null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteBed(bedId: string): Promise<void> {
  const bedRef = doc(db, 'beds', bedId);
  const bedSnap = await getDoc(bedRef);
  if (!bedSnap.exists()) throw new Error('Bed not found');
  const bedData = bedSnap.data() as Bed;
  if (bedData.status === 'Occupied') throw new Error('Cannot delete an occupied bed');
  // Use updateDoc to a deleted flag — or use deleteDoc
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(bedRef);
}

export async function releaseBed(bedId: string): Promise<void> {
  try {
    const bedRef = doc(db, 'beds', bedId);
    const bedSnap = await getDoc(bedRef);
    if (!bedSnap.exists()) return;
    const bedData = bedSnap.data() as Bed;

    const batch = writeBatch(db);

    // Mark bed as available
    batch.update(bedRef, {
      status: 'Available',
      currentVisitId: null,
      currentStudentName: null,
      currentBedStartTime: null,
    });

    // If there's an active visit, update its bedEndTime
    if (bedData.currentVisitId) {
      const visitRef = doc(db, 'clinicVisits', bedData.currentVisitId);
      batch.update(visitRef, { bedEndTime: serverTimestamp() });
    }

    await batch.commit();
    console.log('✅ Bed released:', bedId);
  } catch (error) {
    console.error('Error releasing bed:', error);
    throw error;
  }
}

export function formatBedRestDuration(startTime: any, endTime?: any): string {
  if (!startTime) return 'N/A';
  try {
    const start = startTime.toDate ? startTime.toDate() : (startTime.seconds ? new Date(startTime.seconds * 1000) : new Date(startTime));
    const end = endTime
      ? (endTime.toDate ? endTime.toDate() : (endTime.seconds ? new Date(endTime.seconds * 1000) : new Date(endTime)))
      : new Date();

    const diffMs = end.getTime() - start.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Just started';

    const totalMins = Math.floor(diffMs / (1000 * 60));
    if (totalMins < 1) return 'Less than 1 min';
    if (totalMins < 60) return `${totalMins} min${totalMins !== 1 ? 's' : ''}`;

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours} hr${hours !== 1 ? 's' : ''}${mins > 0 ? ` ${mins} min${mins !== 1 ? 's' : ''}` : ''}`;
  } catch (err) {
    return 'N/A';
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
  // Bed rest
  needsBedRest?: boolean;
  bedId?: string | null;
  bedName?: string | null;
  bedNotes?: string;
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
      status: visitData.pickupRequired ? 'pickup_required' : 'completed',
      // Bed rest defaults
      needsBedRest: visitData.needsBedRest || false,
    };

    // Bed rest fields
    if (visitData.needsBedRest && visitData.bedId) {
      visitRecord.bedId = visitData.bedId;
      visitRecord.bedName = visitData.bedName || null;
      visitRecord.bedStartTime = serverTimestamp();
      visitRecord.bedEndTime = null;
      visitRecord.bedNotes = visitData.bedNotes || '';
      if (visitData.pickupRequired) {
        visitRecord.status = 'pickup_required';
      } else {
        visitRecord.status = 'bed_rest';
      }
    }

    // Only add optional fields if they have values (not undefined)
    if (visitData.temperature) visitRecord.temperature = visitData.temperature;
    if (visitData.bloodPressure) visitRecord.bloodPressure = visitData.bloodPressure;
    if (visitData.heartRate) visitRecord.heartRate = visitData.heartRate;
    if (visitData.notes) visitRecord.notes = visitData.notes;
    if (visitData.parentEmail) visitRecord.parentEmail = visitData.parentEmail;
    if (visitData.parentName) visitRecord.parentName = visitData.parentName;

    // Create clinic visit record
    const visitRef = await addDoc(collection(db, 'clinicVisits'), visitRecord);

    // If bed rest, mark bed as Occupied
    if (visitData.needsBedRest && visitData.bedId) {
      try {
        const bedRef = doc(db, 'beds', visitData.bedId);
        await updateDoc(bedRef, {
          status: 'Occupied',
          currentVisitId: visitRef.id,
          currentStudentName: visitData.studentName,
          currentBedStartTime: serverTimestamp(),
        });
        console.log('✅ Bed marked as Occupied:', visitData.bedId);
      } catch (bedError) {
        console.error('❌ Failed to update bed status:', bedError);
      }
    }

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
    if (visitData.notifyParent && (visitData.parentEmail || visitData.parentPhone)) {
      let emailSent = false;
      let smsSent = false;
      let emailError = '';
      let smsError = '';

      // Try to send email if parentEmail provided
      if (visitData.parentEmail && visitData.parentEmail.trim()) {
        try {
          console.log('📧 Attempting to send email to:', visitData.parentEmail);

          await sendParentNotification({
            parentEmail: visitData.parentEmail.trim(),
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
      }

      // Try to send SMS if phone number provided
      if (visitData.parentPhone && visitData.parentPhone.trim()) {
        try {
          console.log('📱 Attempting to send SMS to:', visitData.parentPhone);

          await sendParentSMS({
            parentPhone: visitData.parentPhone.trim(),
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
          parentEmail: visitData.parentEmail || '',
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
      if (visitData.notifyParent && !visitData.parentEmail && !visitData.parentPhone) {
        console.warn('⚠️ Notify parent enabled but neither parent email nor parent phone was available');
      }
    }

    return visitRef.id;
  } catch (error) {
    console.error('❌ Error logging clinic visit:', error);
    throw error;
  }
}

export const DEFAULT_EMAILJS_CONFIG = {
  publicKey: 'oS5baCpPMFDl1rgVA',
  serviceId: 'service_aip6vxq',
  templateId: 'template_sk6tt9j'
};

export const DEFAULT_FMCSMS_CONFIG = {
  apiKey: 'fmcsms_c3a64b0e69a5419146f8a92257bdf178a88df25695e719bd',
  senderName: 'NDKC ClinicCare'
};

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

  if (!data.parentEmail || !data.parentEmail.includes('@')) {
    throw new Error(`Invalid recipient email address: "${data.parentEmail}"`);
  }
  
  try {
    let serviceId = DEFAULT_EMAILJS_CONFIG.serviceId;
    let templateId = DEFAULT_EMAILJS_CONFIG.templateId;
    let publicKey = DEFAULT_EMAILJS_CONFIG.publicKey;

    // Get EmailJS credentials from settings if available
    try {
      console.log('🔍 Checking for EmailJS settings in Firestore...');
      const settingsRef = doc(db, 'settings', 'emailjs');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        const emailSettings = settingsDoc.data();
        if (emailSettings.serviceId) serviceId = emailSettings.serviceId;
        if (emailSettings.templateId) templateId = emailSettings.templateId;
        if (emailSettings.publicKey) publicKey = emailSettings.publicKey;
      }
    } catch (readErr) {
      console.warn('⚠️ Could not read settings/emailjs from Firestore, using default config:', readErr);
    }

    console.log('✅ Using EmailJS credentials (Service:', serviceId ? '✓' : '✗', 'Template:', templateId ? '✓' : '✗', 'Key:', publicKey ? '✓' : '✗', ')');

    const templateParams = {
      to_email: data.parentEmail,
      to_name: data.parentName || 'Parent',
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

    // Attempt 1: via emailjs-com SDK
    try {
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      console.log('✅ ✅ ✅ Email sent successfully via EmailJS SDK to:', data.parentEmail);
      return { success: true, method: 'sdk' };
    } catch (sdkError: any) {
      console.warn('⚠️ emailjs.send SDK failed, attempting direct fetch API fallback...', sdkError);

      // Attempt 2: Direct REST API fetch to EmailJS
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS API Error (${response.status}): ${errorText || response.statusText}`);
      }

      console.log('✅ ✅ ✅ Email sent successfully via EmailJS REST API fallback to:', data.parentEmail);
      return { success: true, method: 'rest' };
    }
  } catch (error: any) {
    console.error('❌ Error in sendParentNotification:', error);
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
    }, { merge: true });

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

    return DEFAULT_EMAILJS_CONFIG;
  } catch (error) {
    console.error('Error getting EmailJS settings:', error);
    return DEFAULT_EMAILJS_CONFIG;
  }
}

// ===========================
// SMS NOTIFICATIONS (FMCSMS)
// ===========================

export async function sendParentSMS(data: {
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

  if (!data.parentPhone || !data.parentPhone.trim()) {
    throw new Error('No recipient phone number provided for SMS');
  }

  try {
    let apiKey = DEFAULT_FMCSMS_CONFIG.apiKey;
    let senderName = DEFAULT_FMCSMS_CONFIG.senderName;

    // Get FMCSMS credentials from settings if available
    try {
      console.log('🔍 Checking for FMCSMS settings...');
      const settingsRef = doc(db, 'settings', 'fmcsms');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const smsSettings = settingsDoc.data();
        if (smsSettings.apiKey) apiKey = smsSettings.apiKey;
        if (smsSettings.senderName) senderName = smsSettings.senderName;
      }
    } catch (readErr) {
      console.warn('⚠️ Could not read settings/fmcsms from Firestore, using default config:', readErr);
    }

    console.log('✅ Using FMCSMS credentials (Sender:', senderName, ')');

    // Format phone number to international format (+639XXXXXXXXX)
    let phone = data.parentPhone.replace(/[\s\-\(\)\+]/g, '');
    if (phone.startsWith('0')) {
      phone = '63' + phone.substring(1);
    } else if (!phone.startsWith('63')) {
      phone = '63' + phone;
    }

    if (phone.length < 12) {
      throw new Error(`Invalid mobile number format: "${data.parentPhone}". Expected 11 digits (e.g., 09516495356).`);
    }

    const formattedPhone = '+' + phone;
    console.log('📱 Formatted phone:', data.parentPhone, '→', formattedPhone);

    // Format SMS message - must be under 160 characters
    const pickupStatus = data.pickupRequired ? 'YES' : 'NO';

    // Build message with character limit in mind
    let message = `Dear ${data.parentName || 'Parent'},\n\n${data.studentName} (${data.grade}) visited clinic.\n\nSymptoms: ${data.symptoms}\nTreatment: ${data.treatment}\nTime: ${data.visitDate}\nNurse: ${data.nurseName}\n\nPickup needed: ${pickupStatus}\n\n-NDKC Clinic`;

    // Truncate if over 160 characters
    if (message.length > 160) {
      // Try shorter version without time
      message = `Dear ${data.parentName || 'Parent'},\n\n${data.studentName} (${data.grade}) at clinic.\n\nSymptoms: ${data.symptoms}\nTreatment: ${data.treatment}\nNurse: ${data.nurseName}\n\nPickup: ${pickupStatus}\n\n-NDKC`;

      // If still too long, truncate symptoms and treatment
      if (message.length > 160) {
        const maxSymptoms = 20;
        const maxTreatment = 20;
        const symptoms = data.symptoms.length > maxSymptoms ? data.symptoms.substring(0, maxSymptoms) + '...' : data.symptoms;
        const treatment = data.treatment.length > maxTreatment ? data.treatment.substring(0, maxTreatment) + '...' : data.treatment;

        message = `Dear ${data.parentName || 'Parent'},\n\n${data.studentName} at clinic.\n\nSymptoms: ${symptoms}\nTreatment: ${treatment}\n\nPickup: ${pickupStatus}\n\n-NDKC Clinic`;

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
        'Accept': 'application/json, text/plain, */*',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        SenderName: senderName,
        ToNumber: formattedPhone,
        MessageBody: message,
        FromNumber: '+639189876543',
      }),
    });

    const responseText = await response.text();
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    console.log('📱 FMCSMS Response:', result);

    if (!response.ok || (result && result.success === false)) {
      throw new Error(`FMCSMS API Error: ${result.error || result.message || response.statusText || response.status}`);
    }

    console.log('✅ ✅ ✅ SMS sent successfully via FMCSMS!');
    return result;
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
    }, { merge: true });

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

    return DEFAULT_FMCSMS_CONFIG;
  } catch (error) {
    console.error('Error getting FMCSMS settings:', error);
    return DEFAULT_FMCSMS_CONFIG;
  }
}

// Initialize FMCSMS with your API key
export async function initializeFMCSMS() {
  try {
    console.log('🚀 Initializing FMCSMS settings...');

    await updateSMSSettings(
      DEFAULT_FMCSMS_CONFIG.apiKey,
      DEFAULT_FMCSMS_CONFIG.senderName
    );

    console.log('✅ ✅ ✅ FMCSMS initialized successfully!');
    return true;
  } catch (error) {
    console.warn('⚠️ Non-critical notice: Failed to save FMCSMS settings to Firestore (will use built-in configuration):', error);
    return false;
  }
}

// ===========================
// INVENTORY MANAGEMENT
// ===========================

export interface InventoryItem {
  id?: string;
  name: string;
  category: 'medicine' | 'equipment' | 'consumables' | 'medical supplies';
  branch: 'IBED' | 'SHS' | 'College';
  stockQuantity: number;
  unit: string; // e.g., 'tablets', 'bottles', 'pcs'
  expirationDate?: Date | null; // for medicines
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  minStockLevel: number; // threshold for low stock alert
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
  borrowedBy?: {
    studentId: string;
    studentName: string;
    grade: string;
    visitId: string;
    date: any;
  }[];
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

// Borrow equipment (subtract stock and register student borrow details)
export async function borrowEquipment(
  itemId: string,
  studentId: string,
  studentName: string,
  grade: string,
  visitId: string,
  nurseEmail: string
) {
  try {
    const itemRef = doc(db, 'inventory', itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
      throw new Error('Equipment not found');
    }

    const itemData = itemDoc.data();
    const stockBefore = itemData.stockQuantity;
    const stockAfter = stockBefore - 1;

    if (stockAfter < 0) {
      throw new Error('Insufficient stock');
    }

    // Get current borrows list or initialize it
    const currentBorrows = itemData.borrowedBy || [];
    
    // Add new borrow record
    const newBorrow = {
      studentId,
      studentName,
      grade,
      visitId,
      date: new Date(),
    };

    // Update equipment document
    await updateDoc(itemRef, {
      stockQuantity: stockAfter,
      status: determineStockStatus(stockAfter, itemData.minStockLevel || 0),
      borrowedBy: [...currentBorrows, newBorrow],
      updatedAt: serverTimestamp(),
    });

    // Log transaction
    await addDoc(collection(db, 'inventoryTransactions'), {
      itemId,
      itemName: itemData.name,
      type: 'borrowed',
      quantityChanged: -1,
      stockBefore,
      stockAfter,
      studentId,
      studentName,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Equipment borrowed: ${itemData.name} by ${studentName}`);
  } catch (error) {
    console.error('❌ Error borrowing equipment:', error);
    throw error;
  }
}

// Return equipment (increase stock and remove student borrow details)
export async function returnEquipment(
  itemId: string,
  studentId: string,
  visitId: string
) {
  try {
    const itemRef = doc(db, 'inventory', itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
      throw new Error('Equipment not found');
    }

    const itemData = itemDoc.data();
    const stockBefore = itemData.stockQuantity;
    const stockAfter = stockBefore + 1;

    // Filter out the borrow record for this student/visit
    const currentBorrows = itemData.borrowedBy || [];
    const updatedBorrows = currentBorrows.filter(
      (borrow: any) => !(borrow.studentId === studentId && borrow.visitId === visitId)
    );

    // Update equipment document
    await updateDoc(itemRef, {
      stockQuantity: stockAfter,
      status: determineStockStatus(stockAfter, itemData.minStockLevel || 0),
      borrowedBy: updatedBorrows,
      updatedAt: serverTimestamp(),
    });

    // Log transaction
    await addDoc(collection(db, 'inventoryTransactions'), {
      itemId,
      itemName: itemData.name,
      type: 'returned',
      quantityChanged: 1,
      stockBefore,
      stockAfter,
      studentId,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Equipment returned: ${itemData.name}`);
  } catch (error) {
    console.error('❌ Error returning equipment:', error);
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
    let totalConsumables = 0;
    let totalMedicalSupplies = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category;
      
      if (category === 'medicine') {
        totalMedicines++;
        
        // Check expiring soon
        if (data.expirationDate) {
          const expDate = data.expirationDate.toDate ? data.expirationDate.toDate() : new Date(data.expirationDate);
          if (expDate <= thirtyDaysFromNow) {
            expiringSoonCount++;
          }
        }
      } else if (category === 'equipment') {
        totalEquipment++;
      } else if (category === 'consumables') {
        totalConsumables++;
      } else if (category === 'medical supplies') {
        totalMedicalSupplies++;
      }

      if (data.status === 'low_stock' || data.status === 'out_of_stock') {
        lowStockCount++;
      }
    });

    return {
      totalMedicines,
      totalEquipment,
      totalConsumables,
      totalMedicalSupplies,
      lowStockCount,
      expiringSoonCount,
    };
  } catch (error) {
    console.error('❌ Error getting inventory stats:', error);
    throw error;
  }
}