# APPENDIX E
## CODE SNIPPETS

### 1 User Registration and Role Setup
**Source File:** `src/app/components/UserManagement.tsx` — `handleCreateUser()`  
**Code Snippet:**
```typescript
const userCredential = await createUserWithEmailAndPassword(
  secondaryAuth,
  formData.email,
  formData.password
);

const newUserUid = userCredential.user.uid;
await secondaryAuth.signOut();

const userData: any = {
  uid: newUserUid,
  email: formData.email,
  name: formData.name,
  role: selectedRole,
  createdAt: new Date()
};

if (selectedRole === 'student' || selectedRole === 'personnel') {
  userData.grade = selectedRole === 'personnel' ? 'Personnel' : formData.grade;
  userData.studentId = formData.studentId;

  await addDoc(collection(db, 'students'), {
    studentId: formData.studentId,
    name: formData.name,
    grade: userData.grade,
    email: formData.email,
    allergies: formData.allergies,
    medicalConditions: formData.medicalConditions,
    immunizations: formData.immunizations,
    height: formData.height ? parseFloat(formData.height) : null,
    weight: formData.weight ? parseFloat(formData.weight) : null,
    bmi: computeBMI(formData.height, formData.weight),
    createdAt: new Date()
  });
} else if (selectedRole === 'parent') {
  userData.studentIds = formData.selectedStudents;
  userData.phone = formData.phone || '';
}

await setDoc(doc(db, 'users', newUserUid), userData);
```
*This algorithm provisions a new user account through a secondary Firebase Authentication instance to prevent terminating the active administrator session. It assigns role-specific attributes (admin, nurse, parent, student, personnel), records biometric metrics, and initializes a corresponding document in the users and students collections in Cloud Firestore.*

---

### 2 Clinic Patient Intake and Visit Record Creation
**Source File:** `src/app/lib/firestore-setup.ts` — `logClinicVisit()`  
**Code Snippet:**
```typescript
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
  needsPickup: visitData.pickupRequired,
  timestamp: serverTimestamp(),
  createdAt: serverTimestamp(),
  status: visitData.pickupRequired ? 'pickup_required' : 'completed',
  needsBedRest: visitData.needsBedRest || false,
};

if (visitData.needsBedRest && visitData.bedId) {
  visitRecord.bedId = visitData.bedId;
  visitRecord.bedName = visitData.bedName || null;
  visitRecord.bedStartTime = serverTimestamp();
  visitRecord.bedEndTime = null;
  visitRecord.status = visitData.pickupRequired ? 'pickup_required' : 'bed_rest';
}

if (visitData.bloodPressure) visitRecord.bloodPressure = visitData.bloodPressure;
if (visitData.notes) visitRecord.notes = visitData.notes;

const visitRef = await addDoc(collection(db, 'clinicVisits'), visitRecord);
```
*This algorithm compiles student clinical intake data, vital signs, reported symptoms, and administered treatments into a structured clinical consultation record. It assigns appropriate visit disposition statuses based on bed rest requirements or parent pickup urgency, and commits the transaction to the clinicVisits collection in Cloud Firestore.*

---

### 3 Automated Medicine Stock Validation and Inventory Deduction
**Source File:** `src/app/lib/firestore-setup.ts` — `dispenseMedicine()`  
**Code Snippet:**
```typescript
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

await updateDoc(medicineRef, {
  stockQuantity: stockAfter,
  status: determineStockStatus(stockAfter, medicineData.minStockLevel),
  updatedAt: serverTimestamp(),
});

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
```
*This algorithm verifies real-time pharmaceutical stock levels prior to dispensing medication during patient intake. It validates whether the requested dosage is available, computes the remaining inventory balance, updates the medicine's stock status threshold in Cloud Firestore, and creates an immutable audit trail entry in the inventoryTransactions collection.*

---

### 4 Clinic Bed Allocation and Occupancy Tracking
**Source File:** `src/app/lib/firestore-setup.ts` — `logClinicVisit()` (Bed Allocation Routine)  
**Code Snippet:**
```typescript
if (visitData.needsBedRest && visitData.bedId) {
  try {
    const bedRef = doc(db, 'beds', visitData.bedId);
    await updateDoc(bedRef, {
      status: 'Occupied',
      currentVisitId: visitRef.id,
      currentStudentName: visitData.studentName,
      currentBedStartTime: serverTimestamp(),
    });
  } catch (bedError) {
    console.error('Failed to update bed status:', bedError);
  }
}
```
*This algorithm manages bed assignments for patients requiring clinical observation. When bed rest is designated during visit intake, the system binds the patient's identity and visit identifier to the chosen bed document in the beds collection and toggles its operational state to occupied with an authoritative server timestamp.*

---

### 5 Bed Discharge and Rest Duration Computation
**Source File:** `src/app/lib/firestore-setup.ts` — `releaseBed()` & `formatBedRestDuration()`  
**Code Snippet:**
```typescript
export async function releaseBed(bedId: string): Promise<void> {
  const bedRef = doc(db, 'beds', bedId);
  const bedSnap = await getDoc(bedRef);
  if (!bedSnap.exists()) return;
  const bedData = bedSnap.data() as Bed;

  const batch = writeBatch(db);

  batch.update(bedRef, {
    status: 'Available',
    currentVisitId: null,
    currentStudentName: null,
    currentBedStartTime: null,
  });

  if (bedData.currentVisitId) {
    const visitRef = doc(db, 'clinicVisits', bedData.currentVisitId);
    batch.update(visitRef, { bedEndTime: serverTimestamp() });
  }

  await batch.commit();
}

export function formatBedRestDuration(startTime: any, endTime?: any): string {
  if (!startTime) return 'N/A';
  const start = startTime.toDate ? startTime.toDate() : new Date(startTime.seconds * 1000);
  const end = endTime ? (endTime.toDate ? endTime.toDate() : new Date(endTime.seconds * 1000)) : new Date();

  const diffMs = end.getTime() - start.getTime();
  const totalMins = Math.floor(diffMs / (1000 * 60));
  if (totalMins < 60) return `${totalMins} mins`;

  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
}
```
*This algorithm uses atomic batch writes to release an occupied clinic bed, resetting its status to available while concurrently stamping the conclusion time on the patient's consultation record. The companion utility calculates the total bed rest duration in hours and minutes for medical reporting.*

---

### 6 Parent Notification Dispatch via Email Service (EmailJS)
**Source File:** `src/app/lib/firestore-setup.ts` — `sendParentNotification()`  
**Code Snippet:**
```typescript
const templateParams = {
  parent_email: data.parentEmail,
  parent_name: data.parentName || 'Parent/Guardian',
  student_name: data.studentName,
  student_grade: data.grade,
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

try {
  await emailjs.send(serviceId, templateId, templateParams, publicKey);
} catch (sdkError: any) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams
    })
  });
  if (!response.ok) throw new Error('EmailJS dispatch failed');
}
```
*This algorithm formats a comprehensive clinic consultation summary and transmits it to the student's guardian through EmailJS. It utilizes a resilient dual-dispatch architecture that attempts transmission via client SDK before falling back to a direct REST API call if client-side script restrictions occur.*

---

### 7 Parent Emergency Alert Dispatch via SMS Gateway (FMCSMS)
**Source File:** `src/app/lib/firestore-setup.ts` — `sendParentSMS()`  
**Code Snippet:**
```typescript
let phone = data.parentPhone.replace(/[\s\-\(\)\+]/g, '');
if (phone.startsWith('0')) {
  phone = '63' + phone.substring(1);
} else if (!phone.startsWith('63')) {
  phone = '63' + phone;
}

const formattedPhone = '+' + phone;
const pickupStatus = data.pickupRequired ? 'YES' : 'NO';

let message = `Dear ${data.parentName || 'Parent'},\n\n${data.studentName} (${data.grade}) visited clinic.\n\nSymptoms: ${data.symptoms}\nTreatment: ${data.treatment}\nTime: ${data.visitDate}\nNurse: ${data.nurseName}\n\nPickup needed: ${pickupStatus}\n\n-NDKC Clinic`;

if (message.length > 160) {
  message = `Dear ${data.parentName || 'Parent'},\n\n${data.studentName} at clinic.\n\nSymptoms: ${data.symptoms.substring(0, 20)}...\nTreatment: ${data.treatment.substring(0, 20)}...\nPickup: ${pickupStatus}\n\n-NDKC Clinic`;
}

const response = await fetch('https://sms.fmc-gateway.com/api/v1/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    to: formattedPhone,
    message: message,
    sender: senderName
  })
});
```
*This algorithm standardizes guardian telephone numbers into the E.164 international dialing format and constructs an SMS notification constrained to the 160-character standard. It applies dynamic string truncation when character limits are exceeded and transmits the dispatch payload to the FMCSMS hardware gateway.*

---

### 8 Automated Medical Certificate and Excuse Slip PDF Export
**Source File:** `src/app/components/MedicalCertificateModal.tsx` — `handleDownloadPdf()`  
**Code Snippet:**
```typescript
const clone = certificateRef.current.cloneNode(true) as HTMLElement;
clone.style.position = 'fixed';
clone.style.left = '-9999px';
clone.style.backgroundColor = '#ffffff';
document.body.appendChild(clone);

const canvas = await html2canvas(clone, {
  scale: 3,
  useCORS: true,
  backgroundColor: '#ffffff',
});

document.body.removeChild(clone);

const imgData = canvas.toDataURL('image/png', 1.0);
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
  compress: true,
});

const pdfWidth = pdf.internal.pageSize.getWidth();
const pdfHeight = pdf.internal.pageSize.getHeight();
const margin = 10;
const availableWidth = pdfWidth - (margin * 2);
const availableHeight = pdfHeight - (margin * 2);

const ratio = Math.min(
  availableWidth / (canvas.width / 3.779528),
  availableHeight / (canvas.height / 3.779528)
);

const finalWidth = (canvas.width / 3.779528) * ratio;
const finalHeight = (canvas.height / 3.779528) * ratio;

pdf.addImage(imgData, 'PNG', (pdfWidth - finalWidth) / 2, (pdfHeight - finalHeight) / 2, finalWidth, finalHeight);
pdf.save(`${getCertificateTitle()}_${visitData.studentName}.pdf`);
```
*This algorithm synthesizes an off-screen DOM clone of the medical certificate or excuse slip and converts it into a high-resolution raster graphic using html2canvas. It calculates proportional aspect ratio constraints and embeds the output into an international A4 document layout using jsPDF for immediate download.*

---

### 9 Batch User Import and Account Provisioning
**Source File:** `src/app/components/BulkAddUsersModal.tsx` — `handleBulkImport()`  
**Code Snippet:**
```typescript
const existingQuery = query(
  collection(db, 'users'),
  where('email', '==', studentEmail)
);
const existing = await getDocs(existingQuery);

if (!existing.empty) {
  results.push({ success: false, name: studentName, email: studentEmail, error: 'Email already exists' });
  continue;
}

const userCredential = await createUserWithEmailAndPassword(
  secondaryAuth,
  studentEmail,
  DEFAULT_PASSWORD
);
const uid = userCredential.user.uid;
await secondaryAuth.signOut();

await setDoc(doc(db, 'users', uid), {
  uid,
  email: studentEmail,
  name: studentName,
  role: 'student',
  grade: gradeLevel,
  studentId: studentId,
  createdAt: new Date(),
});

await addDoc(collection(db, 'students'), {
  studentId,
  name: studentName,
  grade: gradeLevel,
  email: studentEmail,
  allergies: studentAllergies ? studentAllergies.split(',').map(a => a.trim()) : [],
  medicalConditions: studentMedicalConditions ? studentMedicalConditions.split(',').map(c => c.trim()) : [],
  immunizations: studentImmunizations ? studentImmunizations.split(',').map(v => v.trim()) : [],
  height: studentHeight,
  weight: studentWeight,
  bmi: computeBMI(studentHeight, studentWeight),
});
```
*This algorithm iterates through parsed spreadsheet records, validates uniqueness against registered email addresses, and generates student user credentials in bulk. It parses delimiter-separated allergy and medical condition strings into array collections and commits the profiles to Cloud Firestore.*

---

### 10 Clinic Health Analytics and Symptom Aggregation
**Source File:** `src/app/components/AnalyticsDashboard.tsx` — `loadAnalytics()`  
**Code Snippet:**
```typescript
const visitsQuery = query(
  collection(db, 'clinicVisits'),
  where('timestamp', '>=', Timestamp.fromDate(start)),
  where('timestamp', '<=', Timestamp.fromDate(end))
);

const snapshot = await getDocs(visitsQuery);
const visits = snapshot.docs.map(doc => doc.data());

const uniqueStudentIds = new Set(visits.map(v => v.studentId));
const pickupCount = visits.filter(v => v.pickupRequired).length;

const gradeMap = new Map<string, number>();
visits.forEach(v => {
  if (v.grade) {
    gradeMap.set(v.grade, (gradeMap.get(v.grade) || 0) + 1);
  }
});

const symptomMap = new Map<string, number>();
visits.forEach(v => {
  if (v.symptoms) {
    const symptoms = v.symptoms.split(',').map((s: string) => s.trim().toLowerCase());
    symptoms.forEach((symptom: string) => {
      symptomMap.set(symptom, (symptomMap.get(symptom) || 0) + 1);
    });
  }
});

const commonSymptoms = Array.from(symptomMap.entries())
  .map(([symptom, count]) => ({ symptom, count }))
  .sort((a, b) => b.count - a.count);
```
*This algorithm queries clinic visit documents within a parameterized temporal window. It computes epidemiological aggregates including distinct patient counts, emergency pickup frequencies, visit distributions across academic grade levels, and frequency rankings of reported symptoms for institutional health surveillance.*
