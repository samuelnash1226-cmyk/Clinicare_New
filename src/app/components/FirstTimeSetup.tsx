import { useState } from 'react';
import { completeFirstTimeSetup } from '../lib/firestore-setup';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, CheckCircle2, Heart, Shield, Info, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import srbLogo from '"../../assets/4a75b62a01df7e8cfb0ca5e95cb4075dd831b41b.png"';

interface FirstTimeSetupProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function FirstTimeSetup({ onComplete, onBack }: FirstTimeSetupProps) {
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await completeFirstTimeSetup(adminName, adminEmail, adminPassword);
      
      toast.success('Setup completed successfully!');
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('Setup error:', error);
      toast.error(error.message || 'Failed to complete setup');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-emerald-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-50/40 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-xl">
          {/* Back button */}
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-6 text-slate-600 hover:text-ndkc-green transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          )}

          <div className="glass rounded-3xl border border-slate-200/60 p-8 lg:p-10 shadow-2xl shadow-emerald-500/10 animate-scaleIn">
            {/* Logo with sparkles */}
            <div className="mb-8 flex justify-center relative">
              <div className="absolute -top-2 -right-2 z-20">
                <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <div className="flex h-32 w-32 items-center justify-center">
                <img src={srbLogo} alt="SRB ClinicCare Logo" className="h-full w-full object-contain drop-shadow-2xl" />
              </div>
            </div>

            {/* Title */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100/80 px-3 py-1 mb-4 border border-emerald-200/50">
                <Sparkles className="h-3.5 w-3.5 text-ndkc-green" />
                <span className="text-xs font-medium text-ndkc-green">
                  First Time Setup
                </span>
              </div>
              <h1 className="mb-3 text-slate-900">
                Welcome to ClinicCare
              </h1>
              <p className="text-lg text-slate-600">
                Let's set up your administrator account
              </p>
            </div>

            {/* Setup Form */}
            <form onSubmit={handleSetup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="adminName" className="text-slate-700">
                  Administrator Name
                </Label>
                <Input
                  id="adminName"
                  type="text"
                  placeholder="Enter your full name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  className="h-12 border-slate-200 bg-white/80 shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-slate-700">
                  Administrator Email
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="h-12 border-slate-200 bg-white/80 shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword" className="text-slate-700">
                  Administrator Password
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Enter your password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="h-12 border-slate-200 bg-white/80 shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-200/50 p-2">
                    <Shield className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-800">
                      <span className="font-semibold">Role:</span> System Administrator
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      You'll have full access to all system features
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full bg-gradient-to-r from-ndkc-green to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete Setup
                  </>
                )}
              </Button>
            </form>

            {/* Info */}
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-200/50 p-2">
                  <Info className="h-4 w-4 text-emerald-700" />
                </div>
                <p className="text-sm text-emerald-800">
                  As an administrator, you'll have full access to manage users, view
                  analytics, and configure system settings.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            © 2025 Notre Dame of Kidapawan College
          </p>
        </div>
      </div>
    </div>
  );
}