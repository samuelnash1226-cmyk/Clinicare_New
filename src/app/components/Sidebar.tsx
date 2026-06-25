import { LayoutDashboard, FileText, Settings, Activity, LogOut, User, ChevronRight, Users, GraduationCap, ChevronsLeft, ChevronsRight, Calendar, Package, IdCard } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import ndkcLogo from 'figma:asset/4159ba6c115a024c404feb3e08bd2342361c9929.png';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  userRole: string;
}

export function Sidebar({ currentView, onViewChange, userRole }: SidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const user = auth.currentUser;

  // Fetch user's name from Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || user.email?.split('@')[0] || 'User');
          } else {
            setUserName(user.email?.split('@')[0] || 'User');
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
          setUserName(user.email?.split('@')[0] || 'User');
        }
      }
    };

    fetchUserName();
  }, [user]);
  
  const menuItems = userRole === 'admin'
    ? [
        { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard, description: 'Overview & Reports' },
        { id: 'users', label: 'User Management', icon: Users, description: 'Manage Accounts' },
        { id: 'studentcards', label: 'Student Cards', icon: IdCard, description: 'Student Information' },
        { id: 'nurse', label: 'Clinic Visits', icon: Activity, description: 'Patient Records' },
        { id: 'inventory', label: 'Inventory', icon: Package, description: 'Medicines & Equipment' },
        { id: 'history', label: 'Visit History', icon: Calendar, description: 'All Past Visits' },
        { id: 'settings', label: 'Settings', icon: Settings, description: 'System Config' },
      ]
    : userRole === 'parent'
    ? [
        { id: 'parent', label: 'Health Records', icon: FileText, description: 'Student Health' },
        { id: 'settings', label: 'Settings', icon: Settings, description: 'Account Settings' },
      ]
    : userRole === 'student'
    ? [
        { id: 'student', label: 'My Health', icon: GraduationCap, description: 'Health Records' },
        { id: 'settings', label: 'Settings', icon: Settings, description: 'Account Settings' },
      ]
    : [
        { id: 'nurse', label: 'Dashboard', icon: LayoutDashboard, description: 'Clinic Management' },
        { id: 'studentcards', label: 'Student Cards', icon: IdCard, description: 'Student Information' },
        { id: 'inventory', label: 'Inventory', icon: Package, description: 'Medicines & Equipment' },
        { id: 'history', label: 'Visit History', icon: Calendar, description: 'All Past Visits' },
        { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferences' },
      ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'admin':
        return 'from-purple-500 to-purple-600 shadow-purple-500/30';
      case 'nurse':
        return 'from-blue-500 to-blue-600 shadow-blue-500/30';
      case 'parent':
        return 'from-amber-500 to-amber-600 shadow-amber-500/30';
      case 'student':
        return 'from-emerald-500 to-emerald-600 shadow-emerald-500/30';
      default:
        return 'from-slate-500 to-slate-600 shadow-slate-500/30';
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Administrator';
      case 'nurse':
        return 'Clinic Nurse';
      case 'parent':
        return 'Parent';
      case 'student':
        return 'Student';
      default:
        return 'User';
    }
  };

  return (
    <motion.div 
      className="relative flex h-screen flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-2xl"
      animate={{ width: isMinimized ? '80px' : '320px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Minimizer Button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute -right-3 top-8 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:border-ndkc-green"
      >
        {isMinimized ? (
          <ChevronsRight className="h-3.5 w-3.5 text-slate-600" />
        ) : (
          <ChevronsLeft className="h-3.5 w-3.5 text-slate-600" />
        )}
      </button>

      {/* Logo & Brand */}
      <div className="border-b border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-ndkc-green to-emerald-600 opacity-20 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl shadow-emerald-500/40 overflow-hidden">
              <img src={ndkcLogo} alt="NDKC Logo" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                <h2 className="text-slate-900">ClinicCare</h2>
                <p className="text-sm text-slate-500">NDKC Health System</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg">
              <User className="h-6 w-6 text-slate-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          </div>
          
          {/* User Info */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <p className="truncate text-slate-900">{userName}</p>
                
                {/* Role Badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r ${getRoleBadgeColor()} px-2.5 py-1 text-xs text-white shadow-lg`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    {getRoleLabel()}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
        <AnimatePresence>
          {!isMinimized && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 px-4 text-xs uppercase tracking-wider text-slate-500"
            >
              Navigation
            </motion.p>
          )}
        </AnimatePresence>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group relative flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-ndkc-green to-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-ndkc-green'
              } ${isMinimized ? 'justify-center' : ''}`}
              title={isMinimized ? item.label : ''}
            >
              {/* Active Indicator */}
              {isActive && !isMinimized && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Icon Container */}
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-white/20' 
                  : 'bg-slate-100 group-hover:bg-ndkc-green/10 group-hover:scale-110'
              }`}>
                <Icon className={`h-5 w-5 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
              </div>
              
              {/* Text Content */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className={`text-xs transition-colors ${
                      isActive ? 'text-white/80' : 'text-slate-500 group-hover:text-ndkc-green/70'
                    }`}>
                      {item.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Arrow Indicator */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ChevronRight className="h-4 w-4 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="space-y-3 border-t border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white p-4">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-slate-700 transition-all duration-300 hover:bg-red-50 hover:text-red-600 ${isMinimized ? 'justify-center' : ''}`}
          title={isMinimized ? 'Sign Out' : ''}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 transition-all duration-300 group-hover:bg-red-100 group-hover:scale-110">
            <LogOut className="h-5 w-5" />
          </div>
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 text-left"
              >
                <p className="font-medium">Sign Out</p>
                <p className="text-xs text-slate-500 group-hover:text-red-500">Log out safely</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        
        {/* Copyright */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-slate-100/50 px-4 py-3 text-center"
            >
              <p className="text-xs text-slate-500">
                © 2025 NDKC ClinicCare
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Version 1.0.0
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}