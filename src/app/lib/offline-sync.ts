// Offline sync service for syncing data when back online
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getOfflineVisits, removeOfflineVisit, clearOfflineVisits } from './offline-storage';
import { sendParentNotification } from './firestore-setup';
import { toast } from 'sonner';

let syncInProgress = false;

export const syncOfflineData = async (): Promise<void> => {
  if (syncInProgress) {
    console.log('Sync already in progress, skipping...');
    return;
  }

  if (!navigator.onLine) {
    console.log('Device is offline, skipping sync');
    return;
  }

  const offlineVisits = getOfflineVisits();
  if (offlineVisits.length === 0) {
    console.log('No offline visits to sync');
    return;
  }

  syncInProgress = true;
  console.log(`🔄 Starting sync of ${offlineVisits.length} offline visit(s)...`);

  let successCount = 0;
  let failCount = 0;

  for (const visit of offlineVisits) {
    try {
      // Remove offline-specific fields
      const { offline_id, offline_timestamp, ...visitData } = visit;

      // Ensure required fields for Firestore
      const visitToSync = {
        ...visitData,
        createdAt: visitData.createdAt || visitData.timestamp,
        status: visitData.status || 'completed',
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'clinicVisits'), visitToSync);
      console.log(`✅ Synced visit ${offline_id} -> ${docRef.id}`);

      // Send parent notification if needed
      if (visitData.notifyParent && visitData.parentEmail && visitData.parentName) {
        try {
          await sendParentNotification({
            parentEmail: visitData.parentEmail,
            parentName: visitData.parentName,
            studentName: visitData.studentName,
            grade: visitData.grade,
            symptoms: visitData.symptoms,
            treatment: visitData.treatment,
            pickupRequired: visitData.pickupRequired || false,
            visitDate: visitData.timestamp?.toDate
              ? visitData.timestamp.toDate().toLocaleString()
              : new Date(visitData.timestamp).toLocaleString(),
            nurseName: visitData.nurseName || 'School Nurse',
            notes: visitData.notes,
            nurseEmail: visitData.nurseEmail,
            parentPhone: visitData.parentPhone,
          });
          console.log(`✅ Sent notification for ${offline_id}`);
        } catch (notifError) {
          console.warn(`⚠️ Notification failed for ${offline_id}:`, notifError);
        }
      }

      // Remove from offline storage
      removeOfflineVisit(offline_id);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to sync visit ${visit.offline_id}:`, error);
      failCount++;
    }
  }

  syncInProgress = false;

  if (successCount > 0) {
    toast.success(`✅ Synced ${successCount} offline visit(s) successfully!`);
  }

  if (failCount > 0) {
    toast.error(`⚠️ Failed to sync ${failCount} visit(s). Will retry later.`);
  }

  console.log(`✅ Sync complete: ${successCount} success, ${failCount} failed`);
};

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('📡 Device back online, starting auto-sync...');
    setTimeout(() => {
      syncOfflineData();
    }, 2000); // Wait 2 seconds to ensure stable connection
  });
}

// Periodic sync every 5 minutes if online
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (navigator.onLine && !syncInProgress) {
      syncOfflineData();
    }
  }, 5 * 60 * 1000); // 5 minutes
}
