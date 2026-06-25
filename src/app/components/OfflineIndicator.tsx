import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncTime(new Date());
      // Keep banner visible for 3 seconds to show "Back Online" message
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getTimeSinceSync = () => {
    if (!lastSyncTime) return 'Never synced';
    const seconds = Math.floor((new Date().getTime() - lastSyncTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <>
      {/* Top Banner - Shows when offline or just came back online */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 left-0 right-0 z-50 ${
              isOnline
                ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-600'
            } text-white shadow-xl`}
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <>
                      <Wifi className="h-5 w-5 animate-pulse" />
                      <div>
                        <p className="font-semibold">Back Online!</p>
                        <p className="text-xs text-white/90">
                          All features are now available. Syncing data...
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-5 w-5 animate-pulse" />
                      <div>
                        <p className="font-semibold">You're Offline</p>
                        <p className="text-xs text-white/90">
                          Some features may be limited. Data will sync when you're back online.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Status Indicator - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-lg ${
            isOnline
              ? 'bg-white/95 border border-slate-200 text-slate-700'
              : 'bg-amber-50/95 border border-amber-300 text-amber-900'
          }`}
        >
          {isOnline ? (
            <>
              <div className="relative">
                <Wifi className="h-4 w-4 text-ndkc-green" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-ndkc-green rounded-full animate-pulse"></span>
              </div>
              <span className="text-sm font-medium">Online</span>
              {lastSyncTime && (
                <div className="flex items-center gap-1 text-xs text-slate-500 border-l border-slate-300 pl-2">
                  <Clock className="h-3 w-3" />
                  <span>{getTimeSinceSync()}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-amber-600 animate-pulse" />
              <span className="text-sm font-medium">Offline</span>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}

// Sync Status Component for specific areas (e.g., in dashboards)
export function SyncStatusIndicator({ 
  lastSync, 
  syncing = false 
}: { 
  lastSync?: Date; 
  syncing?: boolean;
}) {
  const getTimeSinceSync = () => {
    if (!lastSync) return 'Never';
    const seconds = Math.floor((new Date().getTime() - lastSync.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-500">
      {syncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin text-ndkc-green" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          <span>Last synced: {getTimeSinceSync()}</span>
        </>
      )}
    </div>
  );
}

// Offline Action Blocker - Wraps buttons that require online connection
export function OfflineActionWrapper({ 
  children, 
  disabled = false,
  onlineOnly = true,
  className = ''
}: { 
  children: React.ReactNode;
  disabled?: boolean;
  onlineOnly?: boolean;
  className?: string;
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const shouldDisable = onlineOnly ? (!isOnline || disabled) : disabled;

  return (
    <div className={`relative group ${className}`}>
      <div className={shouldDisable && !isOnline ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
      {!isOnline && onlineOnly && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-50">
          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
            <div className="flex items-center gap-2">
              <WifiOff className="h-3 w-3" />
              <span>This action requires internet connection</span>
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cached Data Label - Shows when data is from cache
export function CachedDataLabel({ timestamp }: { timestamp?: Date }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
      <AlertTriangle className="h-3 w-3" />
      <span>Viewing cached data</span>
      {timestamp && (
        <span className="text-amber-600">
          from {timestamp.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
