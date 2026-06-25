import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface ActivityLog {
  action: string;
  details: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Log an activity to Firestore
 * @param action The action performed (e.g., "USER_CREATED", "VISIT_ADDED", "USER_DELETED")
 * @param details Human-readable description of the action
 * @param metadata Optional additional data
 */
export async function logActivity(
  action: string,
  details: string,
  metadata?: any
): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    
    const logData: ActivityLog = {
      action,
      details,
      userId: currentUser?.uid,
      userEmail: currentUser?.email || undefined,
      userName: currentUser?.displayName || currentUser?.email || 'Unknown User',
      timestamp: new Date(),
      metadata: metadata || {}
    };

    await addDoc(collection(db, 'activityLogs'), logData);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to prevent breaking the main flow
  }
}

// Common action types for consistency
export const ActivityActions = {
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  
  // Student management
  STUDENT_CREATED: 'STUDENT_CREATED',
  STUDENT_UPDATED: 'STUDENT_UPDATED',
  STUDENT_DELETED: 'STUDENT_DELETED',
  
  // Clinic visits
  VISIT_CREATED: 'VISIT_CREATED',
  VISIT_UPDATED: 'VISIT_UPDATED',
  VISIT_DELETED: 'VISIT_DELETED',
  
  // Notifications
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  
  // System
  SYSTEM_INITIALIZED: 'SYSTEM_INITIALIZED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
} as const;
