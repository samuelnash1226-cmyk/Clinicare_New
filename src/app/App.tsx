import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { initializeFirestore } from "./lib/firestore-setup";
import { initializeEmailJS } from "./lib/emailjs-init";
import "./lib/offline-sync"; // Initialize offline sync service
import { ThemeProvider } from "./components/ThemeProvider";
import { LoginPage } from "./components/LoginPage";
import { FirstTimeSetup } from "./components/FirstTimeSetup";
import { Sidebar } from "./components/Sidebar";
import { AdminDashboard } from "./components/AdminDashboard";
import { NurseDashboard } from "./components/NurseDashboard";
import { ParentPortal } from "./components/ParentPortal";
import { StudentDashboard } from "./components/StudentDashboard";
import { AddVisitForm } from "./components/AddVisitFormEnhanced";
import { UserManagement } from "./components/UserManagement";
import { StudentCard } from "./components/StudentCard";
import { SettingsPage } from "./components/SettingsPage";
import { VisitHistory } from "./components/VisitHistory";
import { InventoryDashboard } from "./components/InventoryDashboard";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { Toaster } from "./components/ui/sonner";
import { Loader2, Heart } from "lucide-react";
import srbLogo from "../assets/4a75b62a01df7e8cfb0ca5e95cb4075dd831b41b.png";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [currentView, setCurrentView] = useState("nurse");
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Initialize Firestore collections
    initializeFirestore();

    // Initialize EmailJS configuration
    initializeEmailJS().catch((err) => {
      console.warn(
        "EmailJS initialization error (non-critical):",
        err,
      );
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setUser(user);

        if (user) {
          await checkUserSetup(user);
        } else {
          setLoading(false);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  const checkUserSetup = async (user: User) => {
    try {
      // Check if system is initialized
      const settingsRef = doc(db, "settings", "system");
      const settingsDoc = await getDoc(settingsRef);

      if (
        !settingsDoc.exists() ||
        !settingsDoc.data()?.initialized
      ) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }

      // Get user profile
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role || "nurse");
        setStudentIds(userData.studentIds || []);

        // Set initial view based on role
        if (userData.role === "admin") {
          setCurrentView("dashboard");
        } else if (userData.role === "parent") {
          setCurrentView("parent");
        } else if (userData.role === "student") {
          setCurrentView("student");
        } else {
          setCurrentView("nurse");
        }
      } else {
        setUserRole("nurse");
        setCurrentView("nurse");
      }
    } catch (error) {
      console.error("Error checking user setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    setNeedsSetup(false);
    setShowSetup(false);
    if (user) {
      await checkUserSetup(user);
    }
  };

  const handleLogin = async () => {
    // Auth state listener will handle the rest
  };

  const handleFirstTimeSetup = () => {
    setShowSetup(true);
  };

  const handleBackToLogin = () => {
    setShowSetup(false);
  };

  const refreshData = async () => {
    if (user) {
      await checkUserSetup(user);
    }
    // Increment refresh key to trigger re-render of dashboard components
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-emerald-50">
        <div className="text-center space-y-8">
          <div className="relative mx-auto">
            {/* Animated pulse background - multiple layers */}
            <div
              className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-ndkc-green to-emerald-600 opacity-20 blur-3xl scale-150"
              style={{ animationDuration: "3s" }}
            />
            <div
              className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-emerald-400 to-ndkc-green opacity-10 blur-2xl scale-125"
              style={{ animationDuration: "2s" }}
            />

            {/* Logo container with glow effect */}
            <div className="relative flex h-48 w-48 mx-auto items-center justify-center">
              {/* Rotating ring */}
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-ndkc-green border-r-emerald-500 animate-spin opacity-30"
                style={{ animationDuration: "3s" }}
              />

              {/* Logo with shadow and scale animation */}
              <img
                src={srbLogo}
                alt="SRB ClinicCare Logo"
                className="relative h-40 w-40 object-contain drop-shadow-2xl animate-pulse z-10"
                style={{
                  filter:
                    "drop-shadow(0 0 30px rgba(16, 185, 129, 0.3))",
                  animationDuration: "2s",
                }}
              />
            </div>
          </div>

          {/* Loading spinner and dots */}
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-ndkc-green" />
            <div className="flex gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full bg-ndkc-green animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-2.5 w-2.5 rounded-full bg-ndkc-green animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>

          {/* Loading text */}
          <div className="space-y-2">
            <p className="text-slate-900">
              Loading SRB ClinicCare...
            </p>
            <p className="text-sm text-slate-500">
              Initializing health management system
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showSetup) {
      return (
        <ThemeProvider>
          <FirstTimeSetup
            onComplete={handleSetupComplete}
            onBack={handleBackToLogin}
          />
          <Toaster />
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider>
        <LoginPage
          onLogin={handleLogin}
          onFirstTimeSetup={handleFirstTimeSetup}
        />
        <Toaster />
      </ThemeProvider>
    );
  }

  if (needsSetup) {
    return (
      <ThemeProvider>
        <FirstTimeSetup onComplete={handleSetupComplete} />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          userRole={userRole}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {currentView === "dashboard" &&
              userRole === "admin" && <AdminDashboard />}

            {currentView === "users" &&
              userRole === "admin" && <UserManagement />}

            {currentView === "studentcards" &&
              (userRole === "admin" ||
                userRole === "nurse") && <StudentCard />}

            {currentView === "history" && <VisitHistory />}

            {currentView === "nurse" && (
              <NurseDashboard
                key={refreshKey}
                onAddVisit={() => setShowAddVisit(true)}
                userEmail={user.email || ""}
              />
            )}

            {currentView === "inventory" &&
              (userRole === "admin" ||
                userRole === "nurse") && (
                <InventoryDashboard
                  userEmail={user.email || ""}
                />
              )}

            {currentView === "parent" &&
              userRole === "parent" && (
                <ParentPortal
                  userEmail={user.email || ""}
                  studentIds={studentIds}
                />
              )}

            {currentView === "student" &&
              userRole === "student" && (
                <StudentDashboard
                  userEmail={user.email || ""}
                />
              )}

            {currentView === "settings" && (
              <SettingsPage
                userEmail={user.email || ""}
                userRole={userRole}
              />
            )}
          </div>
        </main>

        {showAddVisit && (
          <AddVisitForm
            onClose={() => setShowAddVisit(false)}
            onSuccess={refreshData}
            userEmail={user.email || ""}
          />
        )}
      </div>

      {/* Offline Indicator - Global */}
      <OfflineIndicator />

      <Toaster />
    </ThemeProvider>
  );
}