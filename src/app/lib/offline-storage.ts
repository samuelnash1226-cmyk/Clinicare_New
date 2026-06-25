// Offline storage utilities for clinic visits
import { ClinicVisit } from './firestore-setup';

const OFFLINE_VISITS_KEY = 'ndkc_offline_visits';
const ONLINE_STATUS_KEY = 'ndkc_is_online';

export interface OfflineVisit extends Omit<ClinicVisit, 'id'> {
  offline_id: string;
  offline_timestamp: number;
}

// Store a visit offline
export const saveOfflineVisit = (visit: Omit<ClinicVisit, 'id'>): string => {
  const offlineVisits = getOfflineVisits();
  const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const offlineVisit: OfflineVisit = {
    ...visit,
    offline_id: offlineId,
    offline_timestamp: Date.now(),
  };

  offlineVisits.push(offlineVisit);
  localStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(offlineVisits));

  return offlineId;
};

// Get all offline visits
export const getOfflineVisits = (): OfflineVisit[] => {
  try {
    const stored = localStorage.getItem(OFFLINE_VISITS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading offline visits:', error);
    return [];
  }
};

// Remove a synced offline visit
export const removeOfflineVisit = (offlineId: string): void => {
  const offlineVisits = getOfflineVisits();
  const filtered = offlineVisits.filter(v => v.offline_id !== offlineId);
  localStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(filtered));
};

// Clear all offline visits
export const clearOfflineVisits = (): void => {
  localStorage.removeItem(OFFLINE_VISITS_KEY);
};

// Get offline visits count
export const getOfflineVisitsCount = (): number => {
  return getOfflineVisits().length;
};

// Online status helpers
export const setOnlineStatus = (isOnline: boolean): void => {
  localStorage.setItem(ONLINE_STATUS_KEY, JSON.stringify(isOnline));
};

export const getOnlineStatus = (): boolean => {
  try {
    const stored = localStorage.getItem(ONLINE_STATUS_KEY);
    return stored ? JSON.parse(stored) : navigator.onLine;
  } catch {
    return navigator.onLine;
  }
};
